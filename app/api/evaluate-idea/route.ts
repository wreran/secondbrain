import { NextResponse } from 'next/server';
import {
  buildIdeaEvaluationPrompt,
  extractJsonCandidate,
  fallbackEvaluateIdea,
} from '@/lib/analysis';
import { type GraphNode, type TranscriptEntry } from '@/types';

function resolveAgnesEndpoint(url: string) {
  if (url.includes('/chat/completions') || url.includes('/responses')) {
    return url;
  }

  return `${url.replace(/\/$/, '')}/chat/completions`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    entry?: TranscriptEntry;
    sessionTitle?: string;
    existingNodes?: Pick<GraphNode, 'id' | 'title' | 'summary' | 'type'>[];
  };
  const entry = body.entry;
  const sessionTitle = body.sessionTitle ?? 'Second Brain Session';
  const existingNodes = body.existingNodes ?? [];

  if (!entry) {
    return NextResponse.json({ error: 'Missing transcript entry payload.' }, { status: 400 });
  }

  const apiUrl = process.env.AGNES_API_URL;
  const apiKey = process.env.AGNES_API_KEY;
  const model = process.env.AGNES_MODEL;

  if (!apiUrl || !apiKey || !model) {
    return NextResponse.json(fallbackEvaluateIdea(entry, existingNodes), { status: 200 });
  }

  try {
    const fallback = fallbackEvaluateIdea(entry, existingNodes);
    const response = await fetch(resolveAgnesEndpoint(apiUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You decide whether a spoken idea deserves to become a node in an idea graph. Return strict JSON only.',
          },
          {
            role: 'user',
            content: buildIdeaEvaluationPrompt(entry, sessionTitle, existingNodes),
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

    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
    return NextResponse.json({
      ...fallback,
      ...parsed,
      sentiment:
        parsed.sentiment && typeof parsed.sentiment === 'object'
          ? { ...fallback.sentiment, ...parsed.sentiment }
          : fallback.sentiment,
      link:
        parsed.link && typeof parsed.link === 'object'
          ? { ...fallback.link, ...parsed.link }
          : fallback.link,
      source: 'agnes',
    });
  } catch {
    return NextResponse.json(fallbackEvaluateIdea(entry, existingNodes), { status: 200 });
  }
}
