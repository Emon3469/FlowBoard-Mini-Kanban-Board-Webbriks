'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ApiTask } from '@/lib/api';
import { cn } from '@/lib/utils';
import { priorityMeta, priorityOf, dueState, dueStateClass, formatShortDate, avatarColor, initialsOf } from '@/lib/board-utils';

/* ─── TaskCard ─── */

interface TaskCardProps {
  task: ApiTask;
  onClick: () => void;
  overlay?: boolean;
  draggable?: boolean;
}

export function TaskCard({ task, onClick, overlay, draggable = true }: TaskCardProps) {
  const sortable = useSortable({ id: task.id, data: { type: 'task', task }, disabled: !draggable || overlay });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = { transform: CSS.Transform.toString(transform), transition };

  const priority = priorityOf(task);
  const pm = priorityMeta[priority];
  const labels = task.labels ?? [];
  const due = dueState(task.dueDate);
  const assignee = task.assignee;

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="bg-surface border-2 border-dashed border-primary/30 rounded-xl p-3.5 opacity-40 min-h-[80px]" />;
  }

  const interactive = draggable && !overlay;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(interactive ? attributes : {})}
      {...(interactive ? listeners : {})}
      onClick={onClick}
      className={cn(
        'bg-surface rounded-xl p-3.5 shadow-card border border-outline transition-colors group flex flex-col gap-2',
        interactive ? 'cursor-grab active:cursor-grabbing hover:border-primary/30' : 'cursor-pointer hover:border-primary/30',
        overlay && 'drag-overlay shadow-drag cursor-grabbing'
      )}
    >
      {/* Priority + menu */}
      <div className="flex items-start justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide', pm.chip)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', pm.dot)} />
          {pm.label}
        </span>
        <button className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Task options" tabIndex={-1}>
          <span className="material-symbols-outlined text-[16px]">more_horiz</span>
        </button>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-[13px] text-on-surface leading-snug">{task.title}</h3>

      {/* Description */}
      {task.description && (
        <p className="text-[12px] text-on-surface-variant line-clamp-2">{task.description}</p>
      )}

      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.slice(0, 4).map((label) => (
            <span key={label} className="inline-flex items-center gap-1 border border-outline rounded-md px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant bg-surface-variant/40">
              <span className="material-symbols-outlined text-[12px]">label</span>
              {label}
            </span>
          ))}
          {labels.length > 4 && <span className="text-[10px] text-on-surface-variant">+{labels.length - 4}</span>}
        </div>
      )}

      {/* Footer: due date + assignee */}
      {(task.dueDate || assignee) && (
        <div className="flex items-center justify-between mt-1">
          {task.dueDate ? (
            <span className={cn('flex items-center gap-1 text-[11px] font-medium', dueStateClass[due])}>
              <span className="material-symbols-outlined text-[13px]">{due === 'overdue' ? 'event_busy' : 'event'}</span>
              {formatShortDate(task.dueDate)}
            </span>
          ) : <span />}
          {assignee && (
            <div
              className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold', avatarColor(assignee.name))}
              title={assignee.name}
            >
              {initialsOf(assignee.name)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Standalone draggable overlay card (used by DragOverlay) */
export function TaskCardOverlay({ task }: { task: ApiTask }) {
  return <TaskCard task={task} onClick={() => {}} overlay />;
}
