import { NextResponse } from 'next/server';
import { buildAnalysisPrompt, extractJsonCandidate, fallbackAnalyzeSession } from '@/lib/analysis';
import { type WorkspaceSession } from '@/types';

function resolveAgnesEndpoint(url: string) {
  if (url.includes('/chat/completions') || url.includes('/responses')) {
    return url;
  }

  return `${url.replace(/\/$/, '')}/chat/completions`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { session?: WorkspaceSession };
  const session = body.session;

  if (!session) {
    return NextResponse.json({ error: 'Missing session payload.' }, { status: 400 });
  }

  if (session.transcript.length === 0) {
    return NextResponse.json(
      fallbackAnalyzeSession(session.transcript, session.title),
      { status: 200 }
    );
  }

  const apiUrl = process.env.AGNES_API_URL;
  const apiKey = process.env.AGNES_API_KEY;
  const model = process.env.AGNES_MODEL;

  if (!apiUrl || !apiKey || !model) {
    return NextResponse.json(
      fallbackAnalyzeSession(session.transcript, session.title),
      { status: 200 }
    );
  }

  const prompt = buildAnalysisPrompt(session);

  try {
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
            content: 'You extract structured brainstorming artifacts and respond with strict JSON only.',
          },
          {
            role: 'user',
            content: prompt,
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

    const parsed = JSON.parse(jsonCandidate) as object;
    return NextResponse.json({
      ...parsed,
      source: 'agnes',
    });
  } catch {
    return NextResponse.json(
      fallbackAnalyzeSession(session.transcript, session.title),
      { status: 200 }
    );
  }
}
