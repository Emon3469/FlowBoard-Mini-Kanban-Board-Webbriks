'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiMember, Priority, PRIORITIES } from '@/lib/api';
import {
  TaskFilters, SortKey, GroupKey, DueFilter, UNASSIGNED, emptyFilters, filtersActive, priorityMeta,
} from '@/lib/board-utils';
import { cn } from '@/lib/utils';

interface KanbanToolbarProps {
  boardName: string;
  view: 'list' | 'kanban' | 'timeline';
  onViewChange: (view: 'list' | 'kanban' | 'timeline') => void;
  canEdit: boolean;
  isOwner: boolean;
  filters: TaskFilters;
  onFiltersChange: (f: TaskFilters) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  group: GroupKey;
  onGroupChange: (g: GroupKey) => void;
  members: ApiMember[];
  availableLabels: string[];
  unreadCount?: number;
  onAskAI: () => void;
  onOpenSettings: () => void;
  onImport: () => void;
  onExport: () => void;
  onAddNew?: () => void;
  onOpenMembers?: () => void;
}

const SORT_LABELS: Record<SortKey, string> = {
  manual: 'Manual (drag order)',
  priority: 'Priority',
  dueDate: 'Due date',
  title: 'Title (A–Z)',
  created: 'Date created',
};

const GROUP_LABELS: Record<GroupKey, string> = {
  none: 'None',
  priority: 'Priority',
  assignee: 'Assignee',
  label: 'Label',
};

const DUE_LABELS: Record<DueFilter, string> = {
  all: 'Any',
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due this week',
  none: 'No due date',
};

