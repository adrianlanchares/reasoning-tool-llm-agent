import json
import os
import shutil
import tempfile
from huggingface_hub import snapshot_download


def prepare_gemma4_tokenizer_repo(model_name: str) -> str:
    """
    Download the model files to a local temp directory and patch tokenizer_config.json
    so Transformers v4 can load Gemma 4.
    """
    local_dir = snapshot_download(model_name)

    patched_dir = tempfile.mkdtemp(prefix="gemma4_patched_")
    shutil.copytree(local_dir, patched_dir, dirs_exist_ok=True)

    tokenizer_config_path = os.path.join(patched_dir, "tokenizer_config.json")
    if os.path.exists(tokenizer_config_path):
        with open(tokenizer_config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)

        extra = cfg.get("extra_special_tokens")
        if isinstance(extra, list):
            # Transformers v4 expects dict-like handling here; list breaks it.
            cfg["extra_special_tokens"] = {}

        with open(tokenizer_config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)

    return patched_dir