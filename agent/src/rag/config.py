"""Shared configuration for RAG ingestion and retrieval."""

import os
from pathlib import Path


def _resolve_path_from_env(env_name: str, default: Path) -> Path:
    """Helper to resolve a path from an environment variable, with a default fallback."""
    raw = os.environ.get(env_name)
    if raw:
        return Path(raw).expanduser().resolve()
    return default.resolve()


PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAG_DATA_DIR = _resolve_path_from_env("RAG_DATA_DIR", PROJECT_ROOT / "data" / "rag")
DB_DIR = _resolve_path_from_env("RAG_VECTORSTORE_DIR", PROJECT_ROOT / "storage" / "vectorstore")

EMBEDDING_MODEL = os.environ.get("RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