/* Small popover with outside-click close */
function Popover({ label, icon, badge, children, align = 'right' }: { label: string; icon: string; badge?: number; children: React.ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors text-[13px]',
          open ? 'border-primary bg-primary/5 text-primary' : 'border-outline bg-surface text-on-surface hover:bg-surface-variant'
        )}
      >
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
        {badge ? <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{badge}</span> : null}
        <span className="material-symbols-outlined text-[16px]">expand_more</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn('absolute top-9 z-50 w-64 bg-surface border border-outline rounded-xl shadow-elevated p-3', align === 'right' ? 'right-0' : 'left-0')}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function KanbanToolbar(props: KanbanToolbarProps) {
  const {
    boardName, view, onViewChange, canEdit, isOwner, filters, onFiltersChange, sort, onSortChange,
    group, onGroupChange, members, availableLabels, unreadCount, onAskAI, onOpenSettings, onImport, onExport, onAddNew, onOpenMembers,
  } = props;
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const activeCount = filtersActive({ ...filters, query: '' }); // query shown separately in the box

  const toggleInArray = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const memberName = (m: ApiMember) => m.user?.name ?? m.user?.email ?? m.userId;

  return (
    <>
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between shrink-0 bg-background z-20">
        <div className="flex items-center gap-2 text-on-surface font-semibold text-[15px]">
          <span className="material-symbols-outlined text-[20px] text-primary">space_dashboard</span>
          {boardName}
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button
            onClick={() => searchRef.current?.focus()}
            title="Search tasks"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
          <button
            onClick={onOpenMembers}
            title="Share / manage members"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
          <button
            onClick={() => router.push('/inbox')}
            title="Notifications"
            className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {!!unreadCount && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-6 pb-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 bg-background z-20">
        {/* Search & View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          <div className="relative w-full max-w-[320px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              ref={searchRef}
              value={filters.query}
              onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-outline bg-surface text-on-surface text-[13px] focus:outline-none focus:border-primary shadow-sm"
              placeholder="Search tasks in this board"
              type="text"
            />
            {filters.query && (
              <button onClick={() => onFiltersChange({ ...filters, query: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
          <div className="flex items-center bg-surface border border-outline rounded-lg p-0.5 shadow-sm text-[13px] font-medium text-on-surface-variant">
            {(['list', 'kanban', 'timeline'] as const).map((v) => (
              <button
                key={v}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md capitalize',
                  view === v ? 'bg-surface-variant shadow-sm text-on-surface' : 'hover:text-on-surface transition-colors'
                )}
                onClick={() => onViewChange(v)}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {v === 'list' ? 'format_list_bulleted' : v === 'kanban' ? 'view_kanban' : 'calendar_view_week'}
                </span>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onAskAI} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline bg-surface text-primary font-medium hover:bg-surface-variant transition-colors shadow-sm text-[13px]">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span> Ask AI
          </button>
          {isOwner && (
            <button onClick={onOpenSettings} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline bg-surface text-on-surface font-medium hover:bg-surface-variant transition-colors shadow-sm text-[13px]">
              <span className="material-symbols-outlined text-[16px]">settings</span> Settings
            </button>
          )}
          <Popover label="Import / Export" icon="cloud_sync">
            <div className="flex flex-col gap-1">
              <button onClick={onExport} className="w-full px-3 py-2 text-left text-[12px] text-on-surface hover:bg-surface-variant rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">download</span> Export this board (JSON)
              </button>
              <button onClick={onImport} className="w-full px-3 py-2 text-left text-[12px] text-on-surface hover:bg-surface-variant rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">upload</span> Import board from JSON
              </button>
              <p className="text-[11px] text-on-surface-variant px-3 pt-1">Import creates a brand-new board you own.</p>
            </div>
          </Popover>
          {canEdit && onAddNew && (
            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-sm text-[13px]"
            >
              <span className="material-symbols-outlined text-[16px]">add</span> Add Column
            </button>
          )}
        </div>
      </div>

      {/* Filter / Sort / Group Row */}
      <div className="px-6 pb-2 flex items-center justify-end gap-2 shrink-0">
        {sort !== 'manual' && (
          <span className="text-[11px] text-on-surface-variant mr-auto flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Drag reordering is paused while sorted by {SORT_LABELS[sort].toLowerCase()}.
          </span>
        )}
        {activeCount > 0 && (
          <button
            onClick={() => onFiltersChange({ ...emptyFilters, query: filters.query })}
            className="text-[12px] text-primary hover:underline mr-1"
          >
            Clear filters
          </button>
        )}

        {/* Filter */}
        <Popover label="Filter" icon="filter_list" badge={activeCount || undefined}>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div>
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">Priority</p>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => onFiltersChange({ ...filters, priorities: toggleInArray(filters.priorities, p) })}
                    className={cn('px-2 py-1 rounded-md border text-[11px] font-medium', filters.priorities.includes(p) ? priorityMeta[p].chip : 'border-outline text-on-surface-variant hover:bg-surface-variant')}
                  >
                    {priorityMeta[p].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">Assignee</p>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                <label className="flex items-center gap-2 text-[12px] text-on-surface cursor-pointer">
                  <input type="checkbox" checked={filters.assigneeIds.includes(UNASSIGNED)} onChange={() => onFiltersChange({ ...filters, assigneeIds: toggleInArray(filters.assigneeIds, UNASSIGNED) })} />
                  Unassigned
                </label>
                {members.map((m) => (
                  <label key={m.userId} className="flex items-center gap-2 text-[12px] text-on-surface cursor-pointer">
                    <input type="checkbox" checked={filters.assigneeIds.includes(m.userId)} onChange={() => onFiltersChange({ ...filters, assigneeIds: toggleInArray(filters.assigneeIds, m.userId) })} />
                    {memberName(m)}
                  </label>
                ))}
              </div>
            </div>

            {availableLabels.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">Labels</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableLabels.map((l) => (
                    <button
                      key={l}
                      onClick={() => onFiltersChange({ ...filters, labels: toggleInArray(filters.labels, l) })}
                      className={cn('px-2 py-1 rounded-md border text-[11px] font-medium', filters.labels.includes(l) ? 'border-primary bg-primary/10 text-primary' : 'border-outline text-on-surface-variant hover:bg-surface-variant')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">Due date</p>
              <div className="space-y-1">
                {(['all', 'overdue', 'today', 'week', 'none'] as DueFilter[]).map((d) => (
                  <label key={d} className="flex items-center gap-2 text-[12px] text-on-surface cursor-pointer">
                    <input type="radio" name="due" checked={filters.due === d} onChange={() => onFiltersChange({ ...filters, due: d })} />
                    {DUE_LABELS[d]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Popover>

        {/* Sort */}
        <Popover label="Sort" icon="swap_vert">
          <div className="space-y-1">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => (
              <label key={s} className="flex items-center gap-2 text-[12px] text-on-surface cursor-pointer px-1 py-1 rounded hover:bg-surface-variant">
                <input type="radio" name="sort" checked={sort === s} onChange={() => onSortChange(s)} />
                {SORT_LABELS[s]}
              </label>
            ))}
          </div>
        </Popover>

        {/* Group (List view only) */}
        {view === 'list' && (
          <Popover label="Group" icon="grid_view">
            <div className="space-y-1">
              {(Object.keys(GROUP_LABELS) as GroupKey[]).map((g) => (
                <label key={g} className="flex items-center gap-2 text-[12px] text-on-surface cursor-pointer px-1 py-1 rounded hover:bg-surface-variant">
                  <input type="radio" name="group" checked={group === g} onChange={() => onGroupChange(g)} />
                  {GROUP_LABELS[g]}
                </label>
              ))}
            </div>
          </Popover>
        )}
      </div>
    </>
  );
}
