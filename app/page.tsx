'use client';

import Link from 'next/link';
import { Brain, Zap, Lightbulb, AlertTriangle, ArrowRight } from 'lucide-react';
import { NeuralBackground, FloatingOrbs, StarfieldSparkles } from '@/components/NeuralBackground';
import { RotatingBrainHero } from '@/components/RotatingBrain';

const features = [
  { icon: Lightbulb, title: 'Capture Conversations', desc: 'Record discussions and let AI extract key ideas automatically.', color: '#8b5cf6' },
  { icon: Brain, title: 'Map Ideas', desc: 'Visualize connections between thoughts as a living neural network.', color: '#d946ef' },
  { icon: Zap, title: 'Pressure-Test Ideas', desc: 'Guiding questions and critiques help the team sharpen weak thinking fast.', color: '#fb7185' },
  { icon: AlertTriangle, title: 'Generate Next Steps', desc: 'AI transforms your brainstorming into actionable plans and reports.', color: '#3b82f6' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#050510] overflow-hidden">
      <NeuralBackground />
      <StarfieldSparkles />
      <FloatingOrbs />

      {/* Hero Section - Single Integrated Scene */}
      <section className="relative flex-1 flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: '100vh' }}>
        {/* Background gradient */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #160b2e 0%, #0a0618 35%, #050510 65%, #030208 100%)',
          }}
        />

        {/* 3D Brain Hero - z-index 1, behind content */}
        <div className="absolute inset-0 z-10" style={{ opacity: 0.82 }}>
          <RotatingBrainHero />
        </div>

        {/* Dark readability overlay - z-index 2 */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 55% 40% at 50% 38%,
                rgba(5, 5, 16, 0.58) 0%,
                rgba(5, 5, 16, 0.34) 24%,
                rgba(5, 5, 16, 0.12) 48%,
                transparent 72%
              ),
              linear-gradient(to bottom,
                rgba(5, 5, 16, 0.08) 0%,
                rgba(5, 5, 16, 0.16) 40%,
                rgba(5, 5, 16, 0.34) 68%,
                rgba(5, 5, 16, 0.68) 100%
              )
            `,
          }}
        />

        {/* Hero Content - z-index 3, always on top */}
        <div className="relative z-30 flex flex-col items-center justify-center text-center px-4" style={{
          maxWidth: '850px',
          width: '100%',
          paddingTop: '12vh',
          paddingBottom: '8vh',
        }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6" style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: 'rgba(167,139,250,0.85)',
            backdropFilter: 'blur(10px)',
          }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: 'rgba(139,92,246,0.8)',
              boxShadow: '0 0 6px rgba(139,92,246,0.5)',
            }} />
            AI-Powered Idea Mapping
          </div>

          {/* Main Title - "SECOND BRAIN" */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4" style={{
            background: 'linear-gradient(135deg, #e0d4ff, #f0a0e8, #ffb0b0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.35))',
            letterSpacing: '-0.02em',
          }}>
            SECOND BRAIN
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl font-light mb-3 max-w-xl mx-auto" style={{
            color: 'rgba(232, 224, 255, 0.9)',
            textShadow: '0 0 18px rgba(10, 6, 24, 0.45)',
          }}>
            Turn messy discussions into a live idea graph.
          </p>
          <p className="text-sm sm:text-base mb-10 max-w-xl mx-auto" style={{
            color: 'rgba(198, 188, 224, 0.68)',
            textShadow: '0 0 16px rgba(10, 6, 24, 0.35)',
          }}>
            Capture conversations, map ideas, pressure-test assumptions, and generate clear next steps with AI.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link href="/session" className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all w-full sm:w-auto justify-center" style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(217,70,239,0.2))',
              border: '1px solid rgba(139,92,246,0.45)',
              color: 'rgba(196, 181, 253, 0.95)',
              boxShadow: '0 0 25px rgba(139,92,246,0.2), 0 0 50px rgba(139,92,246,0.08)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 35px rgba(139,92,246,0.35), 0 0 70px rgba(139,92,246,0.15)';
              e.currentTarget.style.borderColor = 'rgba(139,92,246,0.65)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(139,92,246,0.2), 0 0 50px rgba(139,92,246,0.08)';
              e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              Start Mapping Ideas <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all w-full sm:w-auto justify-center" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(200,190,230,0.65)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Features Grid - z-index 3 but pushed down */}
        <div className="relative z-30 w-full max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-5 rounded-xl transition-all" style={{
                  background: 'rgba(15, 12, 35, 0.45)',
                  border: '1px solid rgba(139,92,246,0.08)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(139,92,246,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{
                    background: `${f.color}15`,
                    border: `1px solid ${f.color}30`,
                  }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgba(230,220,255,0.85)' }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(180,170,210,0.45)' }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="relative z-10 text-center py-6 text-xs" style={{ color: 'rgba(150,140,180,0.2)' }}>
        Built for students, hackers, and thinkers everywhere.
      </footer>
    </div>
  );
}
