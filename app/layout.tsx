import type { Metadata } from 'next';
import './globals.css';
import { NeuralBackground, FloatingOrbs } from '@/components/NeuralBackground';

export const metadata: Metadata = {
  title: 'Second Brain - Neural Idea Mapping',
  description: 'Turn messy student discussions into a live idea graph.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-body">
        <div className="relative min-h-screen bg-[#050210] text-white overflow-hidden bio-dot-grid">
          <NeuralBackground />
          <FloatingOrbs />
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}