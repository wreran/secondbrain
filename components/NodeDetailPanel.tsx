'use client';

import { useState } from 'react';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, type GraphNode, type NodeType } from '@/types';
import {
  buildChallengeNodeTitle,
  buildChallengePrompts,
  CHALLENGE_LENS_LABELS,
  getLensIntro,
  getSuggestedLens,
  summarizeChallengeResponse,
  type ChallengePrompt,
  type ChallengeLens,
} from '@/lib/challenge-mode';
import {
  X,
  Clock,
  Link,
  Tag,
  ChevronRight,
  Lightbulb,
  BarChart3,
  Trash2,
  MessageSquare,
  ThumbsUp,
  Pencil,
  Check,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import type { TranscriptEntry } from '@/types';

interface NodeDetailPanelProps {
  node: GraphNode | null;
  transcriptEntries: TranscriptEntry[];
  onClose: () => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, patch: Partial<GraphNode>) => void;
  onCreateChallengeNode: (input: {
    title: string;
    summary: string;
    type: NodeType;
    relationToSource: 'questions' | 'addresses-risk' | 'extends';
  }) => void;
}

export function NodeDetailPanel({
  node,
  transcriptEntries,
  onClose,
  onDeleteNode,
  onUpdateNode,
  onCreateChallengeNode,
}: NodeDetailPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [challengeLens, setChallengeLens] = useState<ChallengeLens>(
    node ? getSuggestedLens(node, transcriptEntries) : 'clarify'
  );
  const [challengeResponse, setChallengeResponse] = useState('');
  const [challengeStatus, setChallengeStatus] = useState('Pick a lens and generate prompts to pressure-test this idea.');
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [challengePrompts, setChallengePrompts] = useState<ChallengePrompt[]>(
    node ? buildChallengePrompts(node, getSuggestedLens(node, transcriptEntries), transcriptEntries) : []
  );

  if (!node) {
    return (
      <div className="h-full flex flex-col">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: '1px solid rgba(192, 132, 252, 0.15)',
            background: 'rgba(16, 10, 35, 0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <h3 className="text-sm font-semibold text-brand">Node Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-all">
            <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Select a node to view details
          </p>
        </div>
      </div>
    );
  }

  const colors = NODE_TYPE_COLORS[node.type];
  const details = node.data?.details || {
    relatedTopics: ['No related topics'],
    keyInsights: ['No additional details available'],
    metrics: [{ label: 'Status', value: 'Active' }],
  };
  const reactions = node.data?.reactions ?? { up: 0, neutral: 0, down: 0 };
  const comments = node.data?.comments ?? [];
  const suggestedLens = getSuggestedLens(node, transcriptEntries);
  const linkedTranscript = transcriptEntries.filter((entry) =>
    (node.data?.transcriptEntryIds ?? []).includes(entry.id)
  );

  const generatePrompts = async (lens: ChallengeLens) => {
    setChallengeLens(lens);
    setIsGeneratingPrompts(true);
    setChallengeStatus(`Generating ${CHALLENGE_LENS_LABELS[lens].toLowerCase()} prompts for this node...`);

    try {
      const response = await fetch('/api/challenge-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node,
          lens,
          transcriptEntries,
        }),
      });

      if (!response.ok) {
        throw new Error('Challenge prompt request failed.');
      }

      const result = (await response.json()) as {
        prompts?: ChallengePrompt[];
        source?: 'agnes' | 'fallback';
      };
      const prompts =
        result.prompts && result.prompts.length > 0
          ? result.prompts
          : buildChallengePrompts(node, lens, transcriptEntries);

      setChallengePrompts(prompts);
      setChallengeStatus(
        result.source === 'agnes'
          ? `Agnes tailored ${CHALLENGE_LENS_LABELS[lens].toLowerCase()} prompts for this node.`
          : `Using fallback ${CHALLENGE_LENS_LABELS[lens].toLowerCase()} prompts for this node.`
      );
    } catch {
      setChallengePrompts(buildChallengePrompts(node, lens, transcriptEntries));
      setChallengeStatus(`Using fallback ${CHALLENGE_LENS_LABELS[lens].toLowerCase()} prompts for this node.`);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const saveChallengeNode = (type: NodeType, relationToSource: 'questions' | 'addresses-risk' | 'extends') => {
    const summary = summarizeChallengeResponse(challengeResponse);
    if (!summary) {
      return;
    }

    onCreateChallengeNode({
      title: buildChallengeNodeTitle(node, type, summary),
      summary,
      type,
      relationToSource,
    });
    setChallengeResponse('');
    setChallengeStatus(`Saved your pressure-test response as a ${type} node.`);
  };

  const applyRevision = () => {
    const summary = summarizeChallengeResponse(challengeResponse);
    if (!summary) {
      return;
    }

    onUpdateNode(node.id, {
      summary: `${node.summary}\n\nPressure test revision: ${summary}`,
    });
    setChallengeResponse('');
    setChallengeStatus('Applied your response to the current node summary.');
  };

  const incrementReaction = (kind: 'up' | 'neutral' | 'down') => {
    onUpdateNode(node.id, {
      data: {
        ...node.data,
        reactions: {
          ...reactions,
          [kind]: reactions[kind] + 1,
        },
      },
    });
  };

  const addComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      return;
    }

    onUpdateNode(node.id, {
      data: {
        ...node.data,
        comments: [
          ...comments,
          {
            id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text: trimmed,
            createdAt: Date.now(),
          },
        ],
      },
    });
    setCommentText('');
  };

  const startEditingComment = (commentId: string, text: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  };

  const saveEditedComment = (commentId: string) => {
    const trimmed = editingCommentText.trim();
    if (!trimmed) {
      return;
    }

    onUpdateNode(node.id, {
      data: {
        ...node.data,
        comments: comments.map((comment) =>
          comment.id === commentId ? { ...comment, text: trimmed } : comment
        ),
      },
    });
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const deleteComment = (commentId: string) => {
    onUpdateNode(node.id, {
      data: {
        ...node.data,
        comments: comments.filter((comment) => comment.id !== commentId),
      },
    });

    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditingCommentText('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid rgba(192, 132, 252, 0.15)',
          background: 'rgba(16, 10, 35, 0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h3 className="text-sm font-semibold text-brand">Node Details</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-all">
          <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(168,85,247,0.2) transparent',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wider node-label"
            style={{
              background: `${colors.border}22`,
              color: colors.text,
              border: `1px solid ${colors.border}44`,
              boxShadow: `0 0 8px ${colors.glow}`,
            }}
          >
            {NODE_TYPE_LABELS[node.type]}
          </span>
          {node.isActive && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: 'rgba(251, 113, 133, 0.1)',
                color: 'var(--accent-coral)',
                border: '1px solid rgba(251, 113, 133, 0.3)',
              }}
            >
              New
            </span>
          )}
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1 text-muted">Title</label>
          <input
            value={node.title}
            onChange={(event) => onUpdateNode(node.id, { title: event.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm bg-transparent border outline-none"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.2)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1 text-muted">Summary</label>
          <textarea
            value={node.summary}
            onChange={(event) => onUpdateNode(node.id, { summary: event.target.value })}
            className="w-full min-h-24 rounded-lg px-3 py-2 text-sm bg-transparent border outline-none resize-none"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.2)',
              color: 'var(--text-secondary)',
            }}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1 text-muted">Node Type</label>
          <select
            value={node.type}
            onChange={(event) => onUpdateNode(node.id, { type: event.target.value as NodeType })}
            className="w-full rounded-lg px-3 py-2 text-sm bg-transparent border outline-none"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.2)',
              color: 'var(--text-primary)',
            }}
          >
            {Object.entries(NODE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value} style={{ background: '#120a23' }}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="p-3 rounded-xl bio-card">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" style={{ color: 'var(--accent-coral)' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider node-label"
              style={{ color: 'var(--accent-coral)' }}
            >
              Pressure Test
            </span>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
            AI-style critique prompts help challenge the thinking behind this node and turn the result into a new graph artifact.
          </p>
          <div className="rounded-xl px-3 py-2 mb-3" style={{
            background: 'rgba(20, 12, 42, 0.55)',
            border: '1px solid rgba(251, 113, 133, 0.14)',
          }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                Suggested Lens
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: 'rgba(251, 113, 133, 0.1)',
                  border: '1px solid rgba(251, 113, 133, 0.2)',
                  color: 'var(--accent-coral)',
                }}
              >
                {CHALLENGE_LENS_LABELS[suggestedLens]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {getLensIntro(challengeLens)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(Object.entries(CHALLENGE_LENS_LABELS) as Array<[ChallengeLens, string]>).map(([value, label]) => (
              <button
                key={value}
                onClick={() => generatePrompts(value)}
                className="rounded-lg px-3 py-2 text-[11px] font-semibold transition-all text-left"
                style={{
                  background: challengeLens === value ? 'rgba(168, 85, 247, 0.16)' : 'rgba(255,255,255,0.03)',
                  border: challengeLens === value
                    ? '1px solid rgba(168, 85, 247, 0.32)'
                    : '1px solid rgba(168, 85, 247, 0.12)',
                  color: challengeLens === value ? 'var(--accent-lavender)' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => generatePrompts(challengeLens)}
            disabled={isGeneratingPrompts}
            className="w-full rounded-lg px-3 py-2 text-xs font-semibold mb-3 transition-opacity disabled:opacity-55"
            style={{
              background: 'rgba(251, 113, 133, 0.1)',
              border: '1px solid rgba(251, 113, 133, 0.22)',
              color: 'var(--accent-coral)',
            }}
          >
            {isGeneratingPrompts ? 'Generating Tailored Prompts...' : 'Generate Tailored Prompts'}
          </button>
          <div className="space-y-2 mb-3">
            {challengePrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(12, 8, 26, 0.65)',
                  border: '1px solid rgba(168, 85, 247, 0.12)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3" style={{ color: 'var(--accent-lavender)' }} />
                  <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--accent-lavender)' }}>
                    Prompt
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{prompt.question}</p>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{prompt.intent}</p>
              </div>
            ))}
          </div>
          <textarea
            value={challengeResponse}
            onChange={(event) => setChallengeResponse(event.target.value)}
            placeholder="Respond to the prompts, capture the objection, or rewrite the idea more clearly..."
            className="w-full min-h-28 rounded-lg px-3 py-2 text-sm bg-transparent border outline-none resize-none"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.2)',
              color: 'var(--text-primary)',
            }}
          />
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {challengeStatus}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => saveChallengeNode('question', 'questions')}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'rgba(96, 165, 250, 0.12)',
                border: '1px solid rgba(96, 165, 250, 0.24)',
                color: '#bfdbfe',
              }}
            >
              Save as Question
            </button>
            <button
              onClick={() => saveChallengeNode('risk', 'addresses-risk')}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'rgba(251, 113, 133, 0.12)',
                border: '1px solid rgba(251, 113, 133, 0.24)',
                color: '#fda4af',
              }}
            >
              Save as Risk
            </button>
            <button
              onClick={() => saveChallengeNode('action', 'extends')}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.24)',
                color: '#86efac',
              }}
            >
              Save as Action
            </button>
            <button
              onClick={applyRevision}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.24)',
                color: 'var(--accent-lavender)',
              }}
            >
              Revise Current Node
            </button>
          </div>
          {linkedTranscript.length > 0 && (
            <div className="mt-3 rounded-xl px-3 py-2" style={{
              background: 'rgba(20, 12, 42, 0.45)',
              border: '1px solid rgba(168, 85, 247, 0.12)',
            }}>
              <p className="text-[10px] uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--text-muted)' }}>
                Linked Transcript Context
              </p>
              <p className="text-xs leading-relaxed text-secondary">
                {linkedTranscript.at(-1)?.speaker}: {linkedTranscript.at(-1)?.text}
              </p>
            </div>
          )}
        </div>

        {node.data?.suggestedBy && (
          <div className="p-3 rounded-xl bio-card">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold uppercase tracking-wider node-label"
                style={{ color: 'var(--accent-purple)' }}
              >
                Suggested By
              </span>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {node.data.suggestedBy}
            </p>
          </div>
        )}

        <div className="p-3 rounded-xl bio-card">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp className="w-3.5 h-3.5" style={{ color: '#facc15' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider node-label"
              style={{ color: '#facc15' }}
            >
              Reactions
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => incrementReaction('up')}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(250, 204, 21, 0.08)',
                border: '1px solid rgba(250, 204, 21, 0.18)',
                color: '#fde68a',
              }}
            >
              👍 {reactions.up}
            </button>
            <button
              onClick={() => incrementReaction('neutral')}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.18)',
                color: 'var(--accent-lavender)',
              }}
            >
              😐 {reactions.neutral}
            </button>
            <button
              onClick={() => incrementReaction('down')}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(251, 113, 133, 0.08)',
                border: '1px solid rgba(251, 113, 133, 0.18)',
                color: '#fda4af',
              }}
            >
              👎 {reactions.down}
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bio-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--accent-purple)' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider node-label"
              style={{ color: 'var(--accent-purple)' }}
            >
              Metrics
            </span>
          </div>
          <div className="space-y-2">
            {details.metrics.map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {metric.label}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent-lavender)' }}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bio-card">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-3.5 h-3.5" style={{ color: 'var(--accent-pink)' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider node-label"
              style={{ color: 'var(--accent-pink)' }}
            >
              Key Insights
            </span>
          </div>
          <div className="space-y-2">
            {details.keyInsights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <ChevronRight
                  className="w-3 h-3 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--accent-purple)' }}
                />
                <p className="text-xs leading-relaxed text-secondary">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bio-card">
          <div className="flex items-center gap-2 mb-3">
            <Link className="w-3.5 h-3.5" style={{ color: 'var(--accent-magenta)' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider node-label"
              style={{ color: 'var(--accent-magenta)' }}
            >
              Related Topics
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {details.relatedTopics.map((topic, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  color: 'var(--accent-purple)',
                }}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bio-card">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent-lavender)' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider node-label"
              style={{ color: 'var(--accent-lavender)' }}
            >
              Comments
            </span>
          </div>
          <div className="space-y-2 mb-3">
            {comments.length === 0 && (
              <p className="text-xs text-muted">
                No comments yet. Add an anonymous note so the team can react with context.
              </p>
            )}
            {comments
              .slice()
              .reverse()
              .map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl px-3 py-2"
                  style={{
                    background: 'rgba(12, 8, 26, 0.65)',
                    border: comment.merged
                      ? '1px solid rgba(255, 214, 102, 0.2)'
                      : '1px solid rgba(168, 85, 247, 0.12)',
                    boxShadow: comment.merged ? '0 0 18px rgba(255, 214, 102, 0.06)' : 'none',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {editingCommentId === comment.id ? (
                        <textarea
                          value={editingCommentText}
                          onChange={(event) => setEditingCommentText(event.target.value)}
                          className="w-full min-h-20 rounded-lg px-2.5 py-2 text-xs bg-transparent border outline-none resize-none"
                          style={{
                            borderColor: 'rgba(168, 85, 247, 0.2)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      ) : (
                        <p className="text-xs leading-relaxed text-secondary">{comment.text}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingCommentId === comment.id ? (
                        <button
                          onClick={() => saveEditedComment(comment.id)}
                          className="rounded-lg p-1.5 hover:bg-white/5 transition-all"
                          aria-label="Save comment"
                        >
                          <Check className="w-3.5 h-3.5" style={{ color: '#86efac' }} />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditingComment(comment.id, comment.text)}
                          className="rounded-lg p-1.5 hover:bg-white/5 transition-all"
                          aria-label="Edit comment"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--accent-lavender)' }} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="rounded-lg p-1.5 hover:bg-white/5 transition-all"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#fda4af' }} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Anonymous |{' '}
                      {new Date(comment.createdAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    {comment.merged && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]"
                        style={{
                          background: 'rgba(255, 214, 102, 0.12)',
                          border: '1px solid rgba(255, 214, 102, 0.28)',
                          color: '#facc15',
                        }}
                      >
                        Merged{comment.mergedFromTitle ? ` from ${comment.mergedFromTitle}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Add an anonymous comment..."
            className="w-full min-h-24 rounded-lg px-3 py-2 text-sm bg-transparent border outline-none resize-none"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.2)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={addComment}
            className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-semibold"
            style={{
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: 'var(--accent-lavender)',
            }}
          >
            Add Comment
          </button>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5" style={{ color: 'rgba(192, 132, 252, 0.5)' }} />
            <span className="text-muted">Created</span>
            <span className="ml-auto" style={{ color: 'var(--accent-lavender)' }}>
              {node.createdAt ? new Date(node.createdAt).toLocaleString() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Tag className="w-3.5 h-3.5" style={{ color: 'rgba(192, 132, 252, 0.5)' }} />
            <span className="text-muted">ID</span>
            <span className="ml-auto font-mono" style={{ color: 'var(--accent-lavender)' }}>
              {node.id}
            </span>
          </div>
        </div>

        <div className="pt-3" style={{ borderTop: '1px solid rgba(192, 132, 252, 0.1)' }}>
          <div className="flex items-center gap-2 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${node.isActive ? 'status-active' : ''}`}
              style={{
                backgroundColor: node.isActive ? 'var(--accent-teal-green)' : 'rgba(255,255,255,0.2)',
                boxShadow: node.isActive ? '0 0 6px rgba(45, 212, 191, 0.4)' : 'none',
              }}
            />
            <span
              style={{
                color: node.isActive ? 'rgba(45, 212, 191, 0.7)' : 'rgba(255,255,255,0.4)',
              }}
            >
              {node.isActive ? 'Newly created node highlight' : 'Stable node'}
            </span>
          </div>
        </div>

        <button
          onClick={() => onDeleteNode(node.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: '#fda4af',
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Node
        </button>
      </div>
    </div>
  );
}
