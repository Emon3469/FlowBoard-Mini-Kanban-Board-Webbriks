'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { notificationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export function IconRail() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const pathname = usePathname() ?? '';

  const unread = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const unreadCount = unread.data?.data.count ?? 0;

  const boardsActive = pathname === '/dashboard' || pathname.startsWith('/boards');
  const inboxActive = pathname.startsWith('/inbox');

  return (
    <aside className="w-[64px] bg-surface border-r border-outline flex flex-col items-center py-4 z-50 shrink-0 h-full justify-between">
      <div className="flex flex-col gap-3 items-center w-full">
        {/* Logo */}
        <Link href="/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center mb-1" title="FlowBoard">
          <img src="/logo.png" alt="FlowBoard Logo" className="w-full h-full object-contain" />
        </Link>

        {/* Boards / dashboard */}
        <Link href="/dashboard" title="Boards" className="relative w-full flex justify-center group">
          {boardsActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
          <span className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            boardsActive ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'
          )}>
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
          </span>
        </Link>

        {/* Ask AI */}
        <button onClick={() => window.dispatchEvent(new Event('flowboard:ask-ai'))} title="Ask AI" className="w-full flex justify-center group">
          <span className="w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </span>
        </button>

        {/* Search */}
        <button onClick={() => window.dispatchEvent(new Event('flowboard:search'))} title="Search (⌘K)" className="w-full flex justify-center group">
          <span className="w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
        </button>

        {/* Notifications / inbox */}
        <Link href="/inbox" title="Inbox" className="w-full flex justify-center group">
          <span className={cn(
            'relative w-10 h-10 rounded-xl transition-colors flex items-center justify-center',
            inboxActive ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'
          )}>
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-surface">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
        </Link>
      </div>

      {/* Bottom: theme toggles */}
      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={() => { if (theme === 'dark') toggleTheme(); }}
          className={cn(
            'w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center',
            theme === 'light' ? 'text-primary bg-surface-variant' : 'text-on-surface-variant'
          )}
          title="Light mode"
        >
          <span className="material-symbols-outlined text-[20px]">light_mode</span>
        </button>
        <button
          onClick={() => { if (theme === 'light') toggleTheme(); }}
          className={cn(
            'w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center',
            theme === 'dark' ? 'text-primary bg-surface-variant' : 'text-on-surface-variant'
          )}
          title="Dark mode"
        >
          <span className="material-symbols-outlined text-[20px]">dark_mode</span>
        </button>
      </div>
    </aside>
  );
}
