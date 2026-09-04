'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ApiColumn, ApiTask } from '@/lib/api';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';

/* ─── Column Status Colors ─── */

const statusColorMap: Record<string, { bg: string; border: string; text: string }> = {
  leads: { bg: 'bg-surface', border: 'border-outline', text: 'text-on-surface' },
  lead: { bg: 'bg-surface', border: 'border-outline', text: 'text-on-surface' },
  discovery: { bg: 'bg-status-discovery', border: 'border-status-discovery', text: 'text-white' },
  demo: { bg: 'bg-status-demo', border: 'border-status-demo', text: 'text-white' },
  won: { bg: 'bg-status-won', border: 'border-status-won', text: 'text-white' },
  done: { bg: 'bg-status-won', border: 'border-status-won', text: 'text-white' },
  'in progress': { bg: 'bg-status-discovery', border: 'border-status-discovery', text: 'text-white' },
  'to do': { bg: 'bg-surface', border: 'border-outline', text: 'text-on-surface' },
  todo: { bg: 'bg-surface', border: 'border-outline', text: 'text-on-surface' },
  review: { bg: 'bg-status-demo', border: 'border-status-demo', text: 'text-white' },
};

const fallbackColors = [
  { bg: 'bg-surface', border: 'border-outline', text: 'text-on-surface' },
  { bg: 'bg-status-discovery', border: 'border-status-discovery', text: 'text-white' },
  { bg: 'bg-status-demo', border: 'border-status-demo', text: 'text-white' },
  { bg: 'bg-status-won', border: 'border-status-won', text: 'text-white' },
];

function getColumnColor(name: string, position: number) {
  const key = name.toLowerCase().trim();
  if (statusColorMap[key]) return statusColorMap[key];
  return fallbackColors[position % fallbackColors.length];
}

/* ─── ColumnContainer ─── */

interface ColumnContainerProps {
  column: ApiColumn;
  tasks: ApiTask[];                 // already in final display order
  canEdit: boolean;
  dragEnabled: boolean;             // task cards draggable (manual sort, no filters)
  onAddTask: (columnId: string, title: string, description?: string) => Promise<void>;
  onTaskClick: (task: ApiTask) => void;
  onRenameColumn: (columnId: string, name: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onMoveColumn: (columnId: string, dir: 'left' | 'right') => void;
  columnIndex: number;
  isFirst: boolean;
  isLast: boolean;
}

export function ColumnContainer({
  column,
  tasks,
  canEdit,
  dragEnabled,
  onAddTask,
  onTaskClick,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  columnIndex,
  isFirst,
  isLast,
}: ColumnContainerProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
  });

  const taskIds = tasks.map((t) => t.id);
  const colors = getColumnColor(column.name, columnIndex);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingLoading(true);
    try {
      await onAddTask(column.id, newTaskTitle.trim());
      setNewTaskTitle('');
      setIsAddingTask(false);
    } catch {
      // Error handled by parent
    } finally {
      setAddingLoading(false);
    }
  };

  const handleRename = async () => {
    if (editName.trim() && editName.trim() !== column.name) {
      await onRenameColumn(column.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col w-[280px] h-full shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {isEditing && canEdit ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="px-2 py-1 text-[13px] font-medium rounded border border-primary bg-surface text-on-surface focus:outline-none w-32"
            />
          ) : (
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded ${colors.bg} ${colors.border} border shadow-sm ${canEdit ? 'cursor-pointer' : ''}`}
              onDoubleClick={() => {
                if (!canEdit) return;
                setEditName(column.name);
                setIsEditing(true);
              }}
              title={canEdit ? 'Double-click to rename' : undefined}
            >
              <span className={`font-medium text-[13px] ${colors.text}`}>{column.name}</span>
            </div>
          )}
          <span className="font-medium text-[13px] text-on-surface-variant">{tasks.length}</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 text-on-surface-variant relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-0.5 hover:bg-surface-variant rounded">
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
            <button onClick={() => setIsAddingTask(true)} className="p-0.5 hover:bg-surface-variant rounded">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>

            {/* Column Menu Dropdown */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-50 w-44 bg-surface border border-outline rounded-xl shadow-elevated py-1.5">
                  <button
                    onClick={() => { setEditName(column.name); setIsEditing(true); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-on-surface hover:bg-surface-variant flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    Rename Column
                  </button>
                  <button
                    disabled={isFirst}
                    onClick={() => { onMoveColumn(column.id, 'left'); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-on-surface hover:bg-surface-variant flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[15px]">chevron_left</span>
                    Move Left
                  </button>
                  <button
                    disabled={isLast}
                    onClick={() => { onMoveColumn(column.id, 'right'); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-on-surface hover:bg-surface-variant flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                    Move Right
                  </button>
                  <div className="my-1 border-t border-outline" />
                  <button
                    onClick={() => { onDeleteColumn(column.id); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-danger hover:bg-danger/10 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    Delete Column
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Task List */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-2 h-[calc(100vh-280px)]',
          isOver && 'bg-primary/5 rounded-xl'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} draggable={dragEnabled} />
          ))}
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && !isAddingTask && (
          <div className="py-8 text-center text-[12px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px] mb-1 block opacity-40">inbox</span>
            No tasks yet
          </div>
        )}

        {/* Inline Add Task */}
        {isAddingTask && canEdit && (
          <div className="bg-surface border border-outline rounded-xl p-3">
            <input
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') { setIsAddingTask(false); setNewTaskTitle(''); }
              }}
              placeholder="Task title..."
              className="w-full px-2 py-1.5 text-[13px] bg-transparent text-on-surface placeholder:text-on-surface-variant focus:outline-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleAddTask}
                disabled={addingLoading || !newTaskTitle.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {addingLoading ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => { setIsAddingTask(false); setNewTaskTitle(''); }}
                className="px-3 py-1.5 rounded-lg text-[12px] text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
