'use client';

import { Brain, Mic, Plus, Square } from 'lucide-react';

interface BottomControlsProps {
  canAnalyze: boolean;
  isAnalyzing: boolean;
  isRecording: boolean;
  onAddThought: () => void;
  onAnalyze: () => void;
  onToggleRecording: () => void;
}

export function BottomControls({
  canAnalyze,
  isAnalyzing,
  isRecording,
  onAddThought,
  onAnalyze,
  onToggleRecording,
}: BottomControlsProps) {
  return (
    <div className="h-16 flex items-center justify-center gap-4 px-6 sticky bottom-0 z-50" style={{
      background: 'rgba(16, 10, 35, 0.7)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(192, 132, 252, 0.15)',
    }}>
      <button
        onClick={onToggleRecording}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-semibold text-sm coral-glow-hover"
        style={{
          background: isRecording
            ? 'rgba(251, 113, 133, 0.15)'
            : 'rgba(168, 85, 247, 0.15)',
          border: `1px solid ${isRecording ? 'rgba(251, 113, 133, 0.4)' : 'rgba(168, 85, 247, 0.35)'}`,
          color: isRecording ? 'var(--accent-coral)' : 'var(--accent-purple)',
          boxShadow: isRecording
            ? '0 0 15px rgba(251, 113, 133, 0.25)'
            : '0 0 15px rgba(168, 85, 247, 0.2)',
        }}
      >
        {isRecording ? (
          <>
            <Square className="w-4 h-4" fill="currentColor" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Start Recording
          </>
        )}
      </button>

      <button
        onClick={onAnalyze}
        disabled={!canAnalyze || isAnalyzing}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-semibold text-sm green-glow-hover disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'rgba(45, 212, 191, 0.08)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          color: 'var(--accent-teal-green)',
        }}
      >
        <Brain className="w-4 h-4" />
        {isAnalyzing ? 'Analyzing...' : 'Analyze Session'}
      </button>

      <button
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-semibold text-sm pink-glow-hover"
        style={{
          background: 'rgba(236, 72, 153, 0.08)',
          border: '1px solid rgba(236, 72, 153, 0.25)',
          color: 'var(--accent-pink)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 15px rgba(236, 72, 153, 0.25)';
          e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.25)';
        }}
        onClick={onAddThought}
      >
        <Plus className="w-4 h-4" />
        Add Thought
      </button>
    </div>
  );
}
