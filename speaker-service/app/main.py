from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException

from .diarization import SpeakerDiarizationService
from .schemas import DiarizeRequest, DiarizeResponse, EnrollRequest, EnrollResponse
from .settings import settings


logger = logging.getLogger(__name__)
app = FastAPI(title="Second Brain Speaker Service", version="0.1.0")
service = SpeakerDiarizationService()


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "model": settings.diarization_model,
        "has_hf_token": bool(settings.hf_token),
    }


@app.post("/diarize", response_model=DiarizeResponse)
def diarize(payload: DiarizeRequest) -> DiarizeResponse:
    try:
        assignments = service.diarize(payload)
        return DiarizeResponse(assignments=assignments, source="pyannote")
    except RuntimeError as error:
        logger.exception(
            "Diarization runtime failure for %s transcript entries with mime type %s",
            len(payload.transcriptEntries),
            payload.mimeType,
        )
        raise HTTPException(status_code=500, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - defensive service boundary
        logger.exception(
            "Unexpected diarization failure for %s transcript entries with mime type %s",
            len(payload.transcriptEntries),
            payload.mimeType,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Speaker diarization failed: {error}",
        ) from error


@app.post("/enroll", response_model=EnrollResponse)
def enroll(payload: EnrollRequest) -> EnrollResponse:
    try:
        return service.enroll(payload)
    except RuntimeError as error:
        logger.exception(
            "Enrollment runtime failure for speaker %s with mime type %s",
            payload.speakerId,
            payload.mimeType,
        )
        raise HTTPException(status_code=500, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - defensive service boundary
        logger.exception(
            "Unexpected enrollment failure for speaker %s with mime type %s",
            payload.speakerId,
            payload.mimeType,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Speaker enrollment failed: {error}",
        ) from error
