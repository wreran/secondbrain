# Speaker Service

This is a small external diarization backend for the Second Brain frontend.

It exposes:

- `GET /health`
- `POST /enroll`
- `POST /diarize`

The frontend route at `app/api/diarize-speakers/route.ts` can call this service when you set:

```env
DIARIZATION_API_URL=http://localhost:8787/diarize
DIARIZATION_API_KEY=
```

## What It Does

Today this service provides:

- real speaker diarization using `pyannote.audio`
- speaker enrollment by storing per-teammate voice embeddings
- alignment from diarized turns to transcript entries using `offsetMs`
- speaker name assignment by comparing diarized turn embeddings to enrolled voiceprints

Current limitation:

- if nobody is enrolled yet, the frontend still falls back to anonymous or roster-order mapping
- accuracy depends on sample quality, microphone consistency, and overlap between speakers

## Setup

1. Create a Python virtual environment.
2. Install dependencies from `requirements.txt`.
3. Copy `.env.example` to `.env` or export the variables in your shell.
4. Make sure your Hugging Face account has accepted access for:
   `pyannote/speaker-diarization-3.1`
5. If the embedding model prompts for access on Hugging Face, accept that too.
5. Start the API.

Example commands:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8787
```

On Windows PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8787
```

## Environment Variables

```env
SPEAKER_SERVICE_HOST=0.0.0.0
SPEAKER_SERVICE_PORT=8787
HF_TOKEN=your_huggingface_token
DIARIZATION_MODEL=pyannote/speaker-diarization-3.1
EMBEDDING_MODEL=pyannote/embedding
HIGH_SIMILARITY_THRESHOLD=0.72
LOW_SIMILARITY_THRESHOLD=0.60
ENROLLMENTS_DIR=./enrollments
```

## Enrollment Request

```json
{
  "speakerId": "speaker-sarah",
  "speakerName": "Sarah",
  "audioBase64": "...",
  "mimeType": "audio/webm"
}
```

## Enrollment Response

```json
{
  "speakerId": "speaker-sarah",
  "enrolledSampleCount": 2,
  "voiceEnrolled": true,
  "lastEnrolledAt": "2026-06-26T03:40:00.000000+00:00",
  "source": "pyannote"
}
```

## Request Shape

```json
{
  "audioBase64": "...",
  "mimeType": "audio/webm",
  "transcriptEntries": [
    {
      "id": "transcript-1",
      "speaker": "Live Mic",
      "text": "We should test this with first-year students.",
      "timestamp": "2:15 AM",
      "recordedAt": "2026-06-26T02:15:11.123Z",
      "offsetMs": 11250
    }
  ],
  "speakerProfiles": [
    {
      "id": "speaker-sarah",
      "name": "Sarah"
    },
    {
      "id": "speaker-marcus",
      "name": "Marcus"
    }
  ]
}
```

## Response Shape

```json
{
  "source": "pyannote",
  "assignments": [
    {
      "entryId": "transcript-1",
      "speakerId": "speaker-sarah",
      "speakerName": "Sarah",
      "confidence": "low"
    }
  ]
}
```

## How It Identifies Speakers

1. Each teammate records one or more short enrollment samples.
2. The service converts each sample into a speaker embedding and stores it in `enrollments/<speakerId>/`.
3. During diarization, the service extracts an embedding from each detected speaker track.
4. It compares that embedding against the enrolled speaker centroids with cosine similarity.
5. The closest match is used as the assigned speaker name.

You can improve accuracy by collecting 2-3 clean enrollment samples per person.
