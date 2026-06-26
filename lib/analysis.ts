import {
  type EdgeRelation,
  type GraphNode,
  type NodeComment,
  type NodeDetails,
  type NodeReactionCounts,
  type NodeType,
  type SessionReport,
  type TranscriptSentimentAnalysis,
  type TranscriptEntry,
  type WorkspaceSession,
} from '@/types';

export interface AnalysisNodeDraft {
  title: string;
  summary: string;
  type: NodeType;
  relatedTopics: string[];
  keyInsights: string[];
  transcriptEntryIds?: string[];
}

export interface AnalysisEdgeDraft {
  sourceTitle: string;
  targetTitle: string;
}

export interface SessionAnalysisResult {
  summary: string;
  nextSteps: string[];
  nodes: AnalysisNodeDraft[];
  edges: AnalysisEdgeDraft[];
  source: 'agnes' | 'fallback';
}

export interface IdeaEvaluationResult {
  shouldCreateNode: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  sentiment: TranscriptSentimentAnalysis;
  link?: {
    nodeId: string;
    relation: EdgeRelation;
    rationale: string;
  };
  node?: AnalysisNodeDraft;
  source: 'agnes' | 'fallback';
}

export function buildAnalysisPrompt(session: WorkspaceSession) {
  return [
    'You are helping turn a brainstorming transcript into a structured idea graph.',
    'Return valid JSON only.',
    'Schema:',
    JSON.stringify({
      summary: 'string',
      nextSteps: ['string'],
      nodes: [
        {
          title: 'string',
          summary: 'string',
          type: 'idea | action | risk | decision | question',
          relatedTopics: ['string'],
          keyInsights: ['string'],
          transcriptEntryIds: ['string'],
        },
      ],
      edges: [
        {
          sourceTitle: 'string',
          targetTitle: 'string',
        },
      ],
    }),
    'Guidelines:',
    '- Keep between 3 and 8 nodes.',
    '- Use concise, human-friendly node titles.',
    '- Only create edges when the relationship is meaningful.',
    '- Use transcriptEntryIds to point to supporting transcript items.',
    '',
    'Session title:',
    session.title,
    '',
    'Transcript:',
    ...session.transcript.map((entry) => `[${entry.id}] ${entry.speaker}: ${entry.text}`),
    '',
    'Existing node feedback:',
    ...(session.nodes.length > 0
      ? session.nodes.map((node) => {
          const reactions = node.data?.reactions;
          const comments = node.data?.comments ?? [];
          return [
            `Node: ${node.title}`,
            `Reactions: 👍 ${reactions?.up ?? 0}, 😐 ${reactions?.neutral ?? 0}, 👎 ${reactions?.down ?? 0}`,
            `Comments: ${
              comments.length > 0
                ? comments
                    .slice(-3)
                    .map((comment) => comment.text)
                    .join(' | ')
                : 'None'
            }`,
          ].join('\n');
        })
      : ['No node reactions or comments yet.']),
  ].join('\n');
}

export function buildIdeaEvaluationPrompt(
  entry: TranscriptEntry,
  sessionTitle: string,
  existingNodes: Pick<GraphNode, 'id' | 'title' | 'summary' | 'type'>[]
) {
  return [
    'You are evaluating a single spoken brainstorming idea and the speaker stance toward it.',
    'Return valid JSON only.',
    'Schema:',
    JSON.stringify({
      shouldCreateNode: 'boolean',
      confidence: 'high | medium | low',
      reason: 'string',
      sentiment: {
        label: 'supporting | questioning | neutral',
        confidence: 'high | medium | low',
        rationale: 'string',
      },
      link: {
        nodeId: 'string',
        relation: 'extends | supports | questions | addresses-risk',
        rationale: 'string',
      },
      node: {
        title: 'string',
        summary: 'string',
        type: 'idea | action | risk | decision | question',
        relatedTopics: ['string'],
        keyInsights: ['string'],
        transcriptEntryIds: ['string'],
      },
    }),
    'Guidelines:',
    '- Create a node only if the idea is concrete, useful, or worth revisiting.',
    '- Reject vague filler, incomplete fragments, or off-topic chatter.',
    '- sentiment.label should be "supporting" when the speaker clearly agrees with, endorses, or strengthens an idea.',
    '- sentiment.label should be "questioning" when the speaker raises doubt, risk, disagreement, or pushback.',
    '- sentiment.label should be "neutral" for plain idea statements, clarifications, or comments without clear agreement/disagreement.',
    '- If shouldCreateNode is false, you may omit node.',
    '- If the new idea clearly extends, supports, questions, or de-risks an existing node, include link.nodeId for the best matching existing node.',
    '- Prefer linking an extension to an existing node rather than leaving a related idea isolated.',
    '- Keep titles concise and human-readable.',
    '',
    `Session title: ${sessionTitle}`,
    `Transcript entry: [${entry.id}] ${entry.speaker}: ${entry.text}`,
    '',
    'Existing nodes:',
    ...(existingNodes.length > 0
      ? existingNodes.map((node) => `[${node.id}] ${node.title} (${node.type}): ${node.summary}`)
      : ['No existing nodes yet.']),
  ].join('\n');
}

