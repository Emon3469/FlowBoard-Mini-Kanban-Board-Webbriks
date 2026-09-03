'use client';

import React from 'react';

interface KanbanToolbarProps {
  boardName: string;
  view: 'list' | 'kanban' | 'timeline';
  onViewChange: (view: 'list' | 'kanban' | 'timeline') => void;
  onAddNew?: () => void;
  onOpenMembers?: () => void;
}

export function KanbanToolbar({ boardName, view, onViewChange, onAddNew, onOpenMembers }: KanbanToolbarProps) {
  return (
    <>
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between shrink-0 bg-background z-20">
        <div className="flex items-center gap-2 text-on-surface font-semibold text-[15px]">
          <span className="material-symbols-outlined text-[20px]">monetization_on</span>
          {boardName}
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
          <button
            onClick={onOpenMembers}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant border border-outline bg-surface">
            <span className="material-symbols-outlined text-[18px]">notifications</span>
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
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-outline bg-surface text-[13px] focus:outline-none focus:border-primary shadow-sm"
              placeholder="Search deals"
              type="text"
            />
          </div>
          <div className="flex items-center bg-surface border border-outline rounded-lg p-0.5 shadow-sm text-[13px] font-medium text-on-surface-variant">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${
                view === 'list'
                  ? 'bg-white shadow-sm text-on-surface'
                  : 'hover:text-on-surface transition-colors'
              }`}
              onClick={() => onViewChange('list')}
            >
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span> List
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${
                view === 'kanban'
                  ? 'bg-white shadow-sm text-on-surface'
                  : 'hover:text-on-surface transition-colors'
              }`}
              onClick={() => onViewChange('kanban')}
            >
              <span className="material-symbols-outlined text-[16px]">view_kanban</span> Kanban
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${
                view === 'timeline'
                  ? 'bg-white shadow-sm text-on-surface'
                  : 'hover:text-on-surface transition-colors'
              }`}
              onClick={() => onViewChange('timeline')}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_view_week</span> Timeline
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline bg-surface text-primary font-medium hover:bg-surface-variant transition-colors shadow-sm text-[13px]">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span> Ask AI
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline bg-surface text-on-surface font-medium hover:bg-surface-variant transition-colors shadow-sm text-[13px]">
            <span className="material-symbols-outlined text-[16px]">settings</span> Settings
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline bg-surface text-on-surface font-medium hover:bg-surface-variant transition-colors shadow-sm text-[13px]">
            <span className="material-symbols-outlined text-[16px]">cloud_download</span> Imports / Export
          </button>
          <div className="flex items-center ml-2">
            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-l-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-sm text-[13px]"
            >
              <span className="material-symbols-outlined text-[16px]">add</span> Add New
            </button>
            <button className="flex items-center justify-center px-2 py-2 rounded-r-lg bg-primary text-white border-l border-white/20 hover:bg-primary/90 transition-colors shadow-sm h-full">
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="px-6 pb-2 flex justify-end gap-2 shrink-0">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline bg-surface text-on-surface font-medium hover:bg-surface-variant transition-colors text-[13px]">
          <span className="material-symbols-outlined text-[16px]">filter_list</span> Filter
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline bg-surface text-on-surface font-medium hover:bg-surface-variant transition-colors text-[13px]">
          <span className="material-symbols-outlined text-[16px]">swap_vert</span> Sort
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline bg-surface text-on-surface font-medium hover:bg-surface-variant transition-colors text-[13px]">
          <span className="material-symbols-outlined text-[16px]">grid_view</span> Group
          <span className="material-symbols-outlined text-[16px] ml-1">expand_more</span>
        </button>
      </div>
    </>
  );
}
