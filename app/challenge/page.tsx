'use client';

import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { FloatingOrbs } from '@/components/NeuralBackground';
import { CHALLENGE_LENS_LABELS, getSuggestedLens } from '@/lib/challenge-mode';
import { useWorkspace } from '@/lib/use-workspace';
import { ArrowRight, BrainCircuit, MessageSquareQuote, ShieldAlert, Sparkles, Target } from 'lucide-react';

const lensDescriptions = {
  clarify: 'Tighten vague ideas until the team is arguing about something real.',
  assumptions: 'Expose the beliefs hiding underneath confident statements.',
  counterarguments: 'Let the strongest skeptical voice into the room before reality does.',
  evidence: 'Ask what proof would actually change your mind.',
  risks: 'Look for hidden downsides, externalities, and failure modes.',
  'second-order': 'Explore what this idea triggers next, not just first-order wins.',
  'next-step': 'Turn fuzzy thinking into the smallest useful test or decision.',
};

export default function ChallengePage() {
  const { workspace, isReady } = useWorkspace();
  const activeProject = workspace.projects[0];
  const activeSession = workspace.sessions.find((session) => session.id === activeProject?.activeSessionId) ?? null;
  const candidateNodes = activeSession?.nodes.slice(0, 4) ?? [];

  if (!isReady) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-cosmic">
      <TopBar />
      <FloatingOrbs />

      <main className="flex-1 relative z-10 px-4 py-6 md:px-6">
        <section className="max-w-6xl mx-auto">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 rounded-[1.75rem] bio-card">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{
                background: 'rgba(251, 113, 133, 0.08)',
                border: '1px solid rgba(251, 113, 133, 0.18)',
                color: 'var(--accent-coral)',
              }}>
                <ShieldAlert className="w-3.5 h-3.5" />
                Pressure Test
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-bold text-brand">Challenge Mode now challenges the thinking itself.</h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-secondary">
                Open a live session, click any node, and use the new pressure-test panel to generate guiding questions,
                surface assumptions, capture objections, and save better questions, risks, or actions back into the graph.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(20, 12, 42, 0.55)', border: '1px solid rgba(168, 85, 247, 0.12)' }}>
                  <BrainCircuit className="w-5 h-5 mb-2" style={{ color: 'var(--accent-lavender)' }} />
                  <p className="text-xs font-semibold text-brand">Pick a node</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">Select the idea, decision, risk, or question you want to pressure-test.</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(20, 12, 42, 0.55)', border: '1px solid rgba(168, 85, 247, 0.12)' }}>
                  <MessageSquareQuote className="w-5 h-5 mb-2" style={{ color: 'var(--accent-cyan)' }} />
                  <p className="text-xs font-semibold text-brand">Answer the prompts</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">Use critique lenses like assumptions, evidence, and risks to go deeper.</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(20, 12, 42, 0.55)', border: '1px solid rgba(168, 85, 247, 0.12)' }}>
                  <Target className="w-5 h-5 mb-2" style={{ color: 'var(--accent-teal-green)' }} />
                  <p className="text-xs font-semibold text-brand">Save insight</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">Turn the response into a linked question, risk, action, or node revision.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/session"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(251, 113, 133, 0.16))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: 'var(--accent-lavender)',
                  }}
                >
                  Open Live Session
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {activeProject && (
                  <Link
                    href={`/session?projectId=${activeProject.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Resume {activeProject.title}
                  </Link>
                )}
              </div>
            </div>

            <div className="p-6 rounded-[1.75rem] bio-card">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-coral)' }} />
                <h2 className="text-sm font-semibold text-brand">Critique Lenses</h2>
              </div>
              <div className="mt-4 space-y-3">
                {(Object.entries(CHALLENGE_LENS_LABELS) as Array<[keyof typeof CHALLENGE_LENS_LABELS, string]>).map(([lens, label]) => (
                  <div
                    key={lens}
                    className="rounded-2xl px-4 py-3"
                    style={{
                      background: 'rgba(20, 12, 42, 0.48)',
                      border: '1px solid rgba(168, 85, 247, 0.12)',
                    }}
                  >
                    <p className="text-xs font-semibold text-brand">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{lensDescriptions[lens]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="mt-6 p-6 rounded-[1.75rem] bio-card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-brand">Try it on these nodes</h2>
                <p className="mt-1 text-sm text-muted">
                  These are pulled from your active session. Open one in the live graph to use the new pressure-test panel.
                </p>
              </div>
              {activeSession && (
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{
                    background: 'rgba(34, 211, 238, 0.08)',
                    border: '1px solid rgba(34, 211, 238, 0.18)',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  {activeSession.title}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {candidateNodes.length > 0 ? (
                candidateNodes.map((node) => {
                  const suggestedLens = activeSession ? getSuggestedLens(node, activeSession.transcript) : 'clarify';
                  return (
                    <Link
                      key={node.id}
                      href={activeProject ? `/session?projectId=${activeProject.id}` : '/session'}
                      className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
                      style={{
                        background: 'rgba(20, 12, 42, 0.48)',
                        border: '1px solid rgba(168, 85, 247, 0.12)',
                      }}
                    >
                      <p className="text-xs font-semibold text-brand">{node.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{node.summary}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.18)',
                            color: 'var(--accent-lavender)',
                          }}
                        >
                          Suggested: {CHALLENGE_LENS_LABELS[suggestedLens]}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--accent-coral)' }}>Open in session</span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div
                  className="md:col-span-2 xl:col-span-4 rounded-2xl p-5"
                  style={{
                    background: 'rgba(20, 12, 42, 0.48)',
                    border: '1px solid rgba(168, 85, 247, 0.12)',
                  }}
                >
                  <p className="text-sm text-brand">No nodes yet.</p>
                  <p className="mt-1 text-xs text-muted">
                    Start a live session, capture a few ideas, then come back or open the node detail panel directly.
                  </p>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
