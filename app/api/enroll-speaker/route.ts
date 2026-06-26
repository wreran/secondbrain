import { NextResponse } from 'next/server';
import { type SpeakerProfile } from '@/types';

function resolveEnrollEndpoint() {
  const explicitUrl = process.env.DIARIZATION_ENROLL_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const diarizeUrl = process.env.DIARIZATION_API_URL;
  if (!diarizeUrl) {
    return null;
  }

  if (/\/diarize\/?$/.test(diarizeUrl)) {
    return diarizeUrl.replace(/\/diarize\/?$/, '/enroll');
  }

  return `${diarizeUrl.replace(/\/$/, '')}/enroll`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    speaker?: SpeakerProfile;
    audioBase64?: string;
    mimeType?: string;
  };

  if (!body.speaker || !body.audioBase64) {
    return NextResponse.json({ error: 'Missing speaker payload or audio sample.' }, { status: 400 });
  }

  const enrollUrl = resolveEnrollEndpoint();
  const externalKey = process.env.DIARIZATION_API_KEY;

  if (!enrollUrl) {
    return NextResponse.json(
      { error: 'DIARIZATION_ENROLL_URL or DIARIZATION_API_URL must be configured for enrollment.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(enrollUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(externalKey ? { Authorization: `Bearer ${externalKey}` } : {}),
      },
      body: JSON.stringify({
        speakerId: body.speaker.id,
        speakerName: body.speaker.name,
        audioBase64: body.audioBase64,
        mimeType: body.mimeType ?? 'audio/webm',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Enrollment failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      enrolledSampleCount?: number;
      lastEnrolledAt?: string;
      voiceEnrolled?: boolean;
    };

    return NextResponse.json({
      speaker: {
        ...body.speaker,
        voiceEnrolled: payload.voiceEnrolled ?? true,
        enrolledSampleCount: payload.enrolledSampleCount ?? (body.speaker.enrolledSampleCount ?? 0) + 1,
        lastEnrolledAt: payload.lastEnrolledAt ?? new Date().toISOString(),
      },
      source: 'external',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Speaker enrollment failed.',
      },
      { status: 500 }
    );
  }
}
