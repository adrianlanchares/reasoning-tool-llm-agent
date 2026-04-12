import os
import subprocess

import torch
from datasets import load_dataset
from peft import LoraConfig, TaskType
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, AutoProcessor
from trl import SFTTrainer

from src.system_prompt import TRAINING_SYSTEM_PROMPT
from src.rlm.utils import prepare_gemma4_tokenizer_repo

# Configuration
MODEL_NAME: str = "Qwen/Qwen2.5-7B-Instruct"
# MODEL_NAME: str = "google/gemma-4-E2B-it"
DATASET_NAME: str = "gsm8k"
OUTPUT_DIR: str = os.environ.get("SFT_MODEL_PATH", "./weights/sft_lora")

# HYPERPARAMETERS
EPOCHS: int = 2
BATCH_SIZE: int = 8
LR: float = 5e-6
LORA_RANK: int = 8
LORA_ALPHA: int = 16


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


def format_assistant_output(reasoning: str, final_answer: str) -> str:
    return f"<think>\n{reasoning}\n</think>\n<answer>\n{final_answer}\n</answer>"


def formatting_prompts_func(example: dict, tokenizer: AutoTokenizer) -> str:
    question = example["question"]
    answer_full = example["answer"]

    if "####" in answer_full:
        reasoning, final_answer = answer_full.split("####", 1)
        reasoning = reasoning.strip()
        final_answer = final_answer.strip()
    else:
        reasoning = answer_full.strip()
        final_answer = ""

    messages = [
        {"role": "system", "content": TRAINING_SYSTEM_PROMPT},
        {"role": "user", "content": question},
        {
            "role": "assistant",
            "content": format_assistant_output(reasoning, final_answer),
        },
    ]
    return tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=False
    )


def train():
    # 1. Load Model and Tokenizer
    # bf16 is only supported on certain GPUs, so we check for that and fall back to fp16 if needed
    use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    # processor = AutoProcessor.from_pretrained(MODEL_NAME)
    # tokenizer = processor.tokenizer
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        device_map={"": 0},
        dtype=torch.bfloat16 if use_bf16 else torch.float16,
    )

    # 2. Configure LoRA
    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=LORA_RANK,
        lora_alpha=LORA_ALPHA,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.01,
        bias="none",
    )

    # 3. Load Dataset
    dataset = load_dataset(DATASET_NAME, name="main", split="train")

    # 4. Configure Training
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=2,
        learning_rate=LR,
        fp16=not use_bf16,
        bf16=use_bf16,
        logging_steps=100,
    )

    # 5. Initialize SFTTrainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        args=training_args,
        formatting_func=lambda ex: formatting_prompts_func(ex, tokenizer),
        processing_class=tokenizer,
    )

    # 6. Train and save
    trainer.train()
    trainer.save_model(OUTPUT_DIR)
    print("SFT Training finished")


if __name__ == "__main__":
    train()
