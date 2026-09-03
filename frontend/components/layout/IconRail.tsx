'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-context';

export function IconRail() {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-[64px] bg-surface border-r border-outline flex flex-col items-center py-4 z-50 shrink-0 h-full justify-between">
      <div className="flex flex-col gap-4 items-center w-full">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2">
          <img src="/logo.png" alt="FlowBoard Logo" className="w-full h-full object-contain" />
        </div>
        {/* Active: Board/Grid */}
        <div className="relative w-full flex justify-center group cursor-pointer">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-[20px]">grid_view</span>
          </div>
        </div>
        {/* Chat */}
        <div className="w-full flex justify-center group cursor-pointer">
          <div className="w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">chat</span>
          </div>
        </div>
        {/* Sync */}
        <div className="w-full flex justify-center group cursor-pointer">
          <div className="w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center text-orange-400">
            <span className="material-symbols-outlined text-[20px]">sync</span>
          </div>
        </div>
        {/* Add */}
        <div className="w-full flex justify-center group cursor-pointer mt-2 border-t border-outline pt-4">
          <div className="w-8 h-8 rounded-full hover:bg-surface-variant transition-colors flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </div>
        </div>
      </div>
      {/* Bottom: Theme Toggles */}
      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={() => { if (theme === 'dark') toggleTheme(); }}
          className={`w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center ${
            theme === 'light' ? 'text-primary bg-surface-variant' : 'text-on-surface-variant'
          }`}
          title="Light mode"
        >
          <span className="material-symbols-outlined text-[20px]">light_mode</span>
        </button>
        <button
          onClick={() => { if (theme === 'light') toggleTheme(); }}
          className={`w-10 h-10 rounded-xl hover:bg-surface-variant transition-colors flex items-center justify-center ${
            theme === 'dark' ? 'text-primary bg-surface-variant' : 'text-on-surface-variant'
          }`}
          title="Dark mode"
        >
          <span className="material-symbols-outlined text-[20px]">dark_mode</span>
        </button>
      </div>
    </aside>
  );
}
