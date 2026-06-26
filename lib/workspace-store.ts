import {
  type EdgeRelation,
  type NodeReactionCounts,
  type GraphEdge,
  type GraphNode,
  type NodeType,
  type Project,
  type SessionReport,
  type SpeakerProfile,
  type TranscriptEntry,
  type WorkspaceData,
  type WorkspaceProject,
  type WorkspaceSession,
} from '@/types';
import { mockEdges, mockNodes, mockProjects, mockReport, mockTranscripts } from '@/lib/mock-data';

export const WORKSPACE_STORAGE_KEY = 'second-brain-workspace-v1';
export const WORKSPACE_STORAGE_EVENT = 'second-brain-workspace-updated';
let cachedWorkspace: WorkspaceData | null = null;
let initialWorkspaceSnapshot: WorkspaceData | null = null;

const DEFAULT_SPEAKER_COLORS = ['#f472b6', '#22d3ee', '#facc15', '#34d399', '#a78bfa', '#fb7185'];

export function createEmptyReactions(): NodeReactionCounts {
  return {
    up: 0,
    neutral: 0,
    down: 0,
  };
}

function isPositionOpen(
  position: { x: number; y: number },
  nodes: GraphNode[],
  minimumDistance = 190
) {
  return nodes.every((node) => {
    const dx = node.position.x - position.x;
    const dy = node.position.y - position.y;
    return Math.hypot(dx, dy) >= minimumDistance;
  });
}

export function findOpenNodePosition(
  nodes: GraphNode[],
  anchorPosition?: { x: number; y: number },
  preferredDirection: 'right' | 'left' | 'top' | 'bottom' = 'right'
) {
  if (!anchorPosition) {
    const fallbackIndex = nodes.length + 1;
    return {
      x: 220 + (fallbackIndex % 3) * 220,
      y: 160 + Math.floor(fallbackIndex / 3) * 160,
    };
  }

  const directionalOffsets: Record<
    'right' | 'left' | 'top' | 'bottom',
    Array<{ x: number; y: number }>
  > = {
    right: [
      { x: 240, y: 0 },
      { x: 220, y: 150 },
      { x: 220, y: -150 },
      { x: 320, y: 0 },
      { x: 300, y: 180 },
      { x: 300, y: -180 },
    ],
    left: [
      { x: -240, y: 0 },
      { x: -220, y: 150 },
      { x: -220, y: -150 },
      { x: -320, y: 0 },
      { x: -300, y: 180 },
      { x: -300, y: -180 },
    ],
    top: [
      { x: 0, y: -180 },
      { x: 180, y: -150 },
      { x: -180, y: -150 },
      { x: 0, y: -280 },
      { x: 220, y: -220 },
      { x: -220, y: -220 },
    ],
    bottom: [
      { x: 0, y: 180 },
      { x: 180, y: 150 },
      { x: -180, y: 150 },
      { x: 0, y: 280 },
      { x: 220, y: 220 },
      { x: -220, y: 220 },
    ],
  };

  const fallbackOffsets = [
    { x: 180, y: 180 },
    { x: -180, y: 180 },
    { x: 180, y: -180 },
    { x: -180, y: -180 },
    { x: 360, y: 0 },
    { x: -360, y: 0 },
    { x: 0, y: 320 },
    { x: 0, y: -320 },
  ];

  const candidates = [...directionalOffsets[preferredDirection], ...fallbackOffsets].map((offset) => ({
    x: anchorPosition.x + offset.x,
    y: anchorPosition.y + offset.y,
  }));

  const openCandidate = candidates.find((candidate) => isPositionOpen(candidate, nodes));
  return openCandidate ?? candidates[0];
}

function createSeedSession(projectId: string): WorkspaceSession {
  return {
    id: mockReport.sessionId,
    projectId,
    title: mockReport.sessionTitle,
    status: 'active',
    startTime: mockReport.generatedAt,
    transcript: mockTranscripts,
    nodes: mockNodes,
    edges: mockEdges,
    consentGiven: true,
    speakerProfiles: [
      { id: 'speaker-live-mic', name: 'Unassigned', color: DEFAULT_SPEAKER_COLORS[0] },
    ],
    updatedAt: mockReport.generatedAt,
    report: {
      ...mockReport,
      source: 'fallback',
    },
  };
}

