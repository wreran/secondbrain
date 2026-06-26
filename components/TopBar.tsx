'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Play, Zap, BarChart3, FolderTree, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/session', label: 'Live Session', icon: Play },
  { href: '/project', label: 'Project', icon: FolderTree },
  { href: '/challenge', label: 'Pressure Test', icon: Zap },
  { href: '/report', label: 'Report', icon: BarChart3 },
  { href: '/dashboard', label: 'Dashboard', icon: Brain },
];

export function TopBar() {
  const pathname = usePathname();
  return (
    <header className="h-14 flex items-center justify-between px-4 sticky top-0 z-50" style={{
      background: 'rgba(16, 10, 35, 0.7)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(192, 132, 252, 0.15)',
    }}>
      <Link href="/" className="flex items-center gap-2">
        <Brain className="w-5 h-5" style={{ color: 'var(--accent-purple)', filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.5))' }} />
        <span className="text-lg font-semibold tracking-wide brand-title" style={{
          color: 'var(--text-primary)',
          textShadow: '0 0 10px rgba(168, 85, 247, 0.3)',
        }}>
          Second Brain
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all font-medium',
                isActive ? 'tab-active' : 'hover:bg-white/5'
              )}
              style={{
                color: isActive ? 'var(--accent-purple)' : 'rgba(200, 190, 230, 0.6)',
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? 'var(--accent-purple)' : 'inherit' }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Session status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{
            backgroundColor: 'var(--accent-teal-green)',
            boxShadow: '0 0 6px rgba(45, 212, 191, 0.4)',
          }} />
          <span className="text-xs hidden sm:inline" style={{ color: 'rgba(200, 190, 230, 0.5)' }}>Active</span>
        </div>
        <button className="md:hidden p-2 rounded-lg hover:bg-white/5">
          <Menu className="w-4 h-4" style={{ color: 'var(--accent-lavender)' }} />
        </button>
      </div>
    </header>
  );
}
