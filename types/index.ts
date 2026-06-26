// Neural graph node types
export type NodeType = 'idea' | 'action' | 'risk' | 'decision' | 'question';

export interface NodeMetric {
  label: string;
  value: string;
}

export interface NodeDetails {
  relatedTopics: string[];
  keyInsights: string[];
  metrics: NodeMetric[];
}

export type TranscriptSentimentLabel = 'supporting' | 'questioning' | 'neutral';

export interface TranscriptSentimentAnalysis {
  label: TranscriptSentimentLabel;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  color?: string;
  voiceEnrolled?: boolean;
  enrolledSampleCount?: number;
  lastEnrolledAt?: string;
}

export type NodeReactionKind = 'up' | 'neutral' | 'down';

export interface NodeReactionCounts {
  up: number;
  neutral: number;
  down: number;
}

export interface NodeComment {
  id: string;
  text: string;
  createdAt: number;
  merged?: boolean;
  mergedFromTitle?: string;
}

export interface GraphNodeData {
  suggestedBy?: string;
  details?: NodeDetails;
  transcriptEntryIds?: string[];
  aiCreated?: boolean;
  reactions?: NodeReactionCounts;
  comments?: NodeComment[];
}

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  summary: string;
  position: { x: number; y: number };
  isActive?: boolean;
  createdAt?: number;
  data?: GraphNodeData;
}

export type EdgeRelation = 'extends' | 'supports' | 'questions' | 'addresses-risk';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: 'synapse' | 'active' | 'inactive';
  label?: string;
  relation?: EdgeRelation;
}

// Transcript entry
export interface TranscriptEntry {
  id: string;
  speaker: string;
  speakerId?: string;
  text: string;
  timestamp: string;
  recordedAt?: string;
  offsetMs?: number;
  speakerConfidence?: 'high' | 'medium' | 'low';
  relatedNodeId?: string;
  sentiment?: TranscriptSentimentAnalysis;
}

// Session data
export interface SessionData {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'ended';
  startTime: string;
  transcript: TranscriptEntry[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Project data
export interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'active' | 'completed' | 'archived';
  nodeCount: number;
  lastActive: string;
  color?: string;
}

// Challenge data
export interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  completed: boolean;
  type: 'brainstorm' | 'assumption' | 'connection' | 'synthesis' | 'risk';
}

// Report data
export interface ReportData {
  sessionId: string;
  sessionTitle: string;
  generatedAt: string;
  totalNodes: number;
  totalTranscripts: number;
  keyDecisions: number;
  actionItems: number;
  risks: number;
  questions: number;
  ideas: number;
  summary: string;
  nextSteps: string[];
}

export interface SessionReport extends ReportData {
  source: 'agnes' | 'fallback';
}

export interface WorkspaceSession extends SessionData {
  projectId: string;
  consentGiven: boolean;
  speakerProfiles?: SpeakerProfile[];
  updatedAt: string;
  report?: SessionReport;
}

export interface WorkspaceProject extends Project {
  sessionIds: string[];
  activeSessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceData {
  version: number;
  projects: WorkspaceProject[];
  sessions: WorkspaceSession[];
}

// Node type colors for display
export const NODE_TYPE_COLORS: Record<NodeType, { bg: string; border: string; text: string; glow: string }> = {
  idea: { bg: 'rgba(0, 229, 255, 0.1)', border: '#00e5ff', text: '#00e5ff', glow: 'rgba(0, 229, 255, 0.4)' },
  action: { bg: 'rgba(52, 211, 153, 0.1)', border: '#34d399', text: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' },
  risk: { bg: 'rgba(248, 113, 113, 0.1)', border: '#f87171', text: '#f87171', glow: 'rgba(248, 113, 113, 0.4)' },
  decision: { bg: 'rgba(255, 107, 53, 0.1)', border: '#ff6b35', text: '#ff6b35', glow: 'rgba(255, 107, 53, 0.4)' },
  question: { bg: 'rgba(167, 139, 250, 0.1)', border: '#a78bfa', text: '#a78bfa', glow: 'rgba(167, 139, 250, 0.4)' },
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  idea: 'IDEA',
  action: 'ACTION',
  risk: 'RISK',
  decision: 'DECISION',
  question: 'QUESTION',
};
