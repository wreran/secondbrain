import { NextResponse } from 'next/server';
import { type SpeakerProfile, type TranscriptEntry } from '@/types';

interface DiarizationAssignment {
  entryId: string;
  speakerId: string;
  speakerName: string;
  confidence?: 'high' | 'medium' | 'low';
}

function isRealSpeakerProfile(profile: SpeakerProfile) {
  const normalizedName = profile.name.trim().toLowerCase();
  return profile.id !== 'speaker-live-mic' && normalizedName !== 'live mic' && normalizedName !== 'unassigned';
}

function fallbackAssignments(
  transcriptEntries: TranscriptEntry[],
  speakerProfiles: SpeakerProfile[]
): DiarizationAssignment[] {
  const enrolledProfiles = speakerProfiles.filter((profile) => profile.voiceEnrolled);
  const sortedEntries = [...transcriptEntries].sort(
    (left, right) => (left.offsetMs ?? 0) - (right.offsetMs ?? 0)
  );

  const labels =
    enrolledProfiles.length > 0
      ? enrolledProfiles
      : speakerProfiles.length > 0
        ? speakerProfiles
        : [{ id: 'speaker-1', name: 'Speaker 1' }];

  let currentSpeakerIndex = 0;
  let currentTurnLength = 0;
  let previousOffset = 0;

  return sortedEntries.map((entry, index) => {
    const offset = entry.offsetMs ?? index * 4000;
    const gapMs = index === 0 ? 0 : offset - previousOffset;
    const shouldSwitch =
      labels.length > 1 &&
      index > 0 &&
      (gapMs > 7000 || currentTurnLength >= 2 || /\?$/.test(sortedEntries[index - 1]?.text ?? ''));

    if (shouldSwitch) {
      currentSpeakerIndex = (currentSpeakerIndex + 1) % labels.length;
      currentTurnLength = 0;
    }

    const label = labels[currentSpeakerIndex];
    previousOffset = offset;
    currentTurnLength += 1;

    return {
      entryId: entry.id,
      speakerId: label.id,
      speakerName: label.name,
      confidence: enrolledProfiles.length > 0 ? 'low' : 'low',
    };
  });
}

function finalizeAssignments(
  assignments: DiarizationAssignment[],
  speakerProfiles: SpeakerProfile[]
) {
  const profilesById = new Map(
    speakerProfiles.map((profile) => [profile.id, profile])
  );

  return assignments.map((assignment) => {
    const matchedProfile = profilesById.get(assignment.speakerId);
    if (!matchedProfile) {
      return {
        ...assignment,
        speakerId: assignment.speakerId || 'anonymous',
        speakerName: assignment.speakerName || 'Anonymous',
        confidence: assignment.confidence ?? ('low' as const),
      };
    }

    return {
      ...assignment,
      speakerId: matchedProfile.id,
      speakerName: matchedProfile.name,
    };
  });
}

function normalizeAssignments(payload: unknown): DiarizationAssignment[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidate = payload as {
    assignments?: DiarizationAssignment[];
    entries?: Array<{
      entryId?: string;
      speakerId?: string;
      speakerName?: string;
      confidence?: 'high' | 'medium' | 'low';
    }>;
  };

  if (Array.isArray(candidate.assignments)) {
    return candidate.assignments.filter(
      (assignment) =>
        assignment &&
        typeof assignment.entryId === 'string' &&
        typeof assignment.speakerId === 'string' &&
        typeof assignment.speakerName === 'string'
    );
  }

  if (Array.isArray(candidate.entries)) {
    return candidate.entries
      .filter(
        (entry) =>
          typeof entry.entryId === 'string' &&
          typeof entry.speakerId === 'string' &&
          typeof entry.speakerName === 'string'
      )
      .map((entry) => ({
        entryId: entry.entryId as string,
        speakerId: entry.speakerId as string,
        speakerName: entry.speakerName as string,
        confidence: entry.confidence,
      }));
  }

  return [];
}

function mergeAssignments(
  primaryAssignments: DiarizationAssignment[],
  fallback: DiarizationAssignment[]
) {
  const merged = new Map(fallback.map((assignment) => [assignment.entryId, assignment]));
  for (const assignment of primaryAssignments) {
    merged.set(assignment.entryId, assignment);
  }
  return Array.from(merged.values());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    audioBase64?: string;
    mimeType?: string;
    transcriptEntries?: TranscriptEntry[];
    speakerProfiles?: SpeakerProfile[];
  };

  const transcriptEntries = body.transcriptEntries ?? [];
  const speakerProfiles = (body.speakerProfiles ?? []).filter(isRealSpeakerProfile);

  if (!body.audioBase64 || transcriptEntries.length === 0) {
    return NextResponse.json({ error: 'Missing audio or transcript timeline.' }, { status: 400 });
  }

  const externalUrl = process.env.DIARIZATION_API_URL;
  const externalKey = process.env.DIARIZATION_API_KEY;

  if (!externalUrl) {
    return NextResponse.json({
      source: 'fallback',
      assignments: finalizeAssignments(
        fallbackAssignments(transcriptEntries, speakerProfiles),
        speakerProfiles
      ),
    });
  }

  try {
    const fallback = fallbackAssignments(transcriptEntries, speakerProfiles);
    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(externalKey ? { Authorization: `Bearer ${externalKey}` } : {}),
      },
      body: JSON.stringify({
        audioBase64: body.audioBase64,
        mimeType: body.mimeType ?? 'audio/webm',
        transcriptEntries,
        speakerProfiles,
      }),
    });

    if (!response.ok) {
      throw new Error(`External diarization failed with status ${response.status}`);
    }

    const payload = await response.json();
    const assignments = normalizeAssignments(payload);
    if (assignments.length === 0) {
      throw new Error('External diarization returned no usable assignments.');
    }

    return NextResponse.json({
      source: 'external',
      assignments: finalizeAssignments(
        mergeAssignments(assignments, fallback),
        speakerProfiles
      ),
    });
  } catch {
    return NextResponse.json({
      source: 'fallback',
      assignments: finalizeAssignments(
        fallbackAssignments(transcriptEntries, speakerProfiles),
        speakerProfiles
      ),
    });
  }
}
