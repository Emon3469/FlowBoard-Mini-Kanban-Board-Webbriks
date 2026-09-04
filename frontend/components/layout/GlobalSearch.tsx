'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { priorityMeta } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

type Flat = { key: string; icon: string; label: string; sub?: string; href: string };

/**
 * Global command-palette search. Opens on the `flowboard:search` window event
 * (dispatched from the sidebar / icon rail) and on ⌘K / Ctrl-K. Queries the
 * scoped `/search` endpoint and lets the user jump to boards, tasks, or notes.
 */
export function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open via window event or ⌘K / Ctrl-K.
  useEffect(() => {
    const openHandler = () => setOpen(true);
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('flowboard:search', openHandler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('flowboard:search', openHandler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  // Focus + reset when opened.
  useEffect(() => {
    if (open) {
      setRaw('');
      setTerm('');
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Debounce the query term.
  useEffect(() => {
    const id = window.setTimeout(() => setTerm(raw.trim()), 200);
    return () => window.clearTimeout(id);
  }, [raw]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', term],
    queryFn: () => searchApi.query(term),
    enabled: open && !!user && term.length > 0,
    staleTime: 15_000,
  });

  const results = data?.data;
  const flat = useMemo<Flat[]>(() => {
    if (!results) return [];
    const items: Flat[] = [];
    for (const b of results.boards) items.push({ key: `board-${b.id}`, icon: 'view_kanban', label: b.name, sub: 'Board', href: `/boards/${b.id}` });
    for (const t of results.tasks) {
      const p = priorityMeta[t.priority as keyof typeof priorityMeta];
      items.push({ key: `task-${t.id}`, icon: 'task_alt', label: t.title, sub: `${p?.label ?? t.priority} · ${t.columnName}`, href: `/boards/${t.boardId}` });
    }
    for (const n of results.notes) items.push({ key: `note-${n.id}`, icon: 'description', label: n.title || 'Untitled note', sub: 'Note', href: '/notes' });
    return items;
  }, [results]);

  useEffect(() => { setActive(0); }, [flat.length]);

  const close = () => setOpen(false);
  const go = (href: string) => { close(); router.push(href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0))); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const item = flat[active]; if (item) go(item.href); }
  };

  if (!open) return null;

  const hasQuery = term.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" onMouseDown={close}>
      <div
        className="w-[min(640px,100%)] h-fit max-h-[70vh] flex flex-col bg-surface border border-outline rounded-2xl shadow-elevated overflow-hidden animate-in slide-in-from-top-4 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 border-b border-outline">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>
          <input
            ref={inputRef}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search boards, tasks, and notes…"
            className="flex-1 py-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
          {isFetching && <span className="w-4 h-4 rounded-full border-2 border-outline border-t-primary animate-spin" />}
          <button onClick={close} className="text-[10px] font-medium text-on-surface-variant border border-outline rounded px-1.5 py-0.5 hover:bg-surface-variant transition-colors">ESC</button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!hasQuery && (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] opacity-40">search</span>
              <p className="text-[13px] mt-2">Type to search across your workspace.</p>
              <p className="text-[11px] mt-1 opacity-70">Boards · Tasks · Notes</p>
            </div>
          )}

          {hasQuery && flat.length === 0 && !isFetching && (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] opacity-40">search_off</span>
              <p className="text-[13px] mt-2">No results for &ldquo;{term}&rdquo;.</p>
            </div>
          )}

          {flat.length > 0 && (
            <div className="p-2">
              {flat.map((item, i) => (
                <button
                  key={item.key}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                    i === active ? 'bg-primary/10' : 'hover:bg-surface-variant'
                  )}
                >
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', i === active ? 'bg-primary/15 text-primary' : 'bg-surface-variant text-on-surface-variant')}>
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-on-surface truncate">{item.label}</p>
                    {item.sub && <p className="text-[11px] text-on-surface-variant truncate">{item.sub}</p>}
                  </div>
                  {i === active && <span className="material-symbols-outlined text-[16px] text-on-surface-variant">subdirectory_arrow_left</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
