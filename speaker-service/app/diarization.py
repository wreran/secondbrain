from __future__ import annotations

import base64
import inspect
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

import huggingface_hub
import numpy as np
import soundfile as sf

from .schemas import AssignmentPayload, DiarizeRequest, EnrollRequest, EnrollResponse
from .settings import settings


def _patch_huggingface_auth_alias() -> None:
    signature = inspect.signature(huggingface_hub.hf_hub_download)
    if "use_auth_token" in signature.parameters:
        return

    original_download = huggingface_hub.hf_hub_download

    def compat_hf_hub_download(*args: Any, **kwargs: Any):
        if "use_auth_token" in kwargs and "token" not in kwargs:
          kwargs["token"] = kwargs.pop("use_auth_token")
        return original_download(*args, **kwargs)

    huggingface_hub.hf_hub_download = compat_hf_hub_download

    try:
        import huggingface_hub.file_download as file_download

        file_download.hf_hub_download = compat_hf_hub_download
    except Exception:
        pass


_patch_huggingface_auth_alias()

from pyannote.audio import Inference, Pipeline
from pyannote.core import Segment
import torchaudio


@dataclass(frozen=True)
class DiarizedTurn:
    speaker_label: str
    start_ms: int
    end_ms: int


class SpeakerDiarizationService:
    def __init__(self) -> None:
        self._pipeline: Pipeline | None = None
        self._embedding_inference: Inference | None = None

    def enroll(self, payload: EnrollRequest) -> EnrollResponse:
        audio_path = self._write_temp_audio(payload.audioBase64, payload.mimeType)
        try:
            embedding = self._embed_clip(audio_path)
            speaker_dir = settings.enrollments_dir / payload.speakerId
            speaker_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            np.save(speaker_dir / f"{timestamp}.npy", embedding)

            sample_count = len(list(speaker_dir.glob("*.npy")))
            return EnrollResponse(
                speakerId=payload.speakerId,
                enrolledSampleCount=sample_count,
                lastEnrolledAt=datetime.now(timezone.utc).isoformat(),
                source="pyannote",
            )
        finally:
            audio_path.unlink(missing_ok=True)

    def diarize(self, payload: DiarizeRequest) -> list[AssignmentPayload]:
        audio_path = self._write_temp_audio(payload.audioBase64, payload.mimeType)
        try:
            turns = self._run_pipeline(audio_path)
            return self._assign_names(payload, turns, audio_path)
        finally:
            audio_path.unlink(missing_ok=True)

    def _write_temp_audio(self, audio_base64: str, mime_type: str) -> Path:
        normalized_mime_type = mime_type.split(";", 1)[0].strip().lower()
        suffix = {
            "audio/webm": ".webm",
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/mpeg": ".mp3",
            "audio/mp4": ".m4a",
        }.get(normalized_mime_type, ".bin")

        decoded = base64.b64decode(audio_base64)
        with NamedTemporaryFile(delete=False, suffix=suffix) as handle:
            handle.write(decoded)
            temp_path = Path(handle.name)

        if normalized_mime_type in {"audio/webm", "audio/mpeg", "audio/mp4"}:
            return self._transcode_to_wav(temp_path)

        return temp_path

    def _transcode_to_wav(self, source_path: Path) -> Path:
        try:
            waveform, sample_rate = torchaudio.load(str(source_path), backend="ffmpeg")
        except Exception as error:
            source_path.unlink(missing_ok=True)
            raise RuntimeError(
                f"Could not decode audio file '{source_path.name}'. "
                "The uploaded browser recording format is unsupported by the current backend."
            ) from error

        with NamedTemporaryFile(delete=False, suffix=".wav") as handle:
            wav_path = Path(handle.name)

        sf.write(wav_path, waveform.transpose(0, 1).numpy(), sample_rate)
        source_path.unlink(missing_ok=True)
        return wav_path

    def _run_pipeline(self, audio_path: Path) -> list[DiarizedTurn]:
        pipeline = self._get_pipeline()
        if pipeline is None:
            raise RuntimeError(
                f"Could not load diarization pipeline '{settings.diarization_model}'. "
                "Check that your Hugging Face token is valid and that you accepted the model's gated access terms."
            )
        diarization = pipeline(str(audio_path))

        turns: list[DiarizedTurn] = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            turns.append(
                DiarizedTurn(
                    speaker_label=str(speaker),
                    start_ms=int(turn.start * 1000),
                    end_ms=int(turn.end * 1000),
                )
            )
        return turns

    def _get_pipeline(self) -> Pipeline:
        if self._pipeline is None:
            if not settings.hf_token:
                raise RuntimeError("HF_TOKEN is required for the pyannote diarization pipeline.")

            self._pipeline = Pipeline.from_pretrained(
                settings.diarization_model,
                use_auth_token=settings.hf_token,
            )
            if self._pipeline is None:
                raise RuntimeError(
                    f"Could not download '{settings.diarization_model}' pipeline. "
                    "Authenticate with a valid Hugging Face token and accept the model's gated access conditions."
                )
        return self._pipeline

    def _get_embedding_inference(self) -> Inference:
        if self._embedding_inference is None:
            if not settings.hf_token:
                raise RuntimeError("HF_TOKEN is required for the pyannote embedding model.")

            self._embedding_inference = Inference(
                settings.embedding_model,
                window="whole",
                use_auth_token=settings.hf_token,
            )
        return self._embedding_inference

    def _embed_clip(self, audio_path: Path) -> np.ndarray:
        inference = self._get_embedding_inference()
        embedding = inference(str(audio_path))
        return self._normalize_embedding(np.asarray(embedding).squeeze())

    def _embed_turn(self, audio_path: Path, turn: DiarizedTurn) -> np.ndarray:
        inference = self._get_embedding_inference()
        segment = Segment(turn.start_ms / 1000, turn.end_ms / 1000)
        embedding = inference.crop(str(audio_path), segment)
        return self._normalize_embedding(np.asarray(embedding).squeeze())

    def _normalize_embedding(self, embedding: np.ndarray) -> np.ndarray:
        if embedding.ndim > 1:
            embedding = embedding.reshape(-1)

        norm = np.linalg.norm(embedding)
        if norm == 0:
            return embedding
        return embedding / norm

    def _assign_names(
        self,
        payload: DiarizeRequest,
        turns: list[DiarizedTurn],
        audio_path: Path,
    ) -> list[AssignmentPayload]:
        if not turns:
            return []

        identified_profiles = self._identify_speakers(payload.speakerProfiles, turns, audio_path)
        if not identified_profiles:
            identified_profiles = self._build_roster_order_map(turns, payload.speakerProfiles)

        assignments: list[AssignmentPayload] = []
        for entry in payload.transcriptEntries:
            offset_ms = entry.offsetMs
            if offset_ms is None:
                continue

            best_turn = self._find_best_turn(offset_ms, turns)
            if best_turn is None:
                continue

            profile = identified_profiles[best_turn.speaker_label]
            assignments.append(
                AssignmentPayload(
                    entryId=entry.id,
                    speakerId=profile["id"],
                    speakerName=profile["name"],
                    confidence=profile["confidence"],
                )
            )
        return assignments

    def _identify_speakers(
        self,
        roster: list[Any],
        turns: list[DiarizedTurn],
        audio_path: Path,
    ) -> dict[str, dict[str, str]]:
        enrolled_profiles = [profile for profile in roster if self._speaker_has_enrollments(profile.id)]
        if not enrolled_profiles:
            return {}

        roster_embeddings = {
            profile.id: self._load_speaker_centroid(profile.id)
            for profile in enrolled_profiles
        }

        identified: dict[str, dict[str, str]] = {}
        for label in dict.fromkeys(turn.speaker_label for turn in turns):
            label_turns = [turn for turn in turns if turn.speaker_label == label]
            longest_turn = max(label_turns, key=lambda turn: turn.end_ms - turn.start_ms)
            turn_embedding = self._embed_turn(audio_path, longest_turn)

            best_profile = None
            best_score = -1.0
            for profile in enrolled_profiles:
                score = float(np.dot(turn_embedding, roster_embeddings[profile.id]))
                if score > best_score:
                    best_score = score
                    best_profile = profile

            if best_profile is None:
                continue

            confidence = (
                "high"
                if best_score >= settings.high_similarity_threshold
                else "medium"
                if best_score >= settings.low_similarity_threshold
                else "low"
            )

            identified[label] = {
                "id": best_profile.id,
                "name": best_profile.name,
                "confidence": confidence,
            }

        return identified

    def _build_roster_order_map(
        self, turns: list[DiarizedTurn], roster: list[Any]
    ) -> dict[str, dict[str, str]]:
        ordered_labels = list(dict.fromkeys(turn.speaker_label for turn in turns))

        if not roster:
            return {
                label: {
                    "id": f"speaker-{index + 1}",
                    "name": f"Speaker {index + 1}",
                    "confidence": "medium",
                }
                for index, label in enumerate(ordered_labels)
            }

        mapping: dict[str, dict[str, str]] = {}
        for index, label in enumerate(ordered_labels):
            if index < len(roster):
                profile = roster[index]
                mapping[label] = {
                    "id": profile.id,
                    "name": profile.name,
                    "confidence": "low",
                }
            else:
                mapping[label] = {
                    "id": f"speaker-extra-{index + 1}",
                    "name": f"Speaker {index + 1}",
                    "confidence": "low",
                }
        return mapping

    def _speaker_has_enrollments(self, speaker_id: str) -> bool:
        return any((settings.enrollments_dir / speaker_id).glob("*.npy"))

    def _load_speaker_centroid(self, speaker_id: str) -> np.ndarray:
        vectors = [np.load(path) for path in (settings.enrollments_dir / speaker_id).glob("*.npy")]
        if not vectors:
            raise RuntimeError(f"No enrollments found for {speaker_id}")

        centroid = np.mean(np.vstack(vectors), axis=0)
        return self._normalize_embedding(centroid)

    def _find_best_turn(self, offset_ms: int, turns: list[DiarizedTurn]) -> DiarizedTurn | None:
        containing_turn = next(
            (turn for turn in turns if turn.start_ms <= offset_ms <= turn.end_ms),
            None,
        )
        if containing_turn:
            return containing_turn

        return min(
            turns,
            key=lambda turn: min(abs(offset_ms - turn.start_ms), abs(offset_ms - turn.end_ms)),
        )
