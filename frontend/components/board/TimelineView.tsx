'use client';

import React, { useMemo } from 'react';
import { ApiTask } from '@/lib/api';
import { priorityMeta, priorityOf, formatShortDate, formatFullDate } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  tasks: ApiTask[];              // already filtered
  columnNameOf: (columnId: string) => string;
  onTaskClick: (task: ApiTask) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_WIDTH = 40;

function atMidnight(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function TimelineView({ tasks, columnNameOf, onTaskClick }: TimelineViewProps) {
  const { scheduled, unscheduled, rangeStart, totalDays } = useMemo(() => {
    const scheduled: { task: ApiTask; start: Date; end: Date }[] = [];
    const unscheduled: ApiTask[] = [];
    for (const t of tasks) {
      const s = t.startDate ?? t.dueDate ?? null;
      const e = t.dueDate ?? t.startDate ?? null;
      if (!s || !e) { unscheduled.push(t); continue; }
      let start = atMidnight(s);
      let end = atMidnight(e);
      if (end < start) [start, end] = [end, start];
      scheduled.push({ task: t, start, end });
    }
    if (scheduled.length === 0) {
      return { scheduled, unscheduled, rangeStart: new Date(), totalDays: 0 };
    }
    let min = scheduled[0].start;
    let max = scheduled[0].end;
    for (const s of scheduled) {
      if (s.start < min) min = s.start;
      if (s.end > max) max = s.end;
    }
    const rangeStart = addDays(min, -2);
    const rangeEnd = addDays(max, 2);
    return { scheduled, unscheduled, rangeStart, totalDays: dayDiff(rangeStart, rangeEnd) + 1 };
  }, [tasks]);

  const today = new Date();
  const todayOffset = dayDiff(rangeStart, new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const gridWidth = totalDays * DAY_WIDTH;

  // Weekly tick marks
  const ticks: { offset: number; label: string; month: boolean }[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const d = addDays(rangeStart, i);
    const isMonthStart = d.getDate() <= 7 && d.getDay() === 0 ? false : d.getDate() === 1;
    if (i % 7 === 0 || isMonthStart) {
      ticks.push({ offset: i, label: formatShortDate(d.toISOString()), month: isMonthStart });
    }
  }

  return (
    <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6 pt-2">
      {scheduled.length === 0 && unscheduled.length === 0 && (
        <div className="flex items-center justify-center py-16 text-on-surface-variant">
          <div className="text-center">
            <span className="material-symbols-outlined text-[48px] opacity-40">calendar_month</span>
            <p className="text-[13px] mt-2">No tasks to show on the timeline.</p>
          </div>
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="flex border border-outline rounded-xl overflow-hidden bg-surface">
          {/* Fixed task-name column */}
          <div className="w-[220px] shrink-0 border-r border-outline">
            <div className="h-10 border-b border-outline flex items-center px-3 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Task</div>
            {scheduled.map(({ task }) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="h-11 w-full border-b border-outline/60 flex items-center px-3 text-left hover:bg-surface-variant/50 transition-colors"
              >
                <span className={cn('w-1.5 h-1.5 rounded-full mr-2 shrink-0', priorityMeta[priorityOf(task)].dot)} />
                <span className="text-[12px] text-on-surface truncate">{task.title}</span>
              </button>
            ))}
          </div>

          {/* Scrollable timeline grid */}
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <div className="relative" style={{ width: gridWidth }}>
              {/* Header ticks */}
              <div className="h-10 border-b border-outline relative">
                {ticks.map((t) => (
                  <div key={t.offset} className="absolute top-0 h-full flex items-center" style={{ left: t.offset * DAY_WIDTH }}>
                    <span className={cn('text-[10px] px-1', t.month ? 'font-bold text-on-surface' : 'text-on-surface-variant')}>{t.label}</span>
                  </div>
                ))}
              </div>

              {/* Gridlines + today marker */}
              <div className="absolute top-10 bottom-0 left-0 right-0 pointer-events-none">
                {ticks.map((t) => (
                  <div key={t.offset} className="absolute top-0 bottom-0 border-l border-outline/40" style={{ left: t.offset * DAY_WIDTH }} />
                ))}
                {todayOffset >= 0 && todayOffset < totalDays && (
                  <div className="absolute top-0 bottom-0 border-l-2 border-primary/60 z-10" style={{ left: todayOffset * DAY_WIDTH }}>
                    <span className="absolute -top-0 left-1 text-[9px] text-primary font-semibold">Today</span>
                  </div>
                )}
              </div>

              {/* Task bars */}
              {scheduled.map(({ task, start, end }) => {
                const left = dayDiff(rangeStart, start) * DAY_WIDTH;
                const width = (dayDiff(start, end) + 1) * DAY_WIDTH;
                const pm = priorityMeta[priorityOf(task)];
                return (
                  <div key={task.id} className="h-11 border-b border-outline/60 relative">
                    <button
                      onClick={() => onTaskClick(task)}
                      title={`${task.title} • ${formatFullDate(start.toISOString())} → ${formatFullDate(end.toISOString())}`}
                      className={cn('absolute top-1/2 -translate-y-1/2 h-6 rounded-md flex items-center px-2 text-white text-[10px] font-medium shadow-sm hover:opacity-90 transition-opacity overflow-hidden', pm.dot)}
                      style={{ left: left + 2, width: Math.max(width - 4, DAY_WIDTH - 4) }}
                    >
                      <span className="truncate">{task.title}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Unscheduled lane */}
      {unscheduled.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">event_busy</span>
            Unscheduled ({unscheduled.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline bg-surface hover:border-primary/30 transition-colors text-left max-w-[240px]"
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priorityMeta[priorityOf(task)].dot)} />
                <span className="text-[12px] text-on-surface truncate">{task.title}</span>
                <span className="text-[10px] text-on-surface-variant shrink-0">{columnNameOf(task.columnId)}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">Add a start or due date to place these on the timeline.</p>
        </div>
      )}
    </div>
  );
}