function classifySentence(text: string): NodeType {
  const lower = text.toLowerCase();
  if (lower.includes('risk') || lower.includes('privacy') || lower.includes('concern')) {
    return 'risk';
  }
  if (lower.includes('decide') || lower.includes('decision') || lower.includes('agreed')) {
    return 'decision';
  }
  if (lower.includes('?') || lower.startsWith('should ') || lower.startsWith('what if')) {
    return 'question';
  }
  if (
    lower.includes('need to') ||
    lower.includes('implement') ||
    lower.includes('set up') ||
    lower.includes('build') ||
    lower.includes('draft')
  ) {
    return 'action';
  }
  return 'idea';
}

function summarizeSentence(text: string) {
  return text.length > 96 ? `${text.slice(0, 93).trim()}...` : text;
}

function inferSentiment(entry: TranscriptEntry): TranscriptSentimentAnalysis {
  const lower = entry.text.toLowerCase();

  if (
    /agree|exactly|yes|love that|great idea|that works|makes sense|i like|good point|absolutely|support/i.test(lower)
  ) {
    return {
      label: 'supporting',
      confidence: 'high',
      rationale: 'The speaker is clearly endorsing or reinforcing the idea.',
    };
  }

  if (
    /disagree|not sure|however|but|concern|risk|problem|issue|worry|privacy|question|challenge|maybe not/i.test(lower)
  ) {
    return {
      label: 'questioning',
      confidence: 'medium',
      rationale: 'The speaker is raising doubt, caution, or a counterpoint.',
    };
  }

  return {
    label: 'neutral',
    confidence: 'low',
    rationale: 'The speaker is contributing information without a clear stance signal.',
  };
}

export function fallbackAnalyzeSession(transcript: TranscriptEntry[], sessionTitle: string): SessionAnalysisResult {
  const selected = transcript.slice(-8);

  const nodes: AnalysisNodeDraft[] = selected.map((entry) => ({
    title: entry.text.split(/[.?!]/)[0].slice(0, 48).trim() || 'Untitled thought',
    summary: summarizeSentence(entry.text),
    type: classifySentence(entry.text),
    relatedTopics: entry.text
      .split(/\s+/)
      .filter((word) => word.length > 5)
      .slice(0, 3),
    keyInsights: [entry.text],
    transcriptEntryIds: [entry.id],
  }));

  const edges: AnalysisEdgeDraft[] = nodes.slice(1).map((node, index) => ({
    sourceTitle: nodes[index].title,
    targetTitle: node.title,
  }));

  const nextSteps = nodes
    .filter((node) => node.type === 'action' || node.type === 'decision')
    .slice(0, 5)
    .map((node) => node.summary);

  return {
    summary:
      nodes.length > 0
        ? `${sessionTitle} focused on ${nodes
            .slice(0, 3)
            .map((node) => node.title.toLowerCase())
            .join(', ')}.`
        : `${sessionTitle} has not accumulated enough transcript data for analysis yet.`,
    nextSteps: nextSteps.length > 0 ? nextSteps : ['Capture a few more ideas, then run analysis again.'],
    nodes,
    edges,
    source: 'fallback',
  };
}

function findBestRelatedNode(
  entry: TranscriptEntry,
  existingNodes: Pick<GraphNode, 'id' | 'title' | 'summary' | 'type'>[]
) {
  const tokens = new Set(
    entry.text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 4)
  );

  let bestMatch:
    | {
        nodeId: string;
        relation: EdgeRelation;
        rationale: string;
        score: number;
      }
    | undefined;

  for (const node of existingNodes) {
    const haystack = `${node.title} ${node.summary}`.toLowerCase();
    let score = 0;

    tokens.forEach((token) => {
      if (haystack.includes(token)) {
        score += 1;
      }
    });

    if (score < 2) {
      continue;
    }

    const relation =
      /risk|privacy|concern|consent|legal/i.test(entry.text) && node.type !== 'risk'
        ? 'addresses-risk'
        : /agree|support|yes|should|need to/i.test(entry.text)
          ? 'supports'
          : /question|not sure|however|but/i.test(entry.text)
            ? 'questions'
            : 'extends';

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        nodeId: node.id,
        relation,
        rationale: 'The new idea shares key terms and appears to build on an existing node.',
        score,
      };
    }
  }

  if (!bestMatch) {
    return undefined;
  }

  return {
    nodeId: bestMatch.nodeId,
    relation: bestMatch.relation,
    rationale: bestMatch.rationale,
  };
}

