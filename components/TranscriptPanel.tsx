'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Fingerprint, MessageSquare, Mic, Plus, ScanSearch, Square, Users, X } from 'lucide-react';
import { createSpeakerProfile } from '@/lib/workspace-store';
import {
  type SpeakerProfile,
  type TranscriptEntry,
  type TranscriptSentimentAnalysis,
} from '@/types';

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  interimTranscript?: string;
  isRecording: boolean;
  onAddEntry: (text: string, speaker: string, speakerId?: string) => void;
  speakerProfiles: SpeakerProfile[];
  onUpdateSpeakerProfiles: (profiles: SpeakerProfile[]) => void;
  onEnrollSpeaker: (speaker: SpeakerProfile) => void;
  enrollingSpeakerId: string | null;
  onClassifySpeakers: () => void;
  isClassifyingSpeakers: boolean;
  hasCapturedAudio: boolean;
  speakerStatus: string;
  recordingStatus: string;
  speechSupported: boolean;
}

const sentimentStyles: Record<
  TranscriptSentimentAnalysis['label'],
  {
    label: string;
    style: {
      background: string;
      color: string;
      border: string;
    };
  }
> = {
  supporting: {
    label: 'Supports Idea',
    style: {
      background: 'rgba(255, 214, 102, 0.12)',
      color: '#facc15',
      border: '1px solid rgba(250, 204, 21, 0.25)',
    },
  },
  questioning: {
    label: 'Pushback',
    style: {
      background: 'rgba(251, 113, 133, 0.1)',
      color: 'var(--accent-coral)',
      border: '1px solid rgba(251, 113, 133, 0.22)',
    },
  },
  neutral: {
    label: 'Neutral',
    style: {
      background: 'rgba(168, 85, 247, 0.1)',
      color: 'var(--accent-lavender)',
      border: '1px solid rgba(168, 85, 247, 0.18)',
    },
  },
};

