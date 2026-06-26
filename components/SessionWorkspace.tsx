'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { TopBar } from '@/components/TopBar';
import { BottomControls } from '@/components/BottomControls';
import { FloatingOrbs } from '@/components/NeuralBackground';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { NodeDetailPanel } from '@/components/NodeDetailPanel';
import { NeuralGraph } from '@/components/NeuralGraph';
import { materializeAnalysis } from '@/lib/analysis';
import { useWorkspace } from '@/lib/use-workspace';
import {
  createEdge,
  createChallengeNodeFromInsight,
  createEmptyNode,
  createIdeaNodeFromDraft,
  createTranscriptEntry,
  findOpenNodePosition,
  updateWorkspaceSession,
} from '@/lib/workspace-store';
import { type GraphEdge, type GraphNode, type SpeakerProfile } from '@/types';

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function audioBufferToWav(audioBuffer: AudioBuffer) {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = audioBuffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = Array.from({ length: channelCount }, (_, index) => audioBuffer.getChannelData(index));
  let offset = 44;

  for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channelIndex][sampleIndex] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

async function convertAudioBlobToWav(blob: Blob) {
  if (blob.type === 'audio/wav') {
    return blob;
  }

  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error('AudioContext is not available in this browser.');
  }

  const audioContext = new AudioContextCtor();
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    return audioBufferToWav(decoded);
  } finally {
    await audioContext.close();
  }
}

