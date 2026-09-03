'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { boardApi } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';
import { BoardCard } from '@/components/board/BoardCard';
import { Modal } from '@/components/ui/Modal';
import { ToastContainer, showToast } from '@/components/ui/Modal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated');
  const [filter, setFilter] = useState<'all' | 'owned'>('all');
  const [showTools, setShowTools] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Fetch boards
  const { data, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardApi.list(),
    enabled: !!user,
  });

  const boards = data?.data ?? [];
  const visibleBoards = useMemo(() => boards
    .filter((board) => board.name.toLowerCase().includes(search.toLowerCase()))
    .filter((board) => filter === 'all' || board.ownerId === user?.id)
    .sort((a, b) => sortBy === 'name'
      ? a.name.localeCompare(b.name)
      : new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()),
  [boards, filter, search, sortBy, user?.id]);

  const exportBoards = () => {
    const blob = new Blob([JSON.stringify({ boards }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flowboard-boards.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBoards = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    showToast('Board imports are read-only exports for now. Create a board to add it safely.', 'info');
    event.target.value = '';
  };

  // Create board mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => boardApi.create(name),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowCreate(false);
      setNewBoardName('');
      showToast('Board created successfully!', 'success');
      router.push(`/boards/${result.data.id}`);
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to create board', 'error');
    },
  });

  const handleCreate = () => {
    if (!newBoardName.trim()) return;
    createMutation.mutate(newBoardName.trim());
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary animate-pulse" />
          <span className="text-on-surface-variant text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between shrink-0 bg-background z-20">
        <div className="flex items-center gap-2 text-on-surface font-semibold text-[15px]">
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          My Boards
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface" title="Search boards"
            onClick={() => document.getElementById('board-search')?.focus()}
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface" title="Copy workspace link"
            onClick={() => navigator.clipboard?.writeText(window.location.origin + '/dashboard')}
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface" title="Notifications"
            onClick={() => showToast('You are all caught up.', 'info')}
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-6 pb-4 flex items-center justify-between shrink-0 bg-background z-20">
        <div className="flex items-center gap-3">
          <input id="board-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search boards" className="w-44 px-3 py-2 rounded-lg border border-outline bg-surface text-on-surface text-[12px] focus:outline-none focus:border-primary" />
          <p className="text-[13px] text-on-surface-variant">
          {visibleBoards.length > 0
            ? `${visibleBoards.length} board${visibleBoards.length !== 1 ? 's' : ''} — select one to start working`
            : 'Create your first board to get started'}
          </p>
        </div>
        <div className="flex items-center ml-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-l-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-sm text-[13px]"
          >
            <span className="material-symbols-outlined text-[16px]">add</span> New Board
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-outline hover:bg-surface-variant transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span> Import
            </button>
            <button
              onClick={exportBoards}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-outline hover:bg-surface-variant transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">file_upload</span> Export
            </button>
            <button
              onClick={() => setFilter(filter === 'all' ? 'owned' : 'all')}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-outline hover:bg-surface-variant transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
            </button>
            <button
              onClick={() => setSortBy(sortBy === 'updated' ? 'name' : 'updated')}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-outline hover:bg-surface-variant transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">sort</span> Sort
            </button>
            <button
              onClick={() => setShowTools(!showTools)}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-outline hover:bg-surface-variant transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">group</span> Group
            </button>
          </div>
          <button onClick={() => setShowTools(!showTools)} className="flex items-center justify-center px-2 py-2 rounded-r-lg bg-primary text-white border-l border-white/20 hover:bg-primary/90 transition-colors shadow-sm h-full">
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface border border-outline rounded-2xl p-5 animate-pulse h-[160px]">
                <div className="w-11 h-11 rounded-xl bg-surface-variant mb-4" />
                <div className="h-4 bg-surface-variant rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface-variant rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
            <span className="material-symbols-outlined text-danger text-[32px] mb-2 block">error</span>
            <p className="text-[14px] text-danger font-medium">Failed to load boards</p>
            <p className="text-[12px] text-on-surface-variant mt-1">
              {error instanceof Error ? error.message : 'Please check your connection and try again'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && boards.length === 0 && (
          <div className="bg-surface border border-outline rounded-2xl p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">view_kanban</span>
            </div>
            <h2 className="text-[16px] font-semibold text-on-surface">No boards yet</h2>
            <p className="text-[13px] text-on-surface-variant mt-2 leading-relaxed">
              Create your first board to start organizing tasks with your team using drag-and-drop Kanban columns.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Create First Board
            </button>
          </div>
        )}

        {/* Board Grid */}
        {!isLoading && boards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </div>
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={importBoards} />

      {/* Create Board Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setNewBoardName(''); }} title="Create New Board">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">
              Board Name
            </label>
            <input
              autoFocus
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="e.g. Sprint Planning, Product Roadmap..."
              className="w-full px-3 py-2.5 rounded-xl border border-outline bg-surface text-on-surface text-[13px] focus:outline-none focus:border-primary"
              maxLength={120}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowCreate(false); setNewBoardName(''); }}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newBoardName.trim()}
              className="px-5 py-2 rounded-lg bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </AppLayout>
  );
}