function createSeedProject(seed: Project, sessionId: string): WorkspaceProject {
  const now = new Date().toISOString();
  return {
    ...seed,
    sessionIds: [sessionId],
    activeSessionId: sessionId,
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialWorkspace(): WorkspaceData {
  const primaryProject = mockProjects[0];
  const seedSession = createSeedSession(primaryProject.id);

  return {
    version: 1,
    projects: [
      createSeedProject(primaryProject, seedSession.id),
      ...mockProjects.slice(1).map((project, index) => {
        const sessionId = `seed-session-${index + 2}`;
        return createSeedProject(project, sessionId);
      }),
    ],
    sessions: [
      seedSession,
      ...mockProjects.slice(1).map<WorkspaceSession>((project, index) => ({
        id: `seed-session-${index + 2}`,
        projectId: project.id,
        title: `${project.title} Working Session`,
        status: project.status === 'completed' ? 'ended' : 'paused',
        startTime: new Date().toISOString(),
        transcript: [],
        nodes: [],
        edges: [],
        consentGiven: false,
        speakerProfiles: [],
        updatedAt: new Date().toISOString(),
      })),
    ],
  };
}

export function getInitialWorkspaceSnapshot(): WorkspaceData {
  if (!initialWorkspaceSnapshot) {
    initialWorkspaceSnapshot = createInitialWorkspace();
  }

  return initialWorkspaceSnapshot;
}

export function loadWorkspace(): WorkspaceData {
  if (typeof window === 'undefined') {
    return cachedWorkspace ?? getInitialWorkspaceSnapshot();
  }

  if (cachedWorkspace) {
    return cachedWorkspace;
  }

  const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (!raw) {
    const initial = getInitialWorkspaceSnapshot();
    saveWorkspace(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as WorkspaceData;
    if (!parsed.version || !Array.isArray(parsed.projects) || !Array.isArray(parsed.sessions)) {
      throw new Error('Invalid workspace data');
    }
    cachedWorkspace = parsed;
    return parsed;
  } catch {
    const fallback = getInitialWorkspaceSnapshot();
    saveWorkspace(fallback);
    return fallback;
  }
}

export function saveWorkspace(workspace: WorkspaceData) {
  cachedWorkspace = workspace;

  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  window.dispatchEvent(new Event(WORKSPACE_STORAGE_EVENT));
}

export function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Recently active';
  }
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function computeProjectProgress(session: WorkspaceSession) {
  const totalSignals = session.nodes.length + session.transcript.length;
  if (totalSignals === 0) {
    return 0;
  }

  const actionWeight = session.nodes.filter((node) => node.type === 'action' || node.type === 'decision').length;
  return Math.min(100, Math.round((actionWeight / totalSignals) * 100 + Math.min(session.transcript.length * 4, 35)));
}

export function syncProjectFromSession(project: WorkspaceProject, session: WorkspaceSession): WorkspaceProject {
  return {
    ...project,
    activeSessionId: session.id,
    nodeCount: session.nodes.length,
    progress: computeProjectProgress(session),
    lastActive: session.updatedAt,
    status: session.status === 'ended' ? 'completed' : 'active',
    updatedAt: session.updatedAt,
  };
}

export function createProject(title: string): { workspace: WorkspaceData; projectId: string } {
  const workspace = loadWorkspace();
  const now = new Date().toISOString();
  const projectId = `project-${Date.now()}`;
  const sessionId = `session-${Date.now()}`;

  const session: WorkspaceSession = {
    id: sessionId,
    projectId,
    title: `${title} Session`,
    status: 'active',
    startTime: now,
    transcript: [],
    nodes: [],
    edges: [],
    consentGiven: false,
    speakerProfiles: [],
    updatedAt: now,
  };

  const project: WorkspaceProject = {
    id: projectId,
    title,
    description: 'New idea-mapping workspace.',
    progress: 0,
    status: 'active',
    nodeCount: 0,
    lastActive: now,
    color: '#8b5cf6',
    sessionIds: [sessionId],
    activeSessionId: sessionId,
    createdAt: now,
    updatedAt: now,
  };

  const nextWorkspace = {
    ...workspace,
    projects: [project, ...workspace.projects],
    sessions: [session, ...workspace.sessions],
  };
  saveWorkspace(nextWorkspace);

  return { workspace: nextWorkspace, projectId };
}

export function updateWorkspaceSession(
  workspace: WorkspaceData,
  sessionId: string,
  updater: (session: WorkspaceSession) => WorkspaceSession
) {
  const sessions = workspace.sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    const updated = updater(session);
    return {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
  });

  const session = sessions.find((item) => item.id === sessionId);
  if (!session) {
    return workspace;
  }

  const projects = workspace.projects.map((project) =>
    project.id === session.projectId ? syncProjectFromSession(project, session) : project
  );

  return {
    ...workspace,
    sessions,
    projects,
  };
}

export function buildSessionReport(session: WorkspaceSession, report: SessionReport): WorkspaceSession {
  return {
    ...session,
    report,
    nodes: session.nodes,
    edges: session.edges,
  };
}

export function createSpeakerProfile(name: string, index: number): SpeakerProfile {
  return {
    id: `speaker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    color: DEFAULT_SPEAKER_COLORS[index % DEFAULT_SPEAKER_COLORS.length],
    voiceEnrolled: false,
    enrolledSampleCount: 0,
  };
}

export function createTranscriptEntry(
  text: string,
  speaker = 'You',
  metadata?: {
    speakerId?: string;
    recordedAt?: string;
    offsetMs?: number;
    speakerConfidence?: 'high' | 'medium' | 'low';
  }
): TranscriptEntry {
  return {
    id: `transcript-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    speaker,
    speakerId: metadata?.speakerId,
    text,
    timestamp: new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    }),
    recordedAt: metadata?.recordedAt,
    offsetMs: metadata?.offsetMs,
    speakerConfidence: metadata?.speakerConfidence,
  };
}

