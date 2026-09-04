'use client';

import React, { useMemo } from 'react';
import { ApiTask, ApiMember } from '@/lib/api';
import { SortKey, GroupKey, sortTasks, groupTasks, priorityMeta, priorityOf, dueState, dueStateClass, formatShortDate, avatarColor, initialsOf } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

interface ListViewProps {
  tasks: ApiTask[];              // already filtered
  columnNameOf: (columnId: string) => string;
  members: ApiMember[];
  sort: SortKey;
  group: GroupKey;
  onTaskClick: (task: ApiTask) => void;
}

export function ListView({ tasks, columnNameOf, members, sort, group, onTaskClick }: ListViewProps) {
  const memberName = (id: string) => members.find((m) => m.userId === id)?.user?.name ?? 'Unknown';

  const groups = useMemo(() => {
    const sorted = sortTasks(tasks, sort === 'manual' ? 'created' : sort);
    return groupTasks(sorted, group, memberName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, sort, group, members]);

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] opacity-40">inbox</span>
          <p className="text-[13px] mt-2">No tasks match the current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6 pt-2">
      <div className="min-w-[720px]">
        {/* Header row */}
        <div className="grid grid-cols-[minmax(200px,3fr)_120px_120px_140px_120px] gap-3 px-3 py-2 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide border-b border-outline sticky top-0 bg-background z-10">
          <span>Task</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Assignee</span>
          <span>Due</span>
        </div>

        {groups.map((grp) => (
          <div key={grp.key} className="mb-2">
            {group !== 'none' && (
              <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                <span className="text-[12px] font-semibold text-on-surface">{grp.label}</span>
                <span className="text-[11px] text-on-surface-variant bg-surface-variant/60 rounded-full px-1.5">{grp.tasks.length}</span>
              </div>
            )}
            <div className="divide-y divide-outline/60">
              {grp.tasks.map((task) => {
                const pm = priorityMeta[priorityOf(task)];
                const due = dueState(task.dueDate);
                const assignee = task.assignee;
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="w-full grid grid-cols-[minmax(200px,3fr)_120px_120px_140px_120px] gap-3 px-3 py-2.5 text-left items-center hover:bg-surface-variant/50 transition-colors rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-on-surface truncate">{task.title}</p>
                      {task.description && <p className="text-[11px] text-on-surface-variant truncate">{task.description}</p>}
                    </div>
                    <span className="text-[12px] text-on-surface-variant truncate">{columnNameOf(task.columnId)}</span>
                    <span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold', pm.chip)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', pm.dot)} />
                        {pm.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      {assignee ? (
                        <>
                          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0', avatarColor(assignee.name))}>{initialsOf(assignee.name)}</span>
                          <span className="text-[12px] text-on-surface truncate">{assignee.name}</span>
                        </>
                      ) : (
                        <span className="text-[12px] text-on-surface-variant">—</span>
                      )}
                    </span>
                    <span className={cn('text-[12px] font-medium', task.dueDate ? dueStateClass[due] : 'text-on-surface-variant')}>
                      {task.dueDate ? formatShortDate(task.dueDate) : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
