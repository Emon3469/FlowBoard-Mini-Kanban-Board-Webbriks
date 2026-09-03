'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 dark:bg-[#161B22]/80 backdrop-blur-xl border-b border-outline dark:border-[#30363D]">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between h-14 px-5">
        {/* Logo + Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="app-mark w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="3" y="3" width="7" height="18" rx="1.5" fill="currentColor" opacity="0.9" />
              <rect x="14" y="3" width="7" height="12" rx="1.5" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <span className="font-bold text-[16px] tracking-tight text-on-surface dark:text-white group-hover:text-primary transition-colors">
            FlowBoard
          </span>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface-variant dark:hover:bg-[#21262D] transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* User Menu */}
          {user && (
            <div className="flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] font-medium text-on-surface dark:text-white leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-on-surface-variant leading-tight">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="ml-2 p-2 rounded-lg hover:bg-surface-variant dark:hover:bg-[#21262D] transition-colors"
                title="Sign out"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
