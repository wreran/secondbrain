'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionMode,
  Controls,
  Panel,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { type EdgeRelation, type GraphEdge, type GraphNode } from '@/types';
import { NeuronNode } from './NeuronNode';

const nodeTypes = { neuron: NeuronNode as never };

const RELATION_STYLES: Record<
  EdgeRelation,
  {
    stroke: string;
    text: string;
    background: string;
    border: string;
  }
> = {
  extends: {
    stroke: 'rgba(192, 132, 252, 0.7)',
    text: '#e9d5ff',
    background: 'rgba(88, 28, 135, 0.88)',
    border: 'rgba(192, 132, 252, 0.4)',
  },
  supports: {
    stroke: 'rgba(250, 204, 21, 0.78)',
    text: '#fef3c7',
    background: 'rgba(120, 53, 15, 0.88)',
    border: 'rgba(250, 204, 21, 0.42)',
  },
  questions: {
    stroke: 'rgba(96, 165, 250, 0.75)',
    text: '#dbeafe',
    background: 'rgba(30, 58, 138, 0.88)',
    border: 'rgba(96, 165, 250, 0.42)',
  },
  'addresses-risk': {
    stroke: 'rgba(251, 113, 133, 0.78)',
    text: '#ffe4e6',
    background: 'rgba(136, 19, 55, 0.88)',
    border: 'rgba(251, 113, 133, 0.42)',
  },
};

function toFlowNodes(graphNodes: GraphNode[], selectedNodeId: string | null): Node[] {
  return graphNodes.map((node) => ({
    id: node.id,
    type: 'neuron',
    position: node.position,
    data: {
      type: node.type,
      title: node.title,
      summary: node.summary,
      isActive: node.isActive,
      isSelected: node.id === selectedNodeId,
      suggestedBy: node.data?.suggestedBy,
      createdAt: node.createdAt,
      aiCreated: node.data?.aiCreated,
      reactions: node.data?.reactions,
      comments: node.data?.comments,
    },
  }));
}

function toFlowEdges(graphEdges: GraphEdge[], selectedEdgeId: string | null): Edge[] {
  return graphEdges.map((edge) => ({
    ...edge,
    type: 'default',
    animated: edge.type === 'active',
    selected: edge.id === selectedEdgeId,
    data: {
      relation: edge.relation,
    },
    label: edge.label,
    labelStyle: edge.relation
      ? {
          fill: RELATION_STYLES[edge.relation].text,
          fontSize: 10,
          fontWeight: 700,
        }
      : undefined,
    labelShowBg: Boolean(edge.relation),
    labelBgPadding: edge.relation ? [8, 4] : undefined,
    labelBgBorderRadius: edge.relation ? 999 : undefined,
    labelBgStyle: edge.relation
      ? {
          fill: RELATION_STYLES[edge.relation].background,
          stroke: RELATION_STYLES[edge.relation].border,
          strokeWidth: 1,
        }
      : undefined,
    style: {
      stroke:
        edge.id === selectedEdgeId
          ? '#facc15'
          : edge.relation
            ? RELATION_STYLES[edge.relation].stroke
            : edge.type === 'active'
              ? 'rgba(168, 85, 247, 0.5)'
              : 'rgba(168, 85, 247, 0.2)',
      strokeWidth: edge.id === selectedEdgeId ? 3 : edge.relation ? 2.2 : edge.type === 'active' ? 2 : 1,
    },
  }));
}

function fromFlowNodes(graphNodes: GraphNode[], flowNodes: Node[]) {
  return flowNodes.map((flowNode) => {
    const original = graphNodes.find((node) => node.id === flowNode.id);
    if (!original) {
      throw new Error(`Missing original node for ${flowNode.id}`);
    }

    return {
      ...original,
      position: flowNode.position,
    };
  });
}

function fromFlowEdges(flowEdges: Edge[]): GraphEdge[] {
  return flowEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.animated ? 'active' : 'inactive',
    label: typeof edge.label === 'string' ? edge.label : undefined,
    relation:
      edge.data && typeof edge.data === 'object' && 'relation' in edge.data
        ? (edge.data.relation as EdgeRelation | undefined)
        : undefined,
  }));
}

interface NeuralGraphProps {
  edges: GraphEdge[];
  nodes: GraphNode[];
  onSelectNode: (id: string | null) => void;
  onUpdateEdges: (edges: GraphEdge[]) => void;
  onUpdateNodes: (nodes: GraphNode[]) => void;
  selectedNodeId: string | null;
}

export function NeuralGraph({
  edges,
  nodes,
  onSelectNode,
  onUpdateEdges,
  onUpdateNodes,
  selectedNodeId,
}: NeuralGraphProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const resolvedSelectedEdgeId = selectedEdgeId && edges.some((edge) => edge.id === selectedEdgeId) ? selectedEdgeId : null;
  const flowNodes = useMemo(() => toFlowNodes(nodes, selectedNodeId), [nodes, selectedNodeId]);
  const flowEdges = useMemo(() => toFlowEdges(edges, resolvedSelectedEdgeId), [edges, resolvedSelectedEdgeId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!resolvedSelectedEdgeId) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onUpdateEdges(edges.filter((edge) => edge.id !== resolvedSelectedEdgeId));
        setSelectedEdgeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [edges, onUpdateEdges, resolvedSelectedEdgeId]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedEdgeId(null);
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const structuralChanges = changes.filter(
        (change) =>
          change.type === 'position' ||
          change.type === 'remove' ||
          change.type === 'replace' ||
          change.type === 'add'
      );

      if (structuralChanges.length === 0) {
        return;
      }

      const nextFlowNodes = applyNodeChanges(structuralChanges, flowNodes);
      onUpdateNodes(fromFlowNodes(nodes, nextFlowNodes));
    },
    [flowNodes, nodes, onUpdateNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const nextFlowEdges = applyEdgeChanges(changes, flowEdges);
      onUpdateEdges(fromFlowEdges(nextFlowEdges));
    },
    [flowEdges, onUpdateEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const nextFlowEdges = addEdge(
        {
          ...connection,
          id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          animated: true,
        },
        flowEdges
      );
      setSelectedEdgeId(null);
      onUpdateEdges(fromFlowEdges(nextFlowEdges));
    },
    [flowEdges, onUpdateEdges]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedEdgeId(null);
    onSelectNode(null);
  }, [onSelectNode]);

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      onSelectNode(null);
      setSelectedEdgeId(edge.id);
    },
    [onSelectNode]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onConnect={handleConnect}
        onEdgesChange={handleEdgesChange}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag
        panOnScroll
        zoomOnScroll
        minZoom={0.1}
        maxZoom={2}
        draggable
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: 'rgba(192, 132, 252, 0.7)', strokeWidth: 2.2 }}
      >
        <Background color="rgba(168, 85, 247, 0.04)" gap={24} size={1} />
        <Controls
          className="!bg-[rgba(16,10,35,0.8)] !border !border-purple-500/20 !rounded-lg"
          showInteractive={false}
        />
        <Panel position="top-left">
          <div
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: 'rgba(16, 10, 35, 0.6)',
              border: '1px solid rgba(168, 85, 247, 0.15)',
              color: 'rgba(192, 132, 252, 0.7)',
            }}
          >
            {nodes.length} nodes | {edges.length} connections | Drag from edge bubbles, or click a line then press Delete
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
