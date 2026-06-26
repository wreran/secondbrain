from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
    host: str = os.getenv("SPEAKER_SERVICE_HOST", "0.0.0.0")
    port: int = int(os.getenv("SPEAKER_SERVICE_PORT", "8787"))
    hf_token: str | None = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
    diarization_model: str = os.getenv(
        "DIARIZATION_MODEL",
        "pyannote/speaker-diarization-3.1",
    )
    embedding_model: str = os.getenv(
        "EMBEDDING_MODEL",
        "pyannote/embedding",
    )
    enrollments_dir: Path = Path(
        os.getenv("ENROLLMENTS_DIR", Path(__file__).resolve().parents[1] / "enrollments")
    )
    high_similarity_threshold: float = float(os.getenv("HIGH_SIMILARITY_THRESHOLD", "0.72"))
    low_similarity_threshold: float = float(os.getenv("LOW_SIMILARITY_THRESHOLD", "0.60"))


settings = Settings()
