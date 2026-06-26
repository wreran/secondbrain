'use client';

import { useCallback, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { FloatingOrbs } from '@/components/NeuralBackground';
import { NeuralGraph } from '@/components/NeuralGraph';
import { useWorkspace } from '@/lib/use-workspace';
import { updateWorkspaceSession } from '@/lib/workspace-store';
import { Brain } from 'lucide-react';
import { type GraphEdge, type GraphNode } from '@/types';

export function ProjectWorkspace({ projectId }: { projectId?: string | null }) {
  const { workspace, isReady, updateWorkspace } = useWorkspace();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const project = workspace.projects.find((item) => item.id === projectId) ?? workspace.projects[0];
  const session = workspace.sessions.find((item) => item.id === project?.activeSessionId);

  const updateSession = useCallback(
    (updater: Parameters<typeof updateWorkspaceSession>[2]) => {
      if (!session) {
        return;
      }
      updateWorkspace((current) => updateWorkspaceSession(current, session.id, updater));
    },
    [session, updateWorkspace]
  );

  const updateNodes = useCallback((nodes: GraphNode[]) => {
    updateSession((currentSession) => ({ ...currentSession, nodes }));
  }, [updateSession]);

  const updateEdges = useCallback((edges: GraphEdge[]) => {
    updateSession((currentSession) => ({ ...currentSession, edges }));
  }, [updateSession]);

  if (!isReady || !project || !session) {
    return (
      <div className="h-screen flex items-center justify-center bg-cosmic text-brand">
        Loading project...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-cosmic">
      <TopBar />
      <FloatingOrbs />

      <main className="flex-1 relative z-10 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2" style={{
          borderBottom: '1px solid rgba(168, 85, 247, 0.15)',
          background: 'rgba(10, 8, 28, 0.6)',
          backdropFilter: 'blur(20px)',
        }}>
          <div className="flex items-center gap-3">
            <Brain className="w-4 h-4" style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.5))' }} />
            <div>
              <h2 className="text-sm font-semibold text-brand">{project.title}</h2>
              <p className="text-[10px] text-muted">{session.nodes.length} nodes · {session.edges.length} connections</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3" style={{ minHeight: 0 }}>
          <NeuralGraph
            edges={session.edges}
            nodes={session.nodes}
            onSelectNode={setSelectedNodeId}
            onUpdateEdges={updateEdges}
            onUpdateNodes={updateNodes}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </main>
    </div>
  );
}
