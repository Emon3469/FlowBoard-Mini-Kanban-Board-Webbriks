'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ApiTask } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ─── Helpers ─── */

const avatarColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-cyan-500',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarColor(str: string): string {
  return avatarColors[hashString(str) % avatarColors.length];
}

function generateAmount(str: string): string {
  const amount = (hashString(str) % 10 + 1) * 5000;
  return `USD \$${amount.toLocaleString()}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const tagIconColors = ['text-status-discovery', 'text-red-500', 'text-on-surface-variant', 'text-status-won'];

function getTagIconColor(str: string): string {
  return tagIconColors[hashString(str) % tagIconColors.length];
}

function generateTag(description: string | null, title: string): string {
  if (description && description.trim().length > 1) {
    const words = description.trim().split(/\s+/);
    return words.slice(0, 2).join(' ');
  }
  return title;
}

/* ─── TaskCard ─── */

interface TaskCardProps {
  task: ApiTask;
  onClick: () => void;
  overlay?: boolean;
}

export function TaskCard({ task, onClick, overlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const initial = task.title[0]?.toUpperCase() ?? '?';
  const avatarColor = getAvatarColor(task.title);
  const amount = generateAmount(task.title);
  const date = formatDate(task.updatedAt ?? task.createdAt);
  const tag = generateTag(task.description, task.title);
  const tagColor = getTagIconColor(task.title);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-surface border-2 border-dashed border-primary/30 rounded-xl p-3.5 opacity-40 min-h-[100px]"
      />
    );
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={onClick}
      className={cn(
        'bg-surface rounded-xl p-3.5 shadow-card border border-outline cursor-grab active:cursor-grabbing',
        'hover:border-primary/30 transition-colors group flex flex-col gap-2',
        overlay && 'drag-overlay shadow-drag cursor-grabbing'
      )}
    >
      {/* Header: Avatar + Title */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold ${avatarColor}`}>
            {initial}
          </div>
          <h3 className="font-semibold text-[13px] text-on-surface">{task.title}</h3>
        </div>
        <button className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-[16px]">more_horiz</span>
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-[12px] text-on-surface-variant font-medium line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Amount + Date */}
      <div className="flex items-center gap-2 text-[12px] font-semibold text-on-surface mt-1">
        <span>{amount}</span>
        <span className="w-1 h-1 rounded-full bg-outline" />
        <span className="text-on-surface-variant font-medium text-[11px]">{date}</span>
      </div>

      {/* Tag */}
      <div className="mt-2 flex items-center gap-1.5 border border-outline rounded-md px-2 py-1 w-fit bg-surface">
        <span className={`material-symbols-outlined text-[14px] ${tagColor}`}>bar_chart</span>
        <span className="text-[11px] font-medium text-on-surface-variant">{tag}</span>
      </div>
    </div>
  );
}

/* Standalone draggable overlay card (used by DragOverlay) */
export function TaskCardOverlay({ task }: { task: ApiTask }) {
  return <TaskCard task={task} onClick={() => {}} overlay />;
}
