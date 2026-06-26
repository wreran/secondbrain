import { type GraphNode, type NodeType, type TranscriptEntry } from '@/types';

export type ChallengeLens =
  | 'clarify'
  | 'assumptions'
  | 'counterarguments'
  | 'evidence'
  | 'risks'
  | 'second-order'
  | 'next-step';

export interface ChallengePrompt {
  id: string;
  question: string;
  intent: string;
}

export const CHALLENGE_LENS_LABELS: Record<ChallengeLens, string> = {
  clarify: 'Clarify',
  assumptions: 'Assumptions',
  counterarguments: 'Counterarguments',
  evidence: 'Evidence',
  risks: 'Risks',
  'second-order': 'Second-Order Effects',
  'next-step': 'Next Step',
};

const LENS_INTROS: Record<ChallengeLens, string> = {
  clarify: 'Tighten the idea before expanding it.',
  assumptions: 'Expose what has to be true for this to work.',
  counterarguments: 'Pressure-test the idea from a skeptical point of view.',
  evidence: 'Separate conviction from proof.',
  risks: 'Surface failure modes and collateral damage.',
  'second-order': 'Look beyond the first obvious outcome.',
  'next-step': 'Convert uncertainty into a testable move.',
};

function getLinkedTranscript(node: GraphNode, transcriptEntries: TranscriptEntry[]) {
  const linkedIds = new Set(node.data?.transcriptEntryIds ?? []);
  return transcriptEntries.filter((entry) => linkedIds.has(entry.id));
}

function getSupportBalance(transcriptEntries: TranscriptEntry[]) {
  return transcriptEntries.reduce(
    (summary, entry) => {
      if (entry.sentiment?.label === 'supporting') {
        summary.supporting += 1;
      }
      if (entry.sentiment?.label === 'questioning') {
        summary.questioning += 1;
      }
      return summary;
    },
    { supporting: 0, questioning: 0 }
  );
}

export function getSuggestedLens(node: GraphNode, transcriptEntries: TranscriptEntry[]): ChallengeLens {
  const linkedTranscript = getLinkedTranscript(node, transcriptEntries);
  const sentiment = getSupportBalance(linkedTranscript);

  if (node.type === 'decision') {
    return 'risks';
  }

  if (node.type === 'action') {
    return 'evidence';
  }

  if (node.type === 'risk') {
    return 'next-step';
  }

  if (node.type === 'question') {
    return 'clarify';
  }

  if (sentiment.supporting > 1 && sentiment.questioning === 0) {
    return 'assumptions';
  }

  return 'counterarguments';
}

