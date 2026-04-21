import os

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

MODEL_PATH = os.environ.get("FINAL_MODEL_PATH", "./weights/final_rlm_lora")
BASE_MODEL = "Qwen/Qwen2.5-7B-Instruct"

def load_rlm_model():
    print(f"Cargando modelo RLM desde {MODEL_PATH}...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype=torch.float16, device_map="auto")
    model = PeftModel.from_pretrained(base_model, MODEL_PATH)
    return model, tokenizer