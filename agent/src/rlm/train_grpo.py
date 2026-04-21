# To make tqdm work in docker logs
import logging
import os
import re
import subprocess

import torch
import torch.nn.functional as F
from datasets import load_dataset
from peft import PeftModel
from tqdm_loggable.auto import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer

from agent.src.system_prompt import TRAINING_SYSTEM_PROMPT

logging.basicConfig(level=logging.INFO)

# Configuration
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"
# MODEL_NAME = "google/gemma-4-E2B-it"  # Does not work for this lab because PEFT is not compatible with Gemma4
SFT_ADAPTER_PATH = os.environ.get("SFT_MODEL_PATH", "./weights/sft_lora")
OUTPUT_DIR = os.environ.get("FINAL_MODEL_PATH", "./weights/final_rlm_lora")
DATASET_NAME = "gsm8k"

# HYPERPARAMETERS
EPOCHS: int = 1
BATCH_SIZE: int = 8
LR: float = 5e-6
GRPO_GROUP_SIZE = 4
MAX_NEW_TOKENS: int = 1024

PRINT_EVERY = 256


def get_freest_gpu():
    try:
        # Run nvidia-smi to get memory usage
        result = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=memory.free,index",
                "--format=csv,nounits,noheader",
            ],
            encoding="utf-8",
        )
        # Parse output: "12345, 0" -> (12345 MB, GPU 0)
        gpu_memory = []
        for line in result.strip().split("\n"):
            free_mem, index = line.split(",")
            gpu_memory.append((int(free_mem), int(index)))
        # Sort by free memory (descending)
        gpu_memory.sort(key=lambda x: x[0], reverse=True)
        best_gpu_index = gpu_memory[0][1]
        best_gpu_mem = gpu_memory[0][0]
        print(f"✅ Auto-selected GPU {best_gpu_index} with {best_gpu_mem}MB free.")
        return str(best_gpu_index)
    except Exception as e:
        print(f"⚠️ Could not detect GPUs automatically: {e}")
        return "0"  # Fallback


os.environ["CUDA_VISIBLE_DEVICES"] = get_freest_gpu()
print(f"Using GPU: {os.environ['CUDA_VISIBLE_DEVICES']}")

STRUCTURED_RESPONSE_REGEX = re.compile(
    r"^\s*<think>\s*(?P<think>.*?)\s*</think>"
    r"\s*<answer>\s*(?P<answer>.*?)\s*</answer>\s*$",
    re.DOTALL,
)
NUMERIC_REGEX = re.compile(r"[-+]?\d[\d,]*(?:\.\d+)?")


def parse_structured_response(generated_text: str):
    match = STRUCTURED_RESPONSE_REGEX.fullmatch(generated_text)
    if not match:
        return None

    return {
        "think": match.group("think").strip(),
        "answer": match.group("answer").strip(),
    }


def extract_numeric_answer(text: str):
    if text is None:
        return None

    normalized = str(text)
    if "####" in normalized:
        normalized = normalized.split("####", 1)[1]

    matches = NUMERIC_REGEX.findall(normalized)
    if not matches:
        return None

    candidate = matches[-1].replace(",", "")
    try:
        return float(candidate)
    except ValueError:
        return None


def reward_function(generated_text: str, ground_truth_answer) -> float:
    """Reward the exact SFT response schema and a correct final answer."""
    reward = 0.0

    parsed = parse_structured_response(generated_text)
    if not parsed:
        return reward

    reward += 0.3

    extracted_value = extract_numeric_answer(parsed["answer"])
    gt_value = extract_numeric_answer(ground_truth_answer)
    if extracted_value is not None and gt_value is not None:
        if abs(extracted_value - gt_value) < 1e-9:
            reward += 0.7

    return reward