export function SessionWorkspace({ projectId }: { projectId?: string | null }) {
  const NEW_NODE_HIGHLIGHT_MS = 5000;
  const MIN_TRANSCRIPT_PANEL_WIDTH = 320;
  const MAX_TRANSCRIPT_PANEL_WIDTH = 720;
  const MIN_DETAIL_PANEL_WIDTH = 288;
  const MAX_DETAIL_PANEL_WIDTH = 640;
  const MIN_GRAPH_WIDTH = 360;
  const HISTORY_LIMIT = 50;
  const { workspace, isReady, updateWorkspace } = useWorkspace();
  const project = workspace.projects.find((item) => item.id === projectId) ?? workspace.projects[0];
  const session = workspace.sessions.find((item) => item.id === project?.activeSessionId);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isClassifyingSpeakers, setIsClassifyingSpeakers] = useState(false);
  const [enrollingSpeakerId, setEnrollingSpeakerId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('Click "Start Recording" to begin live transcription.');
  const [speakerStatusText, setSpeakerStatusText] = useState('Add teammates, then run speaker detection after recording.');
  const [speakerStatusSessionId, setSpeakerStatusSessionId] = useState<string | null>(null);
  const [transcriptPanelWidth, setTranscriptPanelWidth] = useState(320);
  const [detailPanelWidth, setDetailPanelWidth] = useState(320);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);
  const [capturedAudioSessionId, setCapturedAudioSessionId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const enrollmentRecorderRef = useRef<MediaRecorder | null>(null);
  const enrollmentStreamRef = useRef<MediaStream | null>(null);
  const enrollmentChunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioOffsetMsRef = useRef(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const clearHighlightTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const autoAssignTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoAssigningRef = useRef(false);
  const sessionShellRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Array<{ nodes: GraphNode[]; edges: GraphEdge[]; selectedNodeId: string | null }>>([]);
  const speechSupported = useSyncExternalStore(
    () => () => {},
    () => Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition),
    () => false
  );

  const handleSelectNode = useCallback((nodeId: string | null) => {
    if (nodeId) {
      setIsDetailPanelOpen(true);
    }
    setSelectedNodeId(nodeId);
  }, []);

  const updateSession = useCallback(
    (updater: Parameters<typeof updateWorkspaceSession>[2]) => {
      if (!session) {
        return;
      }

      updateWorkspace((current) => updateWorkspaceSession(current, session.id, updater));
    },
    [session, updateWorkspace]
  );

  const setSpeakerStatus = useCallback(
    (message: string) => {
      setSpeakerStatusText(message);
      setSpeakerStatusSessionId(session?.id ?? null);
    },
    [session?.id]
  );

  const updateGraphSession = useCallback(
    (updater: (session: typeof session) => typeof session) => {
      if (!session) {
        return;
      }

      updateWorkspace((current) => {
        const activeSession = current.sessions.find((item) => item.id === session.id);
        if (!activeSession) {
          return current;
        }

        historyRef.current = [
          ...historyRef.current.slice(-(HISTORY_LIMIT - 1)),
          {
            nodes: activeSession.nodes,
            edges: activeSession.edges,
            selectedNodeId,
          },
        ];

        return updateWorkspaceSession(current, session.id, (currentSession) => updater(currentSession));
      });
    },
    [session, selectedNodeId, updateWorkspace]
  );

  const evaluateEntryForNode = useCallback(
    async (entry: ReturnType<typeof createTranscriptEntry>) => {
      if (!session) {
        return;
      }

      try {
        const response = await fetch('/api/evaluate-idea', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entry,
            sessionTitle: session.title,
            existingNodes: session.nodes.map((node) => ({
              id: node.id,
              title: node.title,
              summary: node.summary,
              type: node.type,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Idea evaluation failed.');
        }

        const evaluation = await response.json();
        const sentiment = evaluation.sentiment;
        if (!evaluation.shouldCreateNode || !evaluation.node) {
          updateSession((currentSession) => ({
            ...currentSession,
            transcript: currentSession.transcript.map((item) =>
              item.id === entry.id ? { ...item, sentiment } : item
            ),
          }));
          setRecordingStatus(
            sentiment?.label === 'supporting'
              ? `Support detected, but no standalone node yet: ${evaluation.reason}`
              : `Idea heard. No node created yet: ${evaluation.reason}`
          );
          return;
        }

        updateSession((currentSession) => {
          const linkedSourceNode =
            evaluation.link?.nodeId
              ? currentSession.nodes.find((existingNode) => existingNode.id === evaluation.link?.nodeId) ?? null
              : null;
          const node = createIdeaNodeFromDraft(
            {
              title: evaluation.node.title,
              summary: evaluation.node.summary,
              type: evaluation.node.type,
              suggestedBy: entry.speaker,
              position: findOpenNodePosition(
                currentSession.nodes,
                linkedSourceNode?.position,
                evaluation.link?.relation === 'questions'
                  ? 'left'
                  : evaluation.link?.relation === 'addresses-risk'
                    ? 'top'
                    : 'right'
              ),
              relatedTopics: evaluation.node.relatedTopics,
              keyInsights: evaluation.node.keyInsights,
              transcriptEntryIds: evaluation.node.transcriptEntryIds ?? [entry.id],
            },
            currentSession.nodes.length + 1
          );
          const shouldLink = Boolean(
            evaluation.link?.nodeId &&
              currentSession.nodes.some((existingNode) => existingNode.id === evaluation.link.nodeId)
          );

          return {
            ...currentSession,
            nodes: [...currentSession.nodes, node],
            edges: shouldLink
              ? [...currentSession.edges, createEdge(evaluation.link.nodeId, node.id, evaluation.link.relation)]
              : currentSession.edges,
            transcript: currentSession.transcript.map((item) =>
              item.id === entry.id ? { ...item, relatedNodeId: node.id, sentiment } : item
            ),
          };
        });

        setRecordingStatus(
          sentiment?.label === 'supporting'
            ? `Strong support detected. Created a ${evaluation.node.type} node: ${evaluation.node.title}${evaluation.link?.nodeId ? ' and linked it to a related idea.' : '.'}`
            : `Strong idea detected. Created a ${evaluation.node.type} node: ${evaluation.node.title}${evaluation.link?.nodeId ? ' and linked it to a related idea.' : '.'}`
        );
      } catch {
        setRecordingStatus('Idea was transcribed, but AI evaluation failed before node creation.');
      }
    },
    [session, updateSession]
  );

  const updateSpeakerProfiles = useCallback(
    (profiles: SpeakerProfile[]) => {
      updateSession((currentSession) => ({
        ...currentSession,
        speakerProfiles: profiles,
      }));
    },
    [updateSession]
  );

  const getCurrentCapturedAudioBlob = useCallback(() => {
    if (audioChunksRef.current.length > 0) {
      return new Blob(audioChunksRef.current, {
        type:
          mediaRecorderRef.current?.mimeType ??
          audioBlobRef.current?.type ??
          'audio/webm',
      });
    }

    return audioBlobRef.current;
  }, []);

  const applySpeakerAssignments = useCallback(
    (
      assignments: Array<{
        entryId: string;
        speakerId: string;
        speakerName: string;
        confidence?: 'high' | 'medium' | 'low';
      }>
    ) => {
      const assignmentMap = new Map(assignments.map((assignment) => [assignment.entryId, assignment]));
      const orderedAssignments = [...assignments];

      updateSession((currentSession) => ({
        ...currentSession,
        transcript: currentSession.transcript.map((entry, index) => {
          const assignment = assignmentMap.get(entry.id);
          const fallbackAssignment =
            !assignment && entry.speaker === 'Unassigned'
                ? orderedAssignments[index] ?? null
                : null;
          const resolvedAssignment = assignment ?? fallbackAssignment;
          if (!resolvedAssignment) {
            return entry;
          }

          return {
            ...entry,
            speaker: resolvedAssignment.speakerName,
            speakerId: resolvedAssignment.speakerId,
            speakerConfidence: resolvedAssignment.confidence ?? 'medium',
          };
        }),
        nodes: currentSession.nodes.map((node) => {
          const transcriptEntryIds = node.data?.transcriptEntryIds ?? [];
          const matchedAssignments = transcriptEntryIds
            .map((entryId) => assignmentMap.get(entryId))
            .filter((assignment): assignment is NonNullable<typeof assignment> => Boolean(assignment));

          if (matchedAssignments.length === 0) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              suggestedBy: matchedAssignments[0].speakerName,
            },
          };
        }),
      }));
    },
    [updateSession]
  );

  const requestSpeakerAssignments = useCallback(
    async (
      transcriptEntries: ReturnType<typeof createTranscriptEntry>[],
      options?: {
        silent?: boolean;
      }
    ) => {
      if (!session) {
        return [];
      }

      const diarizableEntries = transcriptEntries.filter((entry) => typeof entry.offsetMs === 'number');
      const audioBlob = getCurrentCapturedAudioBlob();

      if (!audioBlob || diarizableEntries.length === 0) {
        return [];
      }

      try {
        const wavBlob = await convertAudioBlobToWav(audioBlob);
        const base64Audio = await blobToBase64(wavBlob);
        const response = await fetch('/api/diarize-speakers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: wavBlob.type || 'audio/wav',
            transcriptEntries: diarizableEntries,
            speakerProfiles: session.speakerProfiles ?? [],
          }),
        });

        if (!response.ok) {
          throw new Error('Speaker diarization request failed.');
        }

        const result = (await response.json()) as {
          source: 'external' | 'fallback';
          assignments?: Array<{
            entryId: string;
            speakerId: string;
            speakerName: string;
            confidence?: 'high' | 'medium' | 'low';
          }>;
        };

        const assignments = result.assignments ?? [];
        if (assignments.length > 0) {
          applySpeakerAssignments(assignments);
          if (!options?.silent) {
            setSpeakerStatus(
              result.source === 'external'
                ? 'Speaker detection finished and reassigned transcript names.'
                : 'Speaker labels were assigned with the local fallback mapper. Unmatched voices are marked Anonymous.'
            );
          }
        }

        return assignments;
      } catch {
        if (!options?.silent) {
          setSpeakerStatus('Speaker detection failed. Check the diarization service configuration and try again.');
        }
        return [];
      }
    },
    [applySpeakerAssignments, getCurrentCapturedAudioBlob, session, setSpeakerStatus]
  );

  const enrollSpeaker = useCallback(
    async (speakerProfile: SpeakerProfile) => {
      if (isRecording || isClassifyingSpeakers) {
        setSpeakerStatus('Stop live recording and wait for speaker detection to finish before enrolling a voice sample.');
        return;
      }

      if (enrollingSpeakerId === speakerProfile.id) {
        enrollmentRecorderRef.current?.stop();
        return;
      }

      if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
        setSpeakerStatus('This browser cannot record a voice enrollment sample.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        enrollmentStreamRef.current = stream;
        enrollmentChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        enrollmentRecorderRef.current = recorder;
        setEnrollingSpeakerId(speakerProfile.id);
        setSpeakerStatus(`Recording a short voice sample for ${speakerProfile.name}. Speak for about 5 seconds, then press Stop.`);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            enrollmentChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(enrollmentChunksRef.current, { type: mimeType });
          enrollmentChunksRef.current = [];
          enrollmentRecorderRef.current = null;
          enrollmentStreamRef.current?.getTracks().forEach((track) => track.stop());
          enrollmentStreamRef.current = null;
          setEnrollingSpeakerId(null);

          if (blob.size === 0) {
            setSpeakerStatus(`No enrollment audio was captured for ${speakerProfile.name}.`);
            return;
          }

          try {
            const wavBlob = await convertAudioBlobToWav(blob);
            const response = await fetch('/api/enroll-speaker', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                speaker: speakerProfile,
                audioBase64: await blobToBase64(wavBlob),
                mimeType: wavBlob.type || 'audio/wav',
              }),
            });

            if (!response.ok) {
              throw new Error('Enrollment request failed.');
            }

            const result = (await response.json()) as { speaker?: SpeakerProfile };
            if (!result.speaker) {
              throw new Error('Enrollment did not return an updated speaker profile.');
            }

            updateSession((currentSession) => ({
              ...currentSession,
              speakerProfiles: (currentSession.speakerProfiles ?? []).map((profile) =>
                profile.id === result.speaker?.id ? result.speaker : profile
              ),
            }));

            setSpeakerStatus(
              `Voice enrolled for ${result.speaker.name}. Samples saved: ${result.speaker.enrolledSampleCount ?? 1}.`
            );
          } catch {
            setSpeakerStatus(`Voice enrollment failed for ${speakerProfile.name}. Check the speaker service and try again.`);
          }
        };

        recorder.start();
        window.setTimeout(() => {
          if (enrollmentRecorderRef.current === recorder && recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, 5000);
      } catch {
        setEnrollingSpeakerId(null);
        setSpeakerStatus(`Could not access the microphone for ${speakerProfile.name}'s enrollment sample.`);
      }
    },
    [enrollingSpeakerId, isClassifyingSpeakers, isRecording, setSpeakerStatus, updateSession]
  );

  const addTranscriptEntry = useCallback(
    (text: string, speaker: string, speakerId?: string) => {
      const offsetMs =
        recordingStartedAtRef.current !== null
          ? audioOffsetMsRef.current + (Date.now() - recordingStartedAtRef.current)
          : undefined;
      const entry = createTranscriptEntry(text, speaker, {
        speakerId,
        recordedAt: new Date().toISOString(),
        offsetMs,
      });
      updateSession((currentSession) => ({
        ...currentSession,
        transcript: [...currentSession.transcript, entry],
        consentGiven: true,
      }));
      if (offsetMs !== undefined) {
        void requestSpeakerAssignments([...(session?.transcript ?? []), entry], { silent: true });
      }
      void evaluateEntryForNode(entry);
    },
    [evaluateEntryForNode, requestSpeakerAssignments, session?.transcript, updateSession]
  );

  const classifySpeakers = useCallback(async () => {
    if (!session) {
      return;
    }

    const diarizableEntries = session.transcript.filter((entry) => typeof entry.offsetMs === 'number');
    if (!getCurrentCapturedAudioBlob() || diarizableEntries.length === 0) {
      setSpeakerStatus('Record a bit of audio first so speaker detection has something to analyze.');
      return;
    }

    setIsClassifyingSpeakers(true);
    setSpeakerStatus('Analyzing the captured meeting audio for speaker turns...');

    try {
      const assignments = await requestSpeakerAssignments(session.transcript);
      if (assignments.length === 0) {
        setSpeakerStatus('No speaker assignments came back. Try recording longer turns with clearer pauses.');
      }
    } catch {
      setSpeakerStatus('Speaker detection failed. Check the diarization service configuration and try again.');
    } finally {
      setIsClassifyingSpeakers(false);
    }
  }, [getCurrentCapturedAudioBlob, requestSpeakerAssignments, session, setSpeakerStatus]);

  const toggleRecording = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const canRecordAudio = typeof window !== 'undefined' && 'MediaRecorder' in window;

    if (!SpeechRecognitionCtor) {
      setStatusMessage('Web Speech API is not available in this browser.');
      setRecordingStatus('This browser does not expose the Web Speech API. Try Chrome or Edge over HTTPS or localhost.');
      return;
    }

    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setIsRecording(false);
      setInterimTranscript('');
      setRecordingStatus('Recording stopped. Your finalized transcript entries stay in the list below.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecordingStatus(
        canRecordAudio
          ? 'Microphone active. Start speaking and watch the live capture box update.'
          : 'Microphone active for transcription, but browser audio recording is unavailable for speaker detection.'
      );
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalizedCount = 0;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) {
          continue;
        }

          if (result.isFinal) {
          addTranscriptEntry(transcript, 'Unassigned');
            finalizedCount += 1;
          } else {
          interim = transcript;
        }
      }

      setInterimTranscript(interim);
      if (finalizedCount > 0) {
        setRecordingStatus(`Captured ${finalizedCount} finalized phrase${finalizedCount === 1 ? '' : 's'}. Evaluating for node creation...`);
      } else if (interim) {
        setRecordingStatus('Hearing your voice. Waiting for the phrase to finalize...');
      }
    };

    recognition.onerror = (event) => {
      setStatusMessage(`Recording error: ${event.error}`);
      setIsRecording(false);
      setInterimTranscript('');
      setRecordingStatus(`Recording error: ${event.error}. If microphone permission was blocked, allow it and try again.`);
    };

    recognition.onend = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setInterimTranscript('');
      recognitionRef.current = null;
      setRecordingStatus('Microphone idle. If you stopped speaking for a while, press Start Recording again to resume.');
    };

    const startRecognition = () => {
      recognition.start();
      recognitionRef.current = recognition;
      recordingStartedAtRef.current = Date.now();
      setStatusMessage('Recording started.');
      setIsRecording(true);
    };

    if (!canRecordAudio || !navigator.mediaDevices?.getUserMedia) {
      startRecognition();
      setSpeakerStatus('This browser can transcribe speech, but it cannot capture raw audio for speaker detection.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const durationMs =
            recordingStartedAtRef.current !== null ? Date.now() - recordingStartedAtRef.current : 0;
          audioOffsetMsRef.current += Math.max(0, durationMs);
          recordingStartedAtRef.current = null;

          if (audioChunksRef.current.length > 0) {
            audioBlobRef.current = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || 'audio/webm',
            });
            setCapturedAudioSessionId(session?.id ?? null);
            setSpeakerStatus('Recording captured. You can now run speaker detection to relabel transcript entries.');
          }

          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        startRecognition();
      })
      .catch(() => {
        setStatusMessage('Microphone permission was blocked.');
        setRecordingStatus('Microphone access is required for live transcription.');
        setSpeakerStatus('Audio capture was blocked, so speaker detection cannot run yet.');
      });
  }, [addTranscriptEntry, isRecording, session?.id, setSpeakerStatus]);

  const addThought = useCallback(() => {
    updateGraphSession((currentSession) => ({
      ...currentSession,
      nodes: [...currentSession.nodes, createEmptyNode(currentSession.nodes.length + 1)],
    }));
  }, [updateGraphSession]);

  const updateNodes = useCallback(
    (nodes: GraphNode[]) => {
      updateGraphSession((currentSession) => ({
        ...currentSession,
        nodes,
      }));
    },
    [updateGraphSession]
  );

  const updateEdges = useCallback(
    (edges: GraphEdge[]) => {
      updateGraphSession((currentSession) => ({
        ...currentSession,
        edges,
      }));
    },
    [updateGraphSession]
  );

  const updateNode = useCallback(
    (nodeId: string, patch: Partial<GraphNode>) => {
      updateGraphSession((currentSession) => ({
        ...currentSession,
        nodes: currentSession.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
      }));
    },
    [updateGraphSession]
  );

  const createChallengeNode = useCallback(
    (input: {
      title: string;
      summary: string;
      type: GraphNode['type'];
      relationToSource: 'questions' | 'addresses-risk' | 'extends';
    }) => {
      if (!selectedNodeId) {
        return;
      }

      updateGraphSession((currentSession) => {
        const sourceNode = currentSession.nodes.find((node) => node.id === selectedNodeId);
        if (!sourceNode) {
          return currentSession;
        }

        const newNode = createChallengeNodeFromInsight(
          {
            title: input.title,
            summary: input.summary,
            type: input.type,
            position: findOpenNodePosition(
              currentSession.nodes,
              sourceNode.position,
              input.relationToSource === 'extends'
                ? 'right'
                : input.relationToSource === 'questions'
                  ? 'left'
                  : 'top'
            ),
            relatedTopics: sourceNode.data?.details?.relatedTopics ?? [],
            keyInsights: [
              `Created while pressure-testing "${sourceNode.title}".`,
              input.summary,
            ],
            transcriptEntryIds: sourceNode.data?.transcriptEntryIds,
          },
          currentSession.nodes.length + 1
        );

        const edge =
          input.relationToSource === 'extends'
            ? createEdge(sourceNode.id, newNode.id, 'extends')
            : input.relationToSource === 'questions'
              ? createEdge(newNode.id, sourceNode.id, 'questions')
              : createEdge(newNode.id, sourceNode.id, 'addresses-risk');

        return {
          ...currentSession,
          nodes: [...currentSession.nodes, newNode],
          edges: [...currentSession.edges, edge],
        };
      });

      setStatusMessage(`Saved a new ${input.type} node from the pressure test.`);
    },
    [selectedNodeId, updateGraphSession]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const timer = clearHighlightTimersRef.current[nodeId];
      if (timer) {
        clearTimeout(timer);
        delete clearHighlightTimersRef.current[nodeId];
      }

      updateGraphSession((currentSession) => ({
        ...currentSession,
        nodes: currentSession.nodes.filter((node) => node.id !== nodeId),
        edges: currentSession.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      }));
      handleSelectNode(null);
    },
    [handleSelectNode, updateGraphSession]
  );

  useEffect(() => {
    historyRef.current = [];
    audioChunksRef.current = [];
    audioBlobRef.current = null;
    audioOffsetMsRef.current = 0;
    recordingStartedAtRef.current = null;
    if (autoAssignTimeoutRef.current) {
      clearTimeout(autoAssignTimeoutRef.current);
      autoAssignTimeoutRef.current = null;
    }
    isAutoAssigningRef.current = false;
  }, [session?.id]);

  useEffect(() => {
    return () => {
      if (autoAssignTimeoutRef.current) {
        clearTimeout(autoAssignTimeoutRef.current);
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      enrollmentRecorderRef.current?.stop();
      enrollmentStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!session || isClassifyingSpeakers) {
      return;
    }

    const hasUnassignedEntries = session.transcript.some(
      (entry) => entry.speaker === 'Unassigned' && typeof entry.offsetMs === 'number'
    );

    if (!hasUnassignedEntries || !getCurrentCapturedAudioBlob()) {
      return;
    }

    if (autoAssignTimeoutRef.current) {
      clearTimeout(autoAssignTimeoutRef.current);
    }

    autoAssignTimeoutRef.current = setTimeout(() => {
      if (isAutoAssigningRef.current) {
        return;
      }

      isAutoAssigningRef.current = true;
      void requestSpeakerAssignments(session.transcript, { silent: true }).finally(() => {
        isAutoAssigningRef.current = false;
      });
    }, 900);

    return () => {
      if (autoAssignTimeoutRef.current) {
        clearTimeout(autoAssignTimeoutRef.current);
        autoAssignTimeoutRef.current = null;
      }
    };
  }, [getCurrentCapturedAudioBlob, isClassifyingSpeakers, requestSpeakerAssignments, session]);

  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (isTypingTarget || !session) {
        return;
      }

      const isUndoShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'z';

      if (!isUndoShortcut || historyRef.current.length === 0) {
        return;
      }

      event.preventDefault();
      const previousSnapshot = historyRef.current[historyRef.current.length - 1];
      historyRef.current = historyRef.current.slice(0, -1);

      updateWorkspace((current) =>
        updateWorkspaceSession(current, session.id, (currentSession) => ({
          ...currentSession,
          nodes: previousSnapshot.nodes,
          edges: previousSnapshot.edges,
        }))
      );
      handleSelectNode(previousSnapshot.selectedNodeId);
      setStatusMessage('Undid last graph change.');
    };

    window.addEventListener('keydown', handleUndo);
    return () => window.removeEventListener('keydown', handleUndo);
  }, [handleSelectNode, session, updateWorkspace]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const now = Date.now();
    const staleActiveNodeIds = session.nodes
      .filter((node) => node.isActive && node.createdAt && now - node.createdAt >= NEW_NODE_HIGHLIGHT_MS)
      .map((node) => node.id);

    if (staleActiveNodeIds.length > 0) {
      updateSession((currentSession) => ({
        ...currentSession,
        nodes: currentSession.nodes.map((node) =>
          staleActiveNodeIds.includes(node.id) ? { ...node, isActive: false } : node
        ),
      }));
    }

    session.nodes.forEach((node) => {
      if (!node.isActive || !node.createdAt || clearHighlightTimersRef.current[node.id]) {
        return;
      }

      const remaining = NEW_NODE_HIGHLIGHT_MS - (now - node.createdAt);
      if (remaining <= 0) {
        return;
      }

      clearHighlightTimersRef.current[node.id] = setTimeout(() => {
        delete clearHighlightTimersRef.current[node.id];
        updateSession((currentSession) => ({
          ...currentSession,
          nodes: currentSession.nodes.map((currentNode) =>
            currentNode.id === node.id ? { ...currentNode, isActive: false } : currentNode
          ),
        }));
      }, remaining);
    });

    return () => {
      Object.values(clearHighlightTimersRef.current).forEach((timer) => clearTimeout(timer));
      clearHighlightTimersRef.current = {};
    };
  }, [session, updateSession]);

  const handleDetailResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDetailPanelOpen) {
      return;
    }

    event.preventDefault();

    const shellRect = sessionShellRef.current?.getBoundingClientRect();
    const shellWidth = shellRect?.width ?? window.innerWidth;
    const dynamicMaxWidth = Math.min(MAX_DETAIL_PANEL_WIDTH, Math.max(MIN_DETAIL_PANEL_WIDTH, shellWidth * 0.45));

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(
        dynamicMaxWidth,
        Math.max(MIN_DETAIL_PANEL_WIDTH, window.innerWidth - moveEvent.clientX)
      );
      setDetailPanelWidth(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }, [isDetailPanelOpen]);

  const handleTranscriptResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const shellRect = sessionShellRef.current?.getBoundingClientRect();
    if (!shellRect) {
      return;
    }

    const reservedWidth = (isDetailPanelOpen ? detailPanelWidth : 0) + MIN_GRAPH_WIDTH;
    const dynamicMaxWidth = Math.min(
      MAX_TRANSCRIPT_PANEL_WIDTH,
      Math.max(MIN_TRANSCRIPT_PANEL_WIDTH, shellRect.width - reservedWidth)
    );

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(
        dynamicMaxWidth,
        Math.max(MIN_TRANSCRIPT_PANEL_WIDTH, moveEvent.clientX - shellRect.left)
      );
      setTranscriptPanelWidth(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }, [detailPanelWidth, isDetailPanelOpen]);

  const analyzeSession = useCallback(async () => {
    if (!session || session.transcript.length === 0) {
      setStatusMessage('Add transcript content before running analysis.');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('Analyzing transcript...');

    try {
      const response = await fetch('/api/analyze-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed.');
      }

      const analysis = await response.json();
      const result = materializeAnalysis(session, analysis);

      updateSession((currentSession) => ({
        ...currentSession,
        nodes: result.nodes,
        edges: result.edges,
        report: result.report,
      }));

      setStatusMessage(
        analysis.source === 'agnes'
          ? 'Transcript analyzed with Agnes.'
          : 'Transcript analyzed with fallback extraction.'
      );
    } catch {
      setStatusMessage('Analysis failed. Check your Agnes configuration or try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [session, updateSession]);

  if (!isReady || !project || !session) {
    return (
      <div className="h-screen flex items-center justify-center bg-cosmic text-brand">
        Loading workspace...
      </div>
    );
  }

  const selectedNode = session.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const activeSelectedNodeId = selectedNode?.id ?? null;
  const freshNodeCount = session.nodes.filter((node) => node.isActive).length;
  const speakerProfiles = session.speakerProfiles ?? [];
  const capturedAudioAvailable = capturedAudioSessionId === session.id;
  const speakerStatus =
    speakerStatusSessionId === session.id
      ? speakerStatusText
      : 'Add teammates, then run speaker detection after recording.';
  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-cosmic">
      <TopBar />
      <FloatingOrbs />

      <main className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2" style={{
          background: 'rgba(10, 8, 28, 0.6)',
          borderBottom: '1px solid rgba(168, 85, 247, 0.15)',
          backdropFilter: 'blur(20px)',
        }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full status-active" />
            <span className="text-xs font-medium text-muted">
              Session: {session.title}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
              background: session.consentGiven ? 'rgba(45,212,191,0.1)' : 'rgba(251,113,133,0.1)',
              color: session.consentGiven ? 'var(--accent-teal-green)' : 'var(--accent-coral)',
              border: `1px solid ${session.consentGiven ? 'rgba(45,212,191,0.2)' : 'rgba(251,113,133,0.2)'}`,
            }}>
              {session.consentGiven ? 'Consent captured' : 'Consent needed'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
              background: 'rgba(34,211,238,0.1)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(34,211,238,0.2)',
            }}>
              {session.nodes.length} nodes
            </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                background: 'rgba(251,113,133,0.1)',
                color: 'var(--accent-coral)',
                border: '1px solid rgba(251,113,133,0.2)',
              }}>
                {freshNodeCount} new
              </span>
          </div>
        </div>
        {statusMessage && (
          <div className="px-4 py-2 text-xs" style={{
            color: 'var(--accent-lavender)',
            borderBottom: '1px solid rgba(168, 85, 247, 0.08)',
            background: 'rgba(16, 10, 35, 0.35)',
          }}>
            {statusMessage}
          </div>
        )}

        <div ref={sessionShellRef} className="flex-1 flex overflow-hidden min-h-0" style={{ minHeight: 0 }}>
          <div
            className="flex-shrink-0 border-r h-full min-h-0 flex overflow-hidden"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.1)',
              width: `${transcriptPanelWidth}px`,
            }}
          >
            <TranscriptPanel
              entries={session.transcript}
              interimTranscript={interimTranscript}
              isRecording={isRecording}
              onAddEntry={addTranscriptEntry}
              speakerProfiles={speakerProfiles}
              onUpdateSpeakerProfiles={updateSpeakerProfiles}
              onEnrollSpeaker={enrollSpeaker}
              enrollingSpeakerId={enrollingSpeakerId}
              onClassifySpeakers={classifySpeakers}
              isClassifyingSpeakers={isClassifyingSpeakers}
              hasCapturedAudio={capturedAudioAvailable}
              speakerStatus={speakerStatus}
              recordingStatus={recordingStatus}
              speechSupported={speechSupported}
            />
          </div>

          <div
            onMouseDown={handleTranscriptResizeStart}
            className="w-2 flex-shrink-0 cursor-col-resize relative group"
            style={{
              background: 'transparent',
            }}
            aria-label="Resize transcript panel"
            role="separator"
          >
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-all"
              style={{
                background: 'rgba(168, 85, 247, 0.14)',
                boxShadow: '0 0 0 rgba(192, 132, 252, 0)',
              }}
            />
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              style={{
                background: 'rgba(192, 132, 252, 0.18)',
                boxShadow: '0 0 14px rgba(192, 132, 252, 0.2)',
              }}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 p-2" style={{ minHeight: 0 }}>
              <NeuralGraph
                edges={session.edges}
                nodes={session.nodes}
                onSelectNode={handleSelectNode}
                onUpdateEdges={updateEdges}
                onUpdateNodes={updateNodes}
                selectedNodeId={activeSelectedNodeId}
              />
            </div>
          </div>

          {isDetailPanelOpen ? (
            <>
              <div
                onMouseDown={handleDetailResizeStart}
                className="w-2 flex-shrink-0 cursor-col-resize relative group"
                style={{
                  background: 'transparent',
                }}
                aria-label="Resize node details panel"
                role="separator"
              >
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-all"
                  style={{
                    background: 'rgba(168, 85, 247, 0.14)',
                    boxShadow: '0 0 0 rgba(192, 132, 252, 0)',
                  }}
                />
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  style={{
                    background: 'rgba(192, 132, 252, 0.18)',
                    boxShadow: '0 0 14px rgba(192, 132, 252, 0.2)',
                  }}
                />
              </div>

              <div
                className="flex-shrink-0 border-l h-full min-h-0 flex overflow-hidden"
                style={{
                  borderColor: 'rgba(168, 85, 247, 0.1)',
                  width: `${detailPanelWidth}px`,
                }}
              >
                <NodeDetailPanel
                  key={selectedNode?.id ?? 'empty-node-detail'}
                  node={selectedNode}
                  transcriptEntries={session.transcript}
                  onClose={() => {
                    handleSelectNode(null);
                    setIsDetailPanelOpen(false);
                  }}
                  onCreateChallengeNode={createChallengeNode}
                  onDeleteNode={deleteNode}
                  onUpdateNode={updateNode}
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsDetailPanelOpen(true)}
              className="h-full flex-shrink-0 px-2 border-l text-[11px] font-semibold tracking-[0.16em] uppercase transition-all"
              style={{
                borderColor: 'rgba(168, 85, 247, 0.1)',
                color: 'rgba(192, 132, 252, 0.7)',
                background: 'rgba(12, 9, 30, 0.48)',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
              }}
            >
              Node Details
            </button>
          )}
        </div>

        <BottomControls
          canAnalyze={session.transcript.length > 0}
          isAnalyzing={isAnalyzing}
          isRecording={isRecording}
          onAddThought={addThought}
          onAnalyze={analyzeSession}
          onToggleRecording={toggleRecording}
        />
      </main>
    </div>
  );
}
