from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Confidence = Literal["high", "medium", "low"]


class TranscriptEntryPayload(BaseModel):
    id: str
    speaker: str
    speakerId: str | None = None
    text: str
    timestamp: str
    recordedAt: str | None = None
    offsetMs: int | None = None


class SpeakerProfilePayload(BaseModel):
    id: str
    name: str
    color: str | None = None
    voiceEnrolled: bool | None = None
    enrolledSampleCount: int | None = None
    lastEnrolledAt: str | None = None


class DiarizeRequest(BaseModel):
    audioBase64: str
    mimeType: str = Field(default="audio/webm")
    transcriptEntries: list[TranscriptEntryPayload]
    speakerProfiles: list[SpeakerProfilePayload] = Field(default_factory=list)


class AssignmentPayload(BaseModel):
    entryId: str
    speakerId: str
    speakerName: str
    confidence: Confidence = "medium"


class DiarizeResponse(BaseModel):
    assignments: list[AssignmentPayload]
    source: Literal["pyannote"]


class EnrollRequest(BaseModel):
    speakerId: str
    speakerName: str
    audioBase64: str
    mimeType: str = Field(default="audio/webm")


class EnrollResponse(BaseModel):
    speakerId: str
    enrolledSampleCount: int
    voiceEnrolled: bool = True
    lastEnrolledAt: str
    source: Literal["pyannote"]
