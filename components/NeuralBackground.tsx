'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string }[] = [];
    const PARTICLE_COUNT = 80;
    const CONNECTION_DIST = 150;

    const colors = [
      'rgba(139, 92, 246, ',
      'rgba(217, 70, 239, ',
      'rgba(59, 130, 246, ',
      'rgba(167, 139, 250, ',
      'rgba(244, 114, 182, ',
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Draw particle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (p.opacity * 0.3) + ')';
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.opacity + ')';
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}

export function FloatingOrbs() {
  return (
    <>
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none z-0 animate-float-orb-slow" style={{
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 70%)',
        filter: 'blur(40px)',
        animation: 'float-orb-slow 30s ease-in-out infinite',
      }} />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none z-0 animate-float-orb-fast" style={{
        background: 'radial-gradient(circle, rgba(217, 70, 239, 0.06), transparent 70%)',
        filter: 'blur(50px)',
        animation: 'float-orb-fast 25s ease-in-out infinite',
      }} />
      <div className="fixed top-1/2 right-1/3 w-64 h-64 rounded-full pointer-events-none z-0" style={{
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05), transparent 70%)',
        filter: 'blur(35px)',
        animation: 'breathe 8s ease-in-out infinite',
      }} />
      <div className="fixed bottom-1/3 left-1/3 w-72 h-72 rounded-full pointer-events-none z-0" style={{
        background: 'radial-gradient(circle, rgba(244, 114, 182, 0.04), transparent 70%)',
        filter: 'blur(45px)',
        animation: 'breathe 10s ease-in-out infinite 2s',
      }} />
    </>
  );
}

export function StarfieldSparkles() {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const sparkles = useMemo(() => (
    Array.from({ length: 42 }, (_, index) => {
      const x = pseudoRandom(index + 1) * 100;
      const y = pseudoRandom(index + 101) * 100;
      const size = 1.5 + pseudoRandom(index + 201) * 3.2;
      const delay = pseudoRandom(index + 301) * 8;
      const duration = 4.5 + pseudoRandom(index + 401) * 5.5;
      const opacity = 0.18 + pseudoRandom(index + 501) * 0.34;
      const hue = pseudoRandom(index + 601);
      const color = hue > 0.72
        ? 'rgba(255, 240, 188, 0.95)'
        : hue > 0.4
          ? 'rgba(232, 220, 255, 0.9)'
          : 'rgba(199, 210, 254, 0.88)';

      return {
        id: index,
        x,
        y,
        size,
        delay,
        duration,
        opacity,
        color,
      };
    })
  ), []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="absolute rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            background: sparkle.color,
            opacity: sparkle.opacity,
            boxShadow: `0 0 ${sparkle.size * 6}px ${sparkle.color}`,
            animation: `star-twinkle ${sparkle.duration}s ease-in-out ${sparkle.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