export function fallbackEvaluateIdea(
  entry: TranscriptEntry,
  existingNodes: Pick<GraphNode, 'id' | 'title' | 'summary' | 'type'>[] = []
): IdeaEvaluationResult {
  const trimmed = entry.text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const meaningful =
    words.length >= 7 &&
    /should|could|need to|what if|build|match|improve|reduce|automate|platform|system|dashboard|graph|idea|feature/i.test(trimmed);
  const link = findBestRelatedNode(entry, existingNodes);

  if (!meaningful) {
    return {
      shouldCreateNode: false,
      confidence: 'low',
      reason: 'The statement is too short or too vague to promote into a saved node yet.',
      sentiment: inferSentiment(entry),
      link,
      source: 'fallback',
    };
  }

  return {
    shouldCreateNode: true,
    confidence: words.length > 12 ? 'high' : 'medium',
    reason: 'The statement expresses a concrete product or implementation idea.',
    sentiment: inferSentiment(entry),
    link,
    node: {
      title: trimmed.split(/[.?!]/)[0].slice(0, 52).trim() || 'Untitled idea',
      summary: summarizeSentence(trimmed),
      type: classifySentence(trimmed),
      relatedTopics: trimmed
        .split(/\s+/)
        .filter((word) => word.length > 5)
        .slice(0, 3),
      keyInsights: [trimmed],
      transcriptEntryIds: [entry.id],
    },
    source: 'fallback',
  };
}

export function materializeAnalysis(session: WorkspaceSession, analysis: SessionAnalysisResult) {
  const titleToId = new Map<string, string>();

  const collectMergedFeedback = (draft: AnalysisNodeDraft) => {
    const supportingEntryIds = new Set(draft.transcriptEntryIds ?? []);
    const matchedNodes = session.nodes.filter((node) => {
      const nodeEntryIds = node.data?.transcriptEntryIds ?? [];
      const transcriptOverlap = nodeEntryIds.some((entryId) => supportingEntryIds.has(entryId));
      const titleMatch =
        node.title.toLowerCase().includes(draft.title.toLowerCase()) ||
        draft.title.toLowerCase().includes(node.title.toLowerCase());

      return transcriptOverlap || titleMatch;
    });

    const reactions: NodeReactionCounts = matchedNodes.reduce(
      (accumulator, node) => {
        const nodeReactions = node.data?.reactions;
        return {
          up: accumulator.up + (nodeReactions?.up ?? 0),
          neutral: accumulator.neutral + (nodeReactions?.neutral ?? 0),
          down: accumulator.down + (nodeReactions?.down ?? 0),
        };
      },
      { up: 0, neutral: 0, down: 0 }
    );

    const comments: NodeComment[] = matchedNodes.flatMap((node) =>
      (node.data?.comments ?? []).map((comment) => ({
        ...comment,
        merged: true,
        mergedFromTitle: node.title,
      }))
    );

    return {
      reactions,
      comments,
    };
  };

  const nodes: GraphNode[] = analysis.nodes.map((draft, index) => {
    const id = `node-${Date.now()}-${index}`;
    titleToId.set(draft.title, id);
    const mergedFeedback = collectMergedFeedback(draft);

    const details: NodeDetails = {
      relatedTopics: draft.relatedTopics,
      keyInsights: draft.keyInsights,
      metrics: [{ label: 'Evidence', value: `${draft.transcriptEntryIds?.length ?? 0} lines` }],
    };

      return {
        id,
        type: draft.type,
        title: draft.title,
        summary: draft.summary,
      position: {
        x: 180 + (index % 3) * 240,
        y: 120 + Math.floor(index / 3) * 180,
      },
      isActive: true,
      createdAt: Date.now(),
      data: {
        details,
        transcriptEntryIds: draft.transcriptEntryIds,
        aiCreated: true,
        reactions: mergedFeedback.reactions,
        comments: mergedFeedback.comments,
      },
    };
  });

  const edges = analysis.edges
    .map((edge, index) => {
      const source = titleToId.get(edge.sourceTitle);
      const target = titleToId.get(edge.targetTitle);
      if (!source || !target || source === target) {
        return null;
      }

      return {
        id: `edge-ai-${index}`,
        source,
        target,
        type: 'active' as const,
      };
    })
    .filter((edge): edge is { id: string; source: string; target: string; type: 'active' } => edge !== null);

  const report: SessionReport = {
    sessionId: session.id,
    sessionTitle: session.title,
    generatedAt: new Date().toISOString(),
    totalNodes: nodes.length,
    totalTranscripts: session.transcript.length,
    keyDecisions: nodes.filter((node) => node.type === 'decision').length,
    actionItems: nodes.filter((node) => node.type === 'action').length,
    risks: nodes.filter((node) => node.type === 'risk').length,
    questions: nodes.filter((node) => node.type === 'question').length,
    ideas: nodes.filter((node) => node.type === 'idea').length,
    summary: analysis.summary,
    nextSteps: analysis.nextSteps,
    source: analysis.source,
  };

  return {
    nodes,
    edges,
    report,
  };
}

export function extractJsonCandidate(content: unknown) {
  if (typeof content !== 'string') {
    return null;
  }

  const match = content.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}
