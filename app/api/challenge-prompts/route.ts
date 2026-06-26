import { NextResponse } from 'next/server';
import { extractJsonCandidate } from '@/lib/analysis';
import {
  buildChallengePrompts,
  type ChallengeLens,
  type ChallengePrompt,
} from '@/lib/challenge-mode';
import { type GraphNode, type TranscriptEntry } from '@/types';

function resolveAgnesEndpoint(url: string) {
  if (url.includes('/chat/completions') || url.includes('/responses')) {
    return url;
  }

  return `${url.replace(/\/$/, '')}/chat/completions`;
}

function buildChallengePromptRequest(
  node: GraphNode,
  lens: ChallengeLens,
  transcriptEntries: TranscriptEntry[]
) {
  const linkedTranscript = transcriptEntries.filter((entry) =>
    (node.data?.transcriptEntryIds ?? []).includes(entry.id)
  );
  const details = node.data?.details;
  const comments = node.data?.comments ?? [];
  const reactions = node.data?.reactions ?? { up: 0, neutral: 0, down: 0 };

  return [
    'You generate pressure-test prompts for a single product or brainstorming node.',
    'Return strict JSON only.',
    'Generate exactly 3 prompts tailored to the node.',
    'Each prompt must be specific to the node title, summary, transcript context, and feedback.',
    'Avoid generic facilitation language unless grounded in the actual node details.',
    'Keep each question under 28 words and each intent under 14 words.',
    'Schema:',
    JSON.stringify({
      prompts: [
        {
          id: 'string',
          question: 'string',
          intent: 'string',
        },
      ],
    }),
    '',
    `Lens: ${lens}`,
    `Node title: ${node.title}`,
    `Node type: ${node.type}`,
    `Node summary: ${node.summary}`,
    `Related topics: ${(details?.relatedTopics ?? []).join(', ') || 'None'}`,
    `Key insights: ${(details?.keyInsights ?? []).join(' | ') || 'None'}`,
    `Suggested by: ${node.data?.suggestedBy ?? 'Unknown'}`,
    `Reactions: 👍 ${reactions.up}, 😐 ${reactions.neutral}, 👎 ${reactions.down}`,
    `Recent comments: ${comments.slice(-3).map((comment) => comment.text).join(' | ') || 'None'}`,
    '',
    'Linked transcript context:',
    ...(linkedTranscript.length > 0
      ? linkedTranscript.slice(-4).map((entry) => `[${entry.speaker}] ${entry.text}`)
      : ['No directly linked transcript lines.']),
    '',
    'Write prompts that would help a teammate challenge, clarify, or de-risk this exact node.',
  ].join('\n');
}

function normalizePrompts(payload: unknown): ChallengePrompt[] {
  if (!payload || typeof payload !== 'object' || !('prompts' in payload)) {
    return [];
  }

  const prompts = (payload as { prompts?: unknown }).prompts;
  if (!Array.isArray(prompts)) {
    return [];
  }

  return prompts
    .filter(
      (prompt) =>
        prompt &&
        typeof prompt === 'object' &&
        typeof (prompt as { id?: unknown }).id === 'string' &&
        typeof (prompt as { question?: unknown }).question === 'string' &&
        typeof (prompt as { intent?: unknown }).intent === 'string'
    )
    .map((prompt) => ({
      id: (prompt as { id: string }).id,
      question: (prompt as { question: string }).question,
      intent: (prompt as { intent: string }).intent,
    }))
    .slice(0, 3);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    node?: GraphNode;
    lens?: ChallengeLens;
    transcriptEntries?: TranscriptEntry[];
  };

  const node = body.node;
  const lens = body.lens;
  const transcriptEntries = body.transcriptEntries ?? [];

  if (!node || !lens) {
    return NextResponse.json({ error: 'Missing node or lens payload.' }, { status: 400 });
  }

  const fallbackPrompts = buildChallengePrompts(node, lens, transcriptEntries);

  const apiUrl = process.env.AGNES_API_URL;
  const apiKey = process.env.AGNES_API_KEY;
  const model = process.env.AGNES_MODEL;

  if (!apiUrl || !apiKey || !model) {
    return NextResponse.json({ prompts: fallbackPrompts, source: 'fallback' });
  }

  try {
    const response = await fetch(resolveAgnesEndpoint(apiUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: 'You create sharp, specific brainstorming challenge prompts. Return strict JSON only.',
          },
          {
            role: 'user',
            content: buildChallengePromptRequest(node, lens, transcriptEntries),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Agnes request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rawContent =
      payload?.choices?.[0]?.message?.content ??
      payload?.output_text ??
      payload?.content ??
      payload?.data?.content ??
      '';

    const jsonCandidate = extractJsonCandidate(rawContent);
    if (!jsonCandidate) {
      throw new Error('Agnes response did not contain JSON content.');
    }

    const prompts = normalizePrompts(JSON.parse(jsonCandidate));
    if (prompts.length === 0) {
      throw new Error('Agnes response did not contain valid prompts.');
    }

    return NextResponse.json({ prompts, source: 'agnes' });
  } catch {
    return NextResponse.json({ prompts: fallbackPrompts, source: 'fallback' });
  }
}