def _build_prompt(question: str, tokenizer: AutoTokenizer) -> str:
    messages = [
        {"role": "system", "content": TRAINING_SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    return tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )


def train_grpo():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # 1. Load model and tokenizer with LoRA adapter
    use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    # processor = AutoProcessor.from_pretrained(MODEL_NAME)
    # tokenizer = processor.tokenizer

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    base_model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        device_map={"": 0},
        dtype=torch.bfloat16 if use_bf16 else torch.float16,
    )
    model = PeftModel.from_pretrained(base_model, SFT_ADAPTER_PATH, is_trainable=True)

    tokenizer.pad_token = tokenizer.eos_token

    model = model.to(device)
    model.train()

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()), lr=LR
    )

    # 2. Load dataset and prepare simple iteration
    dataset = load_dataset(DATASET_NAME, name="main", split="train")
    examples = [
        {"question": ex["question"], "answer": ex.get("answer", "")} for ex in dataset
    ]

    n_examples = len(examples)

    for epoch in range(EPOCHS):
        for start in tqdm(
            range(0, n_examples, BATCH_SIZE), desc=f"Epoch {epoch + 1}/{EPOCHS}"
        ):
            batch = examples[start : start + BATCH_SIZE]

            # For each question in batch generate `group_size` responses
            all_generated_ids = []
            all_generated_texts = []
            all_ground_truths = []
            all_prompt_lengths = []

            for ex in batch:
                prompt = _build_prompt(ex["question"], tokenizer)

                enc = tokenizer(prompt, return_tensors="pt", padding=False)
                input_ids = enc.input_ids.to(device)
                attention_mask = enc.attention_mask.to(device)
                prompt_length = input_ids.shape[-1]

                with torch.no_grad():
                    gen_ids = model.generate(
                        input_ids=input_ids,
                        attention_mask=attention_mask,
                        do_sample=True,
                        temperature=0.8,
                        top_p=0.95,
                        max_new_tokens=MAX_NEW_TOKENS,
                        num_return_sequences=GRPO_GROUP_SIZE,
                        pad_token_id=tokenizer.eos_token_id,
                    )

                # model.generate returns sequences with prompt + continuation; keep only the completion
                for g in gen_ids:
                    all_generated_ids.append(g.cpu())
                    all_prompt_lengths.append(prompt_length)
                    completion_ids = g[input_ids.shape[-1] :]
                    text = tokenizer.decode(completion_ids, skip_special_tokens=True)
                    all_generated_texts.append(text)
                    all_ground_truths.append(ex["answer"])

            # 3. Compute rewards per generated sequence, grouped per question
            rewards = []
            for text, gt in zip(all_generated_texts, all_ground_truths):
                r = reward_function(text, gt)
                rewards.append(r)

            rewards = torch.tensor(rewards, dtype=torch.float32, device=device)

            # 4. Compute log-probabilities under current model for each generated sequence
            # We'll compute per-sequence log_prob by summing token log-probs for the generated continuation
            log_probs = []
            for gen_ids, prompt_length in zip(all_generated_ids, all_prompt_lengths):
                # gen_ids is on cpu
                gen_ids = gen_ids.to(device)
                # prepare inputs and targets (predict next token)
                input_ids = gen_ids[:-1].unsqueeze(0)
                target_ids = gen_ids[1:].unsqueeze(0)

                attention_mask = (input_ids != tokenizer.pad_token_id).long()

                outputs = model.base_model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    return_dict=True,
                )
                logits = outputs.logits  # (1, seq_len, vocab)
                logprobs = F.log_softmax(logits, dim=-1)

                # gather logprob of each target token
                tgt_logprobs = logprobs.gather(2, target_ids.unsqueeze(-1)).squeeze(-1)
                # Sum only the generated continuation tokens, not the prompt tokens.
                seq_logprob = tgt_logprobs[:, prompt_length - 1 :].sum()
                log_probs.append(seq_logprob)

            log_probs = torch.stack(log_probs)  # (batch_size * group_size,)

            # 5. Compute advantages per group (normalize within each question group)
            advantages = []
            idx = 0
            for _ in batch:
                group_rewards = rewards[idx : idx + GRPO_GROUP_SIZE]
                mean_r = group_rewards.mean()
                std_r = group_rewards.std()
                if std_r == 0:
                    adv = group_rewards - mean_r
                else:
                    adv = (group_rewards - mean_r) / (std_r + 1e-8)
                advantages.append(adv)
                idx += GRPO_GROUP_SIZE

            advantages = torch.cat(advantages).to(device)

            # 6. Policy gradient loss (REINFORCE-like): - log_prob * advantage
            loss = -(log_probs * advantages).mean()

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        # end epoch
        # optionally save intermediate adapter
        model.save_pretrained(OUTPUT_DIR)
        tokenizer.save_pretrained(OUTPUT_DIR)

    print("GRPO Training finished — model saved to", OUTPUT_DIR)


if __name__ == "__main__":
    train_grpo()
