'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { boardApi, favoritesApi, notificationsApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { initialsOf } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

interface SecondarySidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { icon: 'inbox', label: 'Inbox', href: '/inbox', badge: true },
  { icon: 'description', label: 'Notes', href: '/notes' },
  { icon: 'bar_chart', label: 'Reports', href: '/reports' },
  { icon: 'account_tree', label: 'Workflows', href: '/workflows' },
];

export function SecondarySidebar({ collapsed, onToggleCollapse }: SecondarySidebarProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [favOpen, setFavOpen] = useState(true);
  const [projOpen, setProjOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const teamRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const boards = useQuery({ queryKey: ['boards'], queryFn: () => boardApi.list(), enabled: !!user });
  const favorites = useQuery({ queryKey: ['favorites'], queryFn: () => favoritesApi.list(), enabled: !!user });
  const unread = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const boardList = boards.data?.data ?? [];
  const favList = favorites.data?.data ?? [];
  const favIds = useMemo(() => new Set(favList.map((f) => f.boardId)), [favList]);
  const unreadCount = unread.data?.data.count ?? 0;

  const toggleFav = useMutation({
    mutationFn: async ({ boardId, on }: { boardId: string; on: boolean }) => {
      if (on) await favoritesApi.add(boardId);
      else await favoritesApi.remove(boardId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const createBoard = useMutation({
    mutationFn: (name: string) => boardApi.create(name),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowCreate(false);
      setNewName('');
      setCreateError(null);
      router.push(`/boards/${result.data.id}`);
    },
    onError: (e) => setCreateError(e instanceof Error ? e.message : 'Could not create the project.'),
  });

  // Close popovers on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (teamOpen && teamRef.current && !teamRef.current.contains(e.target as Node)) setTeamOpen(false);
      if (accountOpen && accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [teamOpen, accountOpen]);

  if (collapsed) return null;

  const doLogout = async () => {
    setTeamOpen(false);
    setAccountOpen(false);
    await logout();
    router.replace('/login');
  };

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const boardActive = (id: string) => pathname === `/boards/${id}`;

  const navItemClass = (active: boolean) =>
    cn(
      'flex items-center px-3 py-2 rounded-lg transition-colors group',
      active ? 'bg-primary-container text-primary font-medium' : 'text-on-surface-variant hover:bg-surface-variant'
    );

  return (
    <aside className="w-[260px] bg-surface border-r border-outline flex flex-col z-40 shrink-0 h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="FlowBoard Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-[14px] leading-tight text-on-surface truncate">FlowBoard</h1>
            <p className="text-[11px] text-on-surface-variant truncate">Workspace</p>
          </div>
        </Link>
        <button
          onClick={onToggleCollapse}
          className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          title="Collapse sidebar"
        >
          <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
        </button>
      </div>

      {/* Mesh Product Team — workspace menu */}
      <div className="px-4 mb-3 relative" ref={teamRef}>
        <button
          onClick={() => { setTeamOpen((v) => !v); setAccountOpen(false); }}
          className="w-full border border-outline rounded-xl p-3 flex flex-col gap-3 shadow-sm bg-surface hover:bg-surface-variant transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">apps</span>
              <span className="font-semibold text-[13px] leading-tight text-on-surface">Mesh<br />Product Team</span>
            </div>
            <span className={cn('material-symbols-outlined text-on-surface-variant text-[18px] transition-transform', teamOpen && 'rotate-180')}>expand_more</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-on-surface-variant font-medium">
            <span className="flex items-center gap-1" title="Boards"><span className="material-symbols-outlined text-[14px]">view_kanban</span> {boardList.length}</span>
            <span className="flex items-center gap-1" title="Favorites"><span className="material-symbols-outlined text-[14px]">star</span> {favList.length}</span>
            <span className="flex items-center gap-1" title="Unread"><span className="material-symbols-outlined text-[14px]">notifications</span> {unreadCount}</span>
          </div>
        </button>

        {teamOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 z-50 bg-surface border border-outline rounded-xl shadow-elevated overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2.5 border-b border-outline">
              <p className="text-[13px] font-semibold text-on-surface">Mesh Product Team</p>
              <p className="text-[11px] text-on-surface-variant">Signed in as {user?.name ?? user?.email}</p>
            </div>
            <div className="p-1.5">
              <Link href="/reports" onClick={() => setTeamOpen(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-on-surface hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">bar_chart</span> Reports
              </Link>
              <Link href="/integrations" onClick={() => setTeamOpen(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-on-surface hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">extension</span> Integrations
              </Link>
            </div>
            <div className="p-1.5 border-t border-outline">
              <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Theme</p>
              <div className="flex gap-1 px-1.5 pb-1.5">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors capitalize',
                      theme === t ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant'
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px]">{t === 'light' ? 'light_mode' : 'dark_mode'}</span>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-1.5 border-t border-outline">
              <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-danger hover:bg-danger/10 transition-colors">
                <span className="material-symbols-outlined text-[18px]">logout</span> Log out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search trigger */}
      <div className="px-4 mb-2">
        <button
          onClick={() => window.dispatchEvent(new Event('flowboard:search'))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-outline bg-background text-on-surface-variant hover:border-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="text-[12px] flex-1 text-left">Search…</span>
          <span className="text-[10px] font-medium border border-outline rounded px-1 py-0.5">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-0.5 pb-2">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.label} href={item.href} className={navItemClass(active)}>
              <span className="material-symbols-outlined mr-3 text-[18px]">{item.icon}</span>
              <span className="text-[13px] flex-1">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* Favorites */}
        <div className="pt-4 pb-1">
          <div className="flex items-center justify-between px-3 mb-1 text-on-surface-variant">
            <button className="flex items-center gap-1 hover:text-on-surface" onClick={() => setFavOpen((v) => !v)}>
              <span className="material-symbols-outlined text-[16px]">{favOpen ? 'expand_less' : 'expand_more'}</span>
              <span className="font-medium text-[12px]">Favorites</span>
            </button>
          </div>
          {favOpen && (
            <div className="space-y-0.5">
              {favList.length === 0 ? (
                <p className="text-[11.5px] text-on-surface-variant px-3 py-1.5 ml-4 leading-snug">Star a project below to pin it here.</p>
              ) : (
                favList.map((fav) => (
                  <div
                    key={fav.boardId}
                    className={cn(
                      'flex items-center justify-between pl-4 pr-2 rounded-lg transition-colors group',
                      boardActive(fav.boardId) ? 'bg-primary-container' : 'hover:bg-surface-variant'
                    )}
                  >
                    <Link href={`/boards/${fav.boardId}`} className={cn('flex items-center gap-2 py-1.5 flex-1 min-w-0', boardActive(fav.boardId) ? 'text-primary font-medium' : 'text-on-surface-variant')}>
                      <span className="material-symbols-outlined text-[16px]">view_kanban</span>
                      <span className="text-[13px] truncate">{fav.board?.name ?? 'Board'}</span>
                    </Link>
                    <button
                      onClick={() => toggleFav.mutate({ boardId: fav.boardId, on: false })}
                      title="Remove from favorites"
                      className="p-1 text-orange-400 hover:text-orange-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px] [font-variation-settings:'FILL'_1]">star</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="pt-2 pb-1">
          <div className="flex items-center justify-between px-3 mb-1 text-on-surface-variant">
            <button className="flex items-center gap-1 hover:text-on-surface" onClick={() => setProjOpen((v) => !v)}>
              <span className="material-symbols-outlined text-[16px]">{projOpen ? 'expand_less' : 'expand_more'}</span>
              <span className="font-medium text-[12px]">Projects</span>
            </button>
            <button
              onClick={() => { setCreateError(null); setNewName(''); setShowCreate(true); }}
              title="New project"
              className="hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
          {projOpen && (
            <div className="space-y-0.5">
              {boards.isLoading ? (
                [0, 1, 2].map((i) => <div key={i} className="h-8 mx-4 rounded-lg bg-surface-variant animate-pulse" />)
              ) : boardList.length === 0 ? (
                <button onClick={() => { setCreateError(null); setNewName(''); setShowCreate(true); }} className="text-[12px] text-primary hover:underline px-3 py-1.5 ml-4">
                  + Create your first project
                </button>
              ) : (
                boardList.map((b) => {
                  const fav = favIds.has(b.id);
                  return (
                    <div
                      key={b.id}
                      className={cn(
                        'flex items-center justify-between pl-4 pr-2 rounded-lg transition-colors group',
                        boardActive(b.id) ? 'bg-primary-container' : 'hover:bg-surface-variant'
                      )}
                    >
                      <Link href={`/boards/${b.id}`} className={cn('flex items-center gap-2 py-1.5 flex-1 min-w-0', boardActive(b.id) ? 'text-primary font-medium' : 'text-on-surface-variant')}>
                        <span className="material-symbols-outlined text-[16px]">view_kanban</span>
                        <span className="text-[13px] truncate">{b.name}</span>
                      </Link>
                      <button
                        onClick={() => toggleFav.mutate({ boardId: b.id, on: !fav })}
                        title={fav ? 'Remove from favorites' : 'Add to favorites'}
                        className={cn('p-1 transition-colors', fav ? 'text-orange-400 hover:text-orange-500' : 'text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-orange-400')}
                      >
                        <span className={cn('material-symbols-outlined text-[15px]', fav && "[font-variation-settings:'FILL'_1]")}>star</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Bottom links */}
        <div className="pt-4 border-t border-outline mt-4">
          <Link href="/integrations" className={navItemClass(isActive('/integrations'))}>
            <span className="material-symbols-outlined mr-3 text-[18px]">extension</span>
            <span className="font-medium text-[13px]">Integrations</span>
          </Link>
          <button
            onClick={() => window.dispatchEvent(new Event('flowboard:help'))}
            className="w-full flex items-center px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined mr-3 text-[18px]">headset_mic</span>
            <span className="font-medium text-[13px]">Help Center</span>
          </button>
        </div>
      </nav>

      {/* User profile footer — account menu */}
      <div className="relative" ref={accountRef}>
        {accountOpen && (
          <div className="absolute left-4 right-4 bottom-full mb-1 z-50 bg-surface border border-outline rounded-xl shadow-elevated overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-2.5 border-b border-outline">
              <p className="text-[13px] font-semibold text-on-surface truncate">{user?.name ?? 'User'}</p>
              <p className="text-[11px] text-on-surface-variant truncate">{user?.email ?? ''}</p>
            </div>
            <div className="p-1.5">
              <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-danger hover:bg-danger/10 transition-colors">
                <span className="material-symbols-outlined text-[18px]">logout</span> Log out
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => { setAccountOpen((v) => !v); setTeamOpen(false); }}
          className="w-full p-4 border-t border-outline hover:bg-surface-variant transition-colors flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold shrink-0">
              {initialsOf(user?.name ?? user?.email ?? '?')}
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-[13px] leading-tight text-on-surface truncate">{user?.name ?? 'User'}</h4>
              <p className="text-[11px] text-on-surface-variant truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <span className={cn('material-symbols-outlined text-on-surface-variant text-[18px] transition-transform shrink-0', accountOpen && 'rotate-180')}>expand_more</span>
        </button>
      </div>

      {/* New project modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setNewName(''); setCreateError(null); }} title="New Project">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Project name</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createBoard.mutate(newName.trim()); }}
              placeholder="e.g. Product Roadmap, Sprint 12…"
              maxLength={120}
              className="w-full px-3 py-2.5 rounded-xl border border-outline bg-surface text-on-surface text-[13px] focus:outline-none focus:border-primary"
            />
            <p className="text-[11px] text-on-surface-variant mt-1.5">Starts with To do · In progress · Done columns.</p>
            {createError && <p className="text-[11.5px] text-danger mt-1.5">{createError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowCreate(false); setNewName(''); setCreateError(null); }} className="px-4 py-2 rounded-lg text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant transition-colors">Cancel</button>
            <button
              onClick={() => newName.trim() && createBoard.mutate(newName.trim())}
              disabled={createBoard.isPending || !newName.trim()}
              className="px-5 py-2 rounded-lg bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createBoard.isPending ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