export function TranscriptPanel({
  entries,
  interimTranscript,
  isRecording,
  onAddEntry,
  speakerProfiles,
  onUpdateSpeakerProfiles,
  onEnrollSpeaker,
  enrollingSpeakerId,
  onClassifySpeakers,
  isClassifyingSpeakers,
  hasCapturedAudio,
  speakerStatus,
  recordingStatus,
  speechSupported,
}: TranscriptPanelProps) {
  const [speaker, setSpeaker] = useState('You');
  const [text, setText] = useState('');
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [composerHeight, setComposerHeight] = useState(120);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const activeSpeaker = speakerProfiles.length > 0 && speaker === 'You' ? speakerProfiles[0].name : speaker;

  useEffect(() => {
    if (!shouldStickToBottomRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [entries.length, interimTranscript]);

  const handleTranscriptScroll = () => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      return;
    }

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

    // Stop auto-following when the user scrolls meaningfully away from the newest entries.
    shouldStickToBottomRef.current = distanceFromBottom < 48;
  };

  const submitEntry = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const selectedSpeaker =
      speakerProfiles.find((profile) => profile.name === activeSpeaker) ?? null;

    onAddEntry(trimmed, activeSpeaker.trim() || 'You', selectedSpeaker?.id);
    setText('');
  };

  const addSpeaker = () => {
    const trimmed = newSpeakerName.trim();
    if (!trimmed) {
      return;
    }

    if (speakerProfiles.some((profile) => profile.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewSpeakerName('');
      return;
    }

    onUpdateSpeakerProfiles([
      ...speakerProfiles,
      createSpeakerProfile(trimmed, speakerProfiles.length),
    ]);
    setSpeaker(trimmed);
    setNewSpeakerName('');
  };

  const removeSpeaker = (speakerId: string) => {
    const nextProfiles = speakerProfiles.filter((profile) => profile.id !== speakerId);
    onUpdateSpeakerProfiles(nextProfiles);
    if (!nextProfiles.some((profile) => profile.name === speaker)) {
      setSpeaker(nextProfiles[0]?.name ?? 'You');
    }
  };

  const handleComposerResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = composerHeight;

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      setComposerHeight(Math.max(96, Math.min(320, startHeight + delta)));
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  return (
    <div className="h-full w-full min-h-0 flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3" style={{
        borderBottom: '1px solid rgba(192, 132, 252, 0.15)',
        background: 'rgba(16, 10, 35, 0.5)',
        backdropFilter: 'blur(10px)',
      }}>
        <MessageSquare className="w-4 h-4" style={{ color: 'var(--accent-lavender)' }} />
        <h3 className="text-sm font-semibold text-brand tracking-wide">
          Live Transcript
        </h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{
          background: 'rgba(168, 85, 247, 0.1)',
          color: 'var(--accent-purple)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
        }}>
          {entries.length} entries
        </span>
      </div>
      <div
        className="px-4 py-3 border-b"
        style={{
          borderColor: 'rgba(168, 85, 247, 0.1)',
          background: 'rgba(10, 8, 28, 0.45)',
        }}
      >
      <div
        className="rounded-xl px-3 py-2"
          style={{
            background: isRecording ? 'rgba(45, 212, 191, 0.08)' : 'rgba(168, 85, 247, 0.08)',
            border: `1px solid ${isRecording ? 'rgba(45, 212, 191, 0.2)' : 'rgba(168, 85, 247, 0.18)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            {speechSupported ? (
              <Mic className="w-3.5 h-3.5" style={{ color: isRecording ? 'var(--accent-teal-green)' : 'var(--accent-lavender)' }} />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--accent-coral)' }} />
            )}
            <span className="text-[11px] font-semibold" style={{ color: speechSupported ? 'var(--text-primary)' : 'var(--accent-coral)' }}>
              {speechSupported ? (isRecording ? 'Mic is live' : 'Speech recognition ready') : 'Speech recognition unavailable'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {recordingStatus}
          </p>
          {isRecording && (
            <div
              className="mt-2 rounded-lg px-2.5 py-2"
              style={{
                background: 'rgba(20, 12, 42, 0.7)',
                border: '1px solid rgba(45, 212, 191, 0.15)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full status-active" />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-teal-green)' }}>
                  Live Capture
                </span>
              </div>
              <p className="text-xs text-secondary">
                {interimTranscript?.trim() || 'Waiting for you to speak...'}
              </p>
            </div>
          )}
        </div>
      </div>
      <div
        className="px-4 py-3 border-b space-y-3"
        style={{
          borderColor: 'rgba(168, 85, 247, 0.1)',
          background: 'rgba(12, 9, 30, 0.45)',
        }}
      >
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            Speaker Roster
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {speakerProfiles.length === 0 && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Add teammate names so diarization can map voices onto transcript cards.
            </span>
          )}
          {speakerProfiles.map((profile, index) => (
            <span
              key={profile.id}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: 'rgba(34, 211, 238, 0.08)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(34, 211, 238, 0.18)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: profile.color ?? `hsl(${(index * 67) % 360} 80% 70%)`,
                  boxShadow: `0 0 6px ${profile.color ?? 'rgba(34,211,238,0.45)'}`,
                }}
              />
              {profile.name}
              <button
                type="button"
                onClick={() => onEnrollSpeaker(profile)}
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 hover:bg-white/5"
                aria-label={`Enroll ${profile.name}`}
              >
                {enrollingSpeakerId === profile.id ? (
                  <>
                    <Square className="w-3 h-3" />
                    <span className="text-[10px]">Stop</span>
                  </>
                ) : profile.voiceEnrolled ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px]">{profile.enrolledSampleCount ?? 1}</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-3 h-3" />
                    <span className="text-[10px]">Enroll</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => removeSpeaker(profile.id)}
                className="rounded-full p-0.5 hover:bg-white/5"
                aria-label={`Remove ${profile.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newSpeakerName}
            onChange={(event) => setNewSpeakerName(event.target.value)}
            placeholder="Add teammate name"
            className="flex-1 rounded-lg px-3 py-2 text-xs bg-transparent border outline-none"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.2)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            onClick={addSpeaker}
            className="rounded-lg px-3 py-2 text-[11px] font-semibold"
            style={{
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.22)',
              color: 'var(--accent-cyan)',
            }}
          >
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={onClassifySpeakers}
          disabled={isRecording || isClassifyingSpeakers || !hasCapturedAudio}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-45"
          style={{
            background: 'rgba(250, 204, 21, 0.1)',
            border: '1px solid rgba(250, 204, 21, 0.24)',
            color: '#facc15',
          }}
        >
          <ScanSearch className="w-3.5 h-3.5" />
          {isClassifyingSpeakers ? 'Detecting Speakers...' : 'Detect Speakers'}
        </button>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {speakerStatus}
        </p>
      </div>
      <div
        ref={scrollViewportRef}
        onScroll={handleTranscriptScroll}
        className="transcript-scroll flex-1 min-h-[180px] px-4 py-3 overflow-y-auto overscroll-contain"
        style={{
          flex: '1 1 180px',
          scrollbarWidth: 'auto',
          scrollbarColor: 'rgba(168,85,247,0.55) rgba(7,4,23,0.6)',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          background: 'rgba(8, 6, 24, 0.22)',
        }}
      >
        <div className="space-y-3">
          {entries.length === 0 && (
            <div className="p-4 rounded-xl bio-card" style={{ background: 'rgba(20, 12, 42, 0.45)' }}>
              <p className="text-xs leading-relaxed text-secondary">
                Start recording or add an entry manually. New transcript lines will appear here automatically.
              </p>
            </div>
          )}
          {entries.map((entry) => {
            const sentimentMeta = entry.sentiment
              ? sentimentStyles[entry.sentiment.label]
              : null;

            return (
              <div
                key={entry.id}
                className="p-3 rounded-xl transition-all hover:scale-[1.01] bio-card"
                style={{ background: 'rgba(20, 12, 42, 0.5)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-pink">
                    {entry.speaker}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{entry.timestamp}</span>
                </div>
                <p className="text-xs leading-relaxed text-secondary">
                  {entry.text}
                </p>
                {entry.sentiment && sentimentMeta && (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                      style={sentimentMeta.style}
                    >
                      {sentimentMeta.label}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {entry.sentiment.rationale}
                    </span>
                  </div>
                )}
                {entry.relatedNodeId && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{
                      background: 'var(--accent-pink)',
                      boxShadow: '0 0 4px rgba(236, 72, 153, 0.5)',
                    }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Linked to idea
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'rgba(168, 85, 247, 0.12)' }}>
        <input
          value={activeSpeaker}
          onChange={(event) => setSpeaker(event.target.value)}
          list="speaker-roster-options"
          placeholder="Speaker"
          className="w-full rounded-lg px-3 py-2 text-xs bg-transparent border outline-none"
          style={{
            borderColor: 'rgba(168, 85, 247, 0.2)',
            color: 'var(--text-primary)',
          }}
        />
        <datalist id="speaker-roster-options">
          {speakerProfiles.map((profile) => (
            <option key={profile.id} value={profile.name} />
          ))}
        </datalist>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a thought or paste transcript text..."
          className="w-full rounded-lg px-3 py-2 text-xs bg-transparent border outline-none resize-none"
          style={{
            height: `${composerHeight}px`,
            borderColor: 'rgba(168, 85, 247, 0.2)',
            color: 'var(--text-primary)',
          }}
        />
        <div
          onMouseDown={handleComposerResizeStart}
          className="flex items-center justify-center py-1 cursor-row-resize select-none"
          aria-label="Resize transcript entry composer"
          role="separator"
        >
          <div
            className="h-1.5 w-12 rounded-full transition-all"
            style={{
              background: 'rgba(168, 85, 247, 0.18)',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.1)',
            }}
          />
        </div>
        <button
          onClick={submitEntry}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bio-glow-hover"
          style={{
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            color: 'var(--accent-lavender)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Transcript Entry
        </button>
      </div>
    </div>
  );
}