export function createEmptyNode(index: number): GraphNode {
  const createdAt = Date.now();
  return {
    id: `node-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'idea',
    title: `New Thought ${index}`,
    summary: 'Capture the core thought here.',
    position: {
      x: 220 + (index % 3) * 220,
      y: 160 + Math.floor(index / 3) * 160,
    },
    isActive: true,
    createdAt,
    data: {
      details: {
        relatedTopics: [],
        keyInsights: ['Add details or run AI analysis to enrich this node.'],
        metrics: [{ label: 'Status', value: 'Draft' }],
      },
      reactions: createEmptyReactions(),
      comments: [],
    },
  };
}

export function createIdeaNodeFromDraft(input: {
  title: string;
  summary: string;
  type: NodeType;
  suggestedBy?: string;
  position?: { x: number; y: number };
  relatedTopics?: string[];
  keyInsights?: string[];
  transcriptEntryIds?: string[];
}, index: number): GraphNode {
  const createdAt = Date.now();
  return {
    id: `node-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    type: input.type,
    title: input.title,
    summary: input.summary,
    position:
      input.position ?? {
        x: 220 + (index % 3) * 220,
        y: 160 + Math.floor(index / 3) * 160,
      },
    isActive: true,
    createdAt,
    data: {
      suggestedBy: input.suggestedBy ?? 'Agnes AI',
      details: {
        relatedTopics: input.relatedTopics ?? [],
        keyInsights: input.keyInsights ?? ['AI promoted this transcript idea into a node.'],
        metrics: [{ label: 'Source', value: 'Live evaluation' }],
      },
      transcriptEntryIds: input.transcriptEntryIds,
      aiCreated: true,
      reactions: createEmptyReactions(),
      comments: [],
    },
  };
}

export function createChallengeNodeFromInsight(input: {
  title: string;
  summary: string;
  type: NodeType;
  position?: { x: number; y: number };
  relatedTopics?: string[];
  keyInsights?: string[];
  transcriptEntryIds?: string[];
}, index: number): GraphNode {
  const createdAt = Date.now();
  return {
    id: `node-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    type: input.type,
    title: input.title,
    summary: input.summary,
    position:
      input.position ?? {
        x: 220 + (index % 3) * 220,
        y: 160 + Math.floor(index / 3) * 160,
      },
    isActive: true,
    createdAt,
    data: {
      suggestedBy: 'Challenge Mode',
      details: {
        relatedTopics: input.relatedTopics ?? [],
        keyInsights: input.keyInsights ?? ['Saved from a pressure-test response.'],
        metrics: [{ label: 'Source', value: 'Pressure test' }],
      },
      transcriptEntryIds: input.transcriptEntryIds,
      aiCreated: true,
      reactions: createEmptyReactions(),
      comments: [],
    },
  };
}

export function createEdge(source: string, target: string, relation?: EdgeRelation): GraphEdge {
  return {
    id: `edge-${source}-${target}-${Math.random().toString(36).slice(2, 7)}`,
    source,
    target,
    type: 'active',
    relation,
    label: relation ? relation.replace('-', ' ') : undefined,
  };
}
