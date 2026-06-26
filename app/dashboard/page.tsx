'use client';

import { TopBar } from '@/components/TopBar';
import { FloatingOrbs } from '@/components/NeuralBackground';
import { createProject, formatRelativeTime } from '@/lib/workspace-store';
import { useWorkspace } from '@/lib/use-workspace';
import { Brain, FolderTree, Clock, TrendingUp, Play, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { workspace, isReady } = useWorkspace();
  const router = useRouter();
  const activeProjects = workspace.projects.filter((p) => p.status === 'active');
  const completedProjects = workspace.projects.filter((p) => p.status === 'completed');
  const totalIdeas = workspace.projects.reduce((count, project) => count + project.nodeCount, 0);

  const handleCreateProject = () => {
    const { projectId } = createProject(`New Project ${workspace.projects.length + 1}`);
    router.push(`/session?projectId=${projectId}`);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cosmic text-brand">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <TopBar />
      <FloatingOrbs />

      <main className="flex-1 relative z-10 p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-6 h-6" style={{ color: 'var(--accent-purple)', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.5))' }} />
            <h1 className="text-2xl font-bold text-brand">Dashboard</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Your neural workspace — {workspace.projects.length} projects, {totalIdeas} ideas mapped
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Projects', value: workspace.projects.length.toString(), icon: FolderTree, color: 'var(--accent-purple)' },
            { label: 'Active Sessions', value: activeProjects.length.toString(), icon: Play, color: 'var(--accent-pink)' },
            { label: 'Ideas Mapped', value: totalIdeas.toString(), icon: Brain, color: 'var(--accent-magenta)' },
            { label: 'Completed', value: completedProjects.length.toString(), icon: TrendingUp, color: 'var(--accent-teal-green)' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bio-card transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="text-2xl font-bold text-brand">{stat.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-brand">Active Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjects.map((project) => (
              <Link
                key={project.id}
                href={`/session?projectId=${project.id}`}
                className="group p-5 rounded-xl transition-all cursor-pointer bio-card hover:scale-[1.02]"
                style={{ borderColor: `${project.color}25` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm text-brand">{project.title}</h3>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{
                    backgroundColor: project.color,
                    boxShadow: `0 0 6px ${project.color}80`,
                  }} />
                </div>
                <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{project.description}</p>

                <div className="mb-3">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${project.progress}%`,
                        background: `linear-gradient(90deg, ${project.color}, ${project.color}80)`,
                        boxShadow: `0 0 8px ${project.color}60`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px]" style={{ color: project.color }}>{project.progress}% complete</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{project.nodeCount} ideas</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(project.lastActive)}
                  </div>
                  <Eye className="w-3 h-3" />
                </div>
              </Link>
            ))}

            <button
              type="button"
              onClick={handleCreateProject}
              className="p-5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px] bio-card hover:scale-[1.02]"
              style={{ borderColor: 'rgba(168, 85, 247, 0.2)', background: 'rgba(168, 85, 247, 0.02)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                <span className="text-xl" style={{ color: 'var(--accent-purple)' }}>+</span>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--accent-purple)' }}>New Project</span>
            </button>
          </div>
        </div>

        {completedProjects.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-brand">Completed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {completedProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-5 rounded-xl opacity-60 bio-card"
                  style={{ background: 'rgba(20, 12, 42, 0.4)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-sm text-brand">{project.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                      background: 'rgba(45, 212, 191, 0.1)',
                      color: 'var(--accent-teal-green)',
                      border: '1px solid rgba(45, 212, 191, 0.2)',
                    }}>Done</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{project.description}</p>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{project.nodeCount} ideas</span>
                    <span>Last active: {formatRelativeTime(project.lastActive)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
