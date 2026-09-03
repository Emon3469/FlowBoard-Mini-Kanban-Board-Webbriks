'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface SecondarySidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SecondarySidebar({ collapsed, onToggleCollapse }: SecondarySidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(false);

  if (collapsed) return null;

  const isDashboard = pathname === '/dashboard';
  const isBoards = pathname?.startsWith('/boards');

  const userInitials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <aside className="w-[260px] bg-surface border-r border-outline flex flex-col z-40 shrink-0 h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <img src="/logo.png" alt="FlowBoard Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-semibold text-[14px] leading-tight">FlowBoard</h1>
            <p className="text-[11px] text-on-surface-variant">CR Management</p>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
        </button>
      </div>

      {/* Team Card */}
      <div className="px-4 mb-4">
        <div className="border border-outline rounded-xl p-3 flex flex-col gap-3 shadow-sm bg-surface">
          <div className="flex items-center justify-between cursor-pointer"
            onClick={() => {
              // TODO: Implement team details functionality
              alert('Team details functionality coming soon!');
            }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">apps</span>
              <span className="font-semibold text-[13px] leading-tight">Mesh<br />Product Team</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-on-surface-variant font-medium">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">group</span> 24
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">chat_bubble</span> 83
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">folder</span> 12
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-0.5">
        <Link
          href="/dashboard"
          className={`flex items-center px-3 py-2 rounded-lg transition-colors group ${
            isDashboard && !isBoards
              ? 'bg-primary-container text-primary font-medium'
              : 'text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">dashboard</span>
          <span className="text-[13px]">Dashboard</span>
        </Link>

        <Link
          href="/dashboard"
          className={`flex items-center px-3 py-2 rounded-lg transition-colors group ${
            isBoards
              ? 'bg-primary-container text-primary font-medium'
              : 'text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">monetization_on</span>
          <span className="text-[13px]">Deals</span>
        </Link>

        {[
          { icon: 'description', label: 'Notes', href: '/notes' },
          { icon: 'inbox', label: 'Inbox', href: '/inbox' },
          { icon: 'bar_chart', label: 'Reports', href: '/reports' },
          { icon: 'account_tree', label: 'Workflows', href: '#' },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors group"
            onClick={item.label === 'Workflows' ? () => {
              // TODO: Implement workflows functionality
              alert('Workflows functionality coming soon!');
            } : undefined}
          >
            <span className="material-symbols-outlined mr-3 text-[18px]">{item.icon}</span>
            <span className="font-medium text-[13px]">{item.label}</span>
          </a>
        ))}

        {/* Favorites */}
        <div className="pt-4 pb-1">
          <div className="flex items-center justify-between px-3 mb-1 text-on-surface-variant">
            <div
              className="flex items-center gap-1 cursor-pointer hover:text-on-surface"
              onClick={() => setFavoritesOpen(!favoritesOpen)}
            >
              <span className="material-symbols-outlined text-[16px]">
                {favoritesOpen ? 'expand_less' : 'expand_more'}
              </span>
              <span className="font-medium text-[12px]">Favorites</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-on-surface">more_horiz</span>
              <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-on-surface"
                onClick={() => {
                  // TODO: Implement add to favorites functionality
                  alert('Add to favorites functionality coming soon!');
                }}
              >add</span>
            </div>
          </div>
          {favoritesOpen && (
            <div className="space-y-0.5">
              {[
                { icon: 'corporate_fare', label: 'Companies' },
                { icon: 'person', label: 'Contacts' },
                { icon: 'event', label: 'Meetings' },
              ].map((item) => (
                <a
                  key={item.label}
                  href="#"
                  className="flex items-center justify-between px-3 py-1.5 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors ml-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span className="text-[13px]">{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-orange-400 text-[14px]">star</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="pt-2 pb-1">
          <div className="flex items-center justify-between px-3 mb-1 text-on-surface-variant">
            <div
              className="flex items-center gap-1 cursor-pointer hover:text-on-surface"
              onClick={() => {
                setProjectsOpen(!projectsOpen);
                // TODO: Implement projects functionality to create/dashboard
                alert('Projects functionality to create dashboard coming soon!');
              }}
            >
              <span className="material-symbols-outlined text-[16px]">
                {projectsOpen ? 'expand_less' : 'expand_more'}
              </span>
              <span className="font-medium text-[12px]">Projects</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-on-surface">more_horiz</span>
              <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-on-surface">add</span>
            </div>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="pt-4 border-t border-outline mt-4">
          {[
            { icon: 'extension', label: 'Integrations' },
            { icon: 'settings', label: 'Settings' },
            { icon: 'headset_mic', label: 'Help Center' },
          ].map((item) => (
            <a
              key={item.label}
              href="#"
              className="flex items-center px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors group"
              onClick={item.label === 'Integrations' ? () => {
                // TODO: Implement integrations functionality
                alert('Integrations functionality coming soon!');
              } : item.label === 'Help Center' ? () => {
                // TODO: Implement Help Support using Vapi
                alert('Help Support powered by Vapi coming soon! (Using your free credit)');
              } : undefined}
            >
              <span className="material-symbols-outlined mr-3 text-[18px]">{item.icon}</span>
              <span className="font-medium text-[13px]">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-outline cursor-pointer hover:bg-surface-variant transition-colors flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold">
            {userInitials}
          </div>
          <div>
            <h4 className="font-medium text-[13px] leading-tight">{user?.name ?? 'User'}</h4>
            <p className="text-[11px] text-on-surface-variant">{user?.email ?? ''}</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
      </div>
    </aside>
  );
}