export function buildChallengePrompts(
  node: GraphNode,
  lens: ChallengeLens,
  transcriptEntries: TranscriptEntry[]
): ChallengePrompt[] {
  const linkedTranscript = getLinkedTranscript(node, transcriptEntries);
  const latestLine = linkedTranscript.at(-1)?.text;
  const relatedTopics = node.data?.details?.relatedTopics?.slice(0, 2) ?? [];

  const contextLine = latestLine
    ? `The latest supporting transcript says: "${latestLine}"`
    : `The current summary is: "${node.summary}"`;
  const topicHint =
    relatedTopics.length > 0 ? `Keep ${relatedTopics.join(' and ')} in view.` : 'Stay concrete and specific.';

  const promptsByLens: Record<ChallengeLens, ChallengePrompt[]> = {
    clarify: [
      {
        id: 'clarify-1',
        question: `What problem is "${node.title}" actually solving, and for whom?`,
        intent: 'Sharpen the target before improving the solution.',
      },
      {
        id: 'clarify-2',
        question: 'Which word or phrase in this idea is still vague enough to hide disagreement?',
        intent: 'Replace abstraction with something testable.',
      },
      {
        id: 'clarify-3',
        question: `${contextLine} What exactly should a teammate understand after hearing this idea once?`,
        intent: 'Make the message easier to align around.',
      },
    ],
    assumptions: [
      {
        id: 'assumption-1',
        question: `What has to be true for "${node.title}" to succeed that you have not validated yet?`,
        intent: 'Identify hidden dependencies.',
      },
      {
        id: 'assumption-2',
        question: 'Which assumption here feels most comfortable only because no one has challenged it yet?',
        intent: 'Find the soft spot in the reasoning.',
      },
      {
        id: 'assumption-3',
        question: `${topicHint} If one core assumption breaks, what part of the idea still survives?`,
        intent: 'Test how fragile the concept is.',
      },
    ],
    counterarguments: [
      {
        id: 'counter-1',
        question: `What would the smartest skeptic say is wrong, naive, or incomplete about "${node.title}"?`,
        intent: 'Invite the strongest objection, not the easiest one.',
      },
      {
        id: 'counter-2',
        question: 'If this idea failed six months from now, what reason would seem obvious in hindsight?',
        intent: 'Surface practical blind spots early.',
      },
      {
        id: 'counter-3',
        question: `${contextLine} Which part of that statement would another stakeholder most likely push back on?`,
        intent: 'Anticipate real disagreement.',
      },
    ],
    evidence: [
      {
        id: 'evidence-1',
        question: `What evidence would meaningfully increase confidence in "${node.title}" this week?`,
        intent: 'Shift from intuition to proof.',
      },
      {
        id: 'evidence-2',
        question: 'What result or observation would clearly disprove the current thinking?',
        intent: 'Define falsifiability, not just success.',
      },
      {
        id: 'evidence-3',
        question: `${topicHint} What is the cheapest test you could run before committing more effort?`,
        intent: 'Find a fast learning loop.',
      },
    ],
    risks: [
      {
        id: 'risk-1',
        question: `What downside or failure mode of "${node.title}" are you most likely underestimating?`,
        intent: 'Make hidden risk explicit.',
      },
      {
        id: 'risk-2',
        question: 'Who could be negatively affected if this idea works exactly as intended?',
        intent: 'Look for tradeoffs and externalities.',
      },
      {
        id: 'risk-3',
        question: `${contextLine} What protection, guardrail, or mitigation should exist before moving forward?`,
        intent: 'Turn risk awareness into safer design.',
      },
    ],
    'second-order': [
      {
        id: 'second-order-1',
        question: `If "${node.title}" succeeds, what new problem or complexity does it create next?`,
        intent: 'Think beyond first-order wins.',
      },
      {
        id: 'second-order-2',
        question: 'What behavior might this unintentionally encourage from users or teammates?',
        intent: 'Spot incentive shifts early.',
      },
      {
        id: 'second-order-3',
        question: `${topicHint} Which adjacent system, team, or workflow would absorb the hidden cost?`,
        intent: 'Reveal downstream consequences.',
      },
    ],
    'next-step': [
      {
        id: 'next-step-1',
        question: `What is the smallest useful next step that would reduce uncertainty around "${node.title}"?`,
        intent: 'Move from reflection into action.',
      },
      {
        id: 'next-step-2',
        question: 'What should happen before this becomes a decision, commitment, or build task?',
        intent: 'Separate exploration from execution.',
      },
      {
        id: 'next-step-3',
        question: `${contextLine} What exact question should the team answer next?`,
        intent: 'Create momentum with a concrete follow-up.',
      },
    ],
  };

  return promptsByLens[lens];
}

export function getLensIntro(lens: ChallengeLens) {
  return LENS_INTROS[lens];
}

export function summarizeChallengeResponse(response: string) {
  const trimmed = response.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return '';
  }

  return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
}

export function buildChallengeNodeTitle(node: GraphNode, outputType: NodeType, response: string) {
  const trimmed = response.trim();
  if (!trimmed) {
    return `${node.title} Follow-up`;
  }

  const firstSentence = trimmed.split(/[.?!]/)[0]?.trim() || trimmed;
  const prefix =
    outputType === 'question'
      ? 'Question'
      : outputType === 'risk'
        ? 'Risk'
        : outputType === 'action'
          ? 'Action'
          : 'Insight';

  return `${prefix}: ${firstSentence.slice(0, 52)}`;
}
