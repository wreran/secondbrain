'use client';

import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  type NodeComment,
  type NodeReactionCounts,
  type NodeType,
} from '@/types';

interface NeuronNodeData {
  isActive?: boolean;
  isSelected?: boolean;
  suggestedBy?: string;
  summary: string;
  title: string;
  type?: NodeType;
  createdAt?: number;
  aiCreated?: boolean;
  reactions?: NodeReactionCounts;
  comments?: NodeComment[];
}

const HANDLE_STYLES = {
  top: {
    top: '-10px',
    left: '50%',
    transform: 'translate(-50%, 0)',
  },
  right: {
    top: '50%',
    right: '-10px',
    transform: 'translate(0, -50%)',
  },
  bottom: {
    bottom: '-10px',
    left: '50%',
    transform: 'translate(-50%, 0)',
  },
  left: {
    top: '50%',
    left: '-10px',
    transform: 'translate(0, -50%)',
  },
} as const;

function NeuronNodeInner(props: NodeProps) {
  const data = props.data as unknown as NeuronNodeData;
  const knownTypes = Object.keys(NODE_TYPE_COLORS) as NodeType[];
  const type = (data.type as NodeType) || 'idea';
  const tc = knownTypes.includes(type) ? NODE_TYPE_COLORS[type] : NODE_TYPE_COLORS.idea;
  const isActive = data.isActive || false;
  const isSelected = data.isSelected || false;
  const shouldShimmer = Boolean(data.aiCreated && isActive);
  const reactions = data.reactions ?? { up: 0, neutral: 0, down: 0 };
  const comments = data.comments ?? [];
  const totalReactions = reactions.up + reactions.neutral + reactions.down;
  const hoverComments = comments.slice(-3);
  const gc = isSelected ? 'rgba(236, 72, 153, 0.5)' : 'rgba(168, 85, 247, 0.4)';
  const ig = isSelected ? 'rgba(236, 72, 153, 0.08)' : 'rgba(168, 85, 247, 0.06)';
  const pinnedCommentPositions = [
    '-top-10 -left-16 rotate-[-6deg]',
    '-top-12 -right-16 rotate-[5deg]',
    'bottom-2 -right-20 rotate-[-4deg]',
  ];
  const handleBaseStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '999px',
    background:
      'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.42), rgba(192,132,252,0.26) 42%, rgba(88,28,135,0.18) 100%)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: `0 0 0 2px rgba(10, 6, 25, 0.5), 0 0 10px rgba(192, 132, 252, 0.14)`,
    opacity: isSelected ? 0.55 : 0.22,
    zIndex: 30,
    transition: 'opacity 180ms ease, transform 180ms ease, box-shadow 180ms ease',
  } as const;

  return (
    <div
      className="group relative flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-500"
      style={{
        width: '190px',
        minHeight: '85px',
        background: 'linear-gradient(160deg, rgba(20, 12, 42, 0.85), rgba(10, 6, 25, 0.9))',
        borderColor: isSelected ? 'rgba(236, 72, 153, 0.5)' : 'rgba(168, 85, 247, 0.15)',
        borderWidth: '1px',
        borderStyle: 'solid',
        boxShadow: isActive
          ? `0 0 25px ${gc}, 0 0 50px rgba(168, 85, 247, 0.15), inset 0 0 20px ${ig}`
          : `0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 15px ${ig}`,
        animation: 'node-enter-bio 0.6s ease-out forwards',
      }}
    >
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="group-hover:!opacity-70"
        style={{ ...handleBaseStyle, ...HANDLE_STYLES.top }}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="group-hover:!opacity-70"
        style={{ ...handleBaseStyle, ...HANDLE_STYLES.right }}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="group-hover:!opacity-70"
        style={{ ...handleBaseStyle, ...HANDLE_STYLES.bottom }}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="group-hover:!opacity-70"
        style={{ ...handleBaseStyle, ...HANDLE_STYLES.left }}
        isConnectable
      />

      {(isActive || isSelected) && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: `1px solid ${isSelected ? 'rgba(236, 72, 153, 0.35)' : 'rgba(168, 85, 247, 0.25)'}`,
            boxShadow: isSelected
              ? '0 0 30px rgba(236, 72, 153, 0.3), 0 0 60px rgba(168, 85, 247, 0.15)'
              : '0 0 25px rgba(168, 85, 247, 0.25)',
            animation: isActive ? 'pulse-glow-purple 4s ease-in-out infinite' : undefined,
          }}
        />
      )}

      {shouldShimmer && (
        <>
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: '1px solid rgba(255, 214, 102, 0.45)',
              boxShadow:
                '0 0 14px rgba(255, 214, 102, 0.32), 0 0 28px rgba(255, 214, 102, 0.18), inset 0 0 10px rgba(255, 214, 102, 0.08)',
            }}
          />
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none animate-gold-node-shimmer"
            style={{
              background:
                'linear-gradient(115deg, transparent 0%, transparent 32%, rgba(255, 214, 102, 0.2) 44%, rgba(255, 244, 200, 0.95) 50%, rgba(255, 214, 102, 0.2) 56%, transparent 68%, transparent 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: '1px',
            }}
          />
        </>
      )}

      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${tc.bg}, transparent 60%)`,
          opacity: isActive ? 0.5 : 0.25,
        }}
      />

      <div
        className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-widest mb-2 z-10 node-label"
        style={{
          background: `${tc.border}18`,
          color: tc.text,
          border: `1px solid ${tc.border}35`,
          boxShadow: `0 0 10px ${tc.glow}`,
        }}
      >
        {NODE_TYPE_LABELS[type]}
      </div>

      <div
        className="text-center font-bold text-sm leading-tight px-3 z-10 node-title"
        style={{
          color: '#fff',
          textShadow: `0 0 12px ${gc}, 0 0 24px rgba(168, 85, 247, 0.15)`,
        }}
      >
        {data.title}
      </div>

      <div className="text-center text-xs mt-1.5 px-3 opacity-60 z-10 node-description" style={{ color: tc.text }}>
        {data.summary}
      </div>

      {totalReactions > 0 && (
        <div
          className="mt-2 flex items-center gap-1.5 rounded-full px-2 py-1 z-10"
          style={{
            background: 'rgba(8, 6, 20, 0.78)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 12px rgba(0,0,0,0.22)',
          }}
        >
          {reactions.up > 0 && <span className="text-[11px]">👍 {reactions.up}</span>}
          {reactions.neutral > 0 && <span className="text-[11px]">😐 {reactions.neutral}</span>}
          {reactions.down > 0 && <span className="text-[11px]">👎 {reactions.down}</span>}
        </div>
      )}

      {data.suggestedBy && (
        <div className="text-[10px] mt-1.5 z-10 opacity-50" style={{ color: tc.text }}>
          suggested by {data.suggestedBy}
        </div>
      )}

      {hoverComments.map((comment, index) => (
        <div
          key={comment.id}
          className={`absolute ${pinnedCommentPositions[index]} w-28 rounded-xl px-2.5 py-2 pointer-events-none opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100`}
          style={{
            background: 'linear-gradient(180deg, rgba(24, 16, 48, 0.96), rgba(11, 8, 28, 0.94))',
            border: '1px solid rgba(255, 214, 102, 0.18)',
            boxShadow: '0 14px 30px rgba(0, 0, 0, 0.35), 0 0 24px rgba(255, 214, 102, 0.08)',
            transitionDelay: `${index * 40}ms`,
          }}
        >
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: '#facc15' }}>
            Comment
          </div>
          {comment.merged && (
            <div
              className="mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em]"
              style={{
                background: 'rgba(255, 214, 102, 0.12)',
                border: '1px solid rgba(255, 214, 102, 0.24)',
                color: '#fde68a',
              }}
            >
              Merged
            </div>
          )}
          <p className="mt-1 text-[10px] leading-snug text-brand">
            {comment.text.length > 70 ? `${comment.text.slice(0, 67).trim()}...` : comment.text}
          </p>
        </div>
      ))}

      {[
        { vertical: 'top-2.5', horizontal: 'left-2.5' },
        { vertical: 'top-2.5', horizontal: 'right-2.5' },
        { vertical: 'bottom-2.5', horizontal: 'left-2.5' },
        { vertical: 'bottom-2.5', horizontal: 'right-2.5' },
      ].map((dot, index) => (
        <div
          key={index}
          className={`absolute ${dot.vertical} ${dot.horizontal} w-1 h-1 rounded-full z-10`}
          style={{
            backgroundColor: tc.border,
            boxShadow: `0 0 6px ${tc.glow}`,
            opacity: isActive ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

export const NeuronNode = memo(NeuronNodeInner);
NeuronNode.displayName = 'NeuronNode';
