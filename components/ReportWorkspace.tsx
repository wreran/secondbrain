'use client';

import { TopBar } from '@/components/TopBar';
import { FloatingOrbs } from '@/components/NeuralBackground';
import { useWorkspace } from '@/lib/use-workspace';
import { FileText, Download, Brain, Lightbulb, CheckSquare, AlertTriangle, HelpCircle, ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';

export function ReportWorkspace({ projectId }: { projectId?: string | null }) {
  const { workspace, isReady } = useWorkspace();
  const project = workspace.projects.find((item) => item.id === projectId) ?? workspace.projects[0];
  const session = workspace.sessions.find((item) => item.id === project?.activeSessionId);
  const report = session?.report;

  if (!isReady || !project || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cosmic text-brand">
        Loading report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col bg-cosmic">
        <TopBar />
        <FloatingOrbs />
        <main className="flex-1 relative z-10 p-6 flex items-center justify-center">
          <div className="max-w-lg w-full p-8 rounded-2xl text-center bio-card">
            <FileText className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--accent-cyan)' }} />
            <h1 className="text-2xl font-bold text-brand mb-2">No Report Yet</h1>
            <p className="text-sm text-muted mb-6">
              Run transcript analysis from the session page to generate your first report.
            </p>
            <Link
              href={`/session?projectId=${project.id}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
              style={{
                background: 'rgba(34,211,238,0.12)',
                border: '1px solid rgba(34,211,238,0.25)',
                color: 'var(--accent-cyan)',
              }}
            >
              Open Session
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    { label: 'Total Nodes', value: report.totalNodes, icon: Brain, color: 'var(--accent-cyan)' },
    { label: 'Ideas', value: report.ideas, icon: Lightbulb, color: 'var(--accent-cyan)' },
    { label: 'Action Items', value: report.actionItems, icon: CheckSquare, color: 'var(--accent-green)' },
    { label: 'Decisions', value: report.keyDecisions, icon: FileText, color: 'var(--accent-coral)' },
    { label: 'Risks', value: report.risks, icon: AlertTriangle, color: 'var(--accent-coral)' },
    { label: 'Questions', value: report.questions, icon: HelpCircle, color: 'var(--accent-purple)' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-cosmic">
      <TopBar />
      <FloatingOrbs />

      <main className="flex-1 relative z-10 p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6" style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.5))' }} />
              <h1 className="text-2xl font-bold text-brand">Session Report</h1>
            </div>
            <p className="text-sm text-muted">
              {report.sessionTitle} · Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cyan-glow-hover"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(14,165,233,0.2))',
              border: '1px solid rgba(34, 211, 238, 0.4)',
              color: 'var(--accent-cyan)',
            }}
          >
            <Download className="w-4 h-4" />
            PDF Export Next
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-4 rounded-xl text-center bio-card"
              >
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                <div className="text-2xl font-bold text-brand">{stat.value}</div>
                <div className="text-[10px] mt-0.5 text-muted">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="mb-8 p-6 rounded-xl bio-card">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-brand">
            <Brain className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
            AI Summary
          </h2>
          <p className="text-sm leading-relaxed text-secondary">
            {report.summary}
          </p>
        </div>

        <div className="p-6 rounded-xl mb-8 bio-card" style={{ borderColor: 'rgba(251,113,133,0.15)' }}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-brand">
            <ArrowRight className="w-4 h-4" style={{ color: 'var(--accent-coral)' }} />
            Next Steps
          </h2>
          <div className="space-y-3">
            {report.nextSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                  style={{
                    background: 'rgba(34,211,238,0.1)',
                    border: '1px solid rgba(34,211,238,0.2)',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  {index + 1}
                </div>
                <p className="text-sm text-secondary">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bio-card">
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 text-muted">
              <Calendar className="w-3.5 h-3.5" />
              Session Details
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Session ID</span>
                <span className="font-mono text-cyan">{report.sessionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Transcripts</span>
                <span className="text-secondary">{report.totalTranscripts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Generated</span>
                <span className="text-secondary">{new Date(report.generatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bio-card">
            <h3 className="text-xs font-semibold mb-3 text-muted">Node Distribution</h3>
            <div className="space-y-2">
              {[
                { label: 'Ideas', count: report.ideas, color: 'var(--accent-cyan)' },
                { label: 'Actions', count: report.actionItems, color: 'var(--accent-green)' },
                { label: 'Decisions', count: report.keyDecisions, color: 'var(--accent-coral)' },
                { label: 'Risks', count: report.risks, color: 'var(--accent-coral)' },
                { label: 'Questions', count: report.questions, color: 'var(--accent-purple)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}80` }} />
                  <span className="text-xs flex-1 text-muted">{item.label}</span>
                  <div className="h-1.5 rounded-full flex-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${report.totalNodes > 0 ? (item.count / report.totalNodes) * 100 : 0}%`,
                        backgroundColor: item.color,
                        boxShadow: `0 0 6px ${item.color}60`,
                      }}
                    />
                  </div>
                  <span className="text-xs w-6 text-right text-muted">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
