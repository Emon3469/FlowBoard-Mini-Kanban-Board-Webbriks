'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { reportsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { priorityMeta } from '@/lib/board-utils';
import { Priority } from '@/lib/api';
import { cn } from '@/lib/utils';

function StatCard({ icon, label, value, tint }: { icon: string; label: string; value: number; tint: string }) {
  return (
    <div className="bg-surface border border-outline rounded-xl p-4">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', tint)}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </span>
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <strong className="block text-[28px] font-bold text-on-surface mt-2 leading-none">{value}</strong>
    </div>
  );
}

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);

  const report = useQuery({ queryKey: ['reports-summary'], queryFn: reportsApi.summary, enabled: !!user });
  if (authLoading || !user) return null;

  const data = report.data?.data;
  const priorityOrder: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  const maxPriority = data ? Math.max(1, ...priorityOrder.map((p) => data.byPriority[p] ?? 0)) : 1;
  const statusMax = data ? Math.max(1, ...data.byStatus.map((s) => s.count)) : 1;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">monitoring</span>
              Reports
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-1">A live summary across every board you can access.</p>
          </div>

          {report.isLoading || !data ? (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface border border-outline animate-pulse" />)}
              </div>
              <div className="h-56 rounded-xl bg-surface border border-outline animate-pulse" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Totals */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard icon="space_dashboard" label="Boards" value={data.totals.boards} tint="bg-primary/10 text-primary" />
                <StatCard icon="task_alt" label="Tasks" value={data.totals.tasks} tint="bg-surface-variant text-on-surface-variant" />
                <StatCard icon="check_circle" label="Completed" value={data.totals.completed} tint="bg-success/10 text-success" />
                <StatCard icon="warning" label="Overdue" value={data.totals.overdue} tint="bg-danger/10 text-danger" />
                <StatCard icon="schedule" label="Due soon" value={data.totals.upcoming} tint="bg-warning/10 text-warning" />
                <StatCard icon="assignment_ind" label="Assigned to me" value={data.totals.assignedToMe} tint="bg-primary/10 text-primary" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* By priority */}
                <div className="bg-surface border border-outline rounded-xl p-5">
                  <h2 className="text-[13px] font-semibold text-on-surface mb-4">Tasks by priority</h2>
                  <div className="space-y-3">
                    {priorityOrder.map((p) => {
                      const count = data.byPriority[p] ?? 0;
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className="w-14 text-[12px] text-on-surface-variant shrink-0">{priorityMeta[p].label}</span>
                          <div className="flex-1 h-6 rounded-md bg-surface-variant/60 overflow-hidden">
                            <div
                              className={cn('h-full rounded-md transition-all', priorityMeta[p].dot)}
                              style={{ width: `${Math.max(count > 0 ? 6 : 0, (count / maxPriority) * 100)}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-[12px] font-semibold text-on-surface shrink-0">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* By status */}
                <div className="bg-surface border border-outline rounded-xl p-5">
                  <h2 className="text-[13px] font-semibold text-on-surface mb-4">Tasks by status</h2>
                  {data.byStatus.length === 0 ? (
                    <p className="text-[12px] text-on-surface-variant">No columns yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {data.byStatus.map((s) => (
                        <div key={s.columnName} className="flex items-center gap-3">
                          <span className="w-20 text-[12px] text-on-surface-variant shrink-0 truncate" title={s.columnName}>{s.columnName}</span>
                          <div className="flex-1 h-6 rounded-md bg-surface-variant/60 overflow-hidden">
                            <div className="h-full rounded-md bg-primary transition-all" style={{ width: `${Math.max(s.count > 0 ? 6 : 0, (s.count / statusMax) * 100)}%` }} />
                          </div>
                          <span className="w-6 text-right text-[12px] font-semibold text-on-surface shrink-0">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress by board */}
              <div className="bg-surface border border-outline rounded-xl p-5">
                <h2 className="text-[13px] font-semibold text-on-surface mb-4">Progress by board</h2>
                {data.byBoard.length === 0 ? (
                  <p className="text-[12px] text-on-surface-variant">Create a board to see progress here.</p>
                ) : (
                  <div className="space-y-4">
                    {data.byBoard.map((b) => {
                      const pct = b.total > 0 ? Math.round((b.done / b.total) * 100) : 0;
                      return (
                        <button key={b.boardId} onClick={() => router.push(`/boards/${b.boardId}`)} className="w-full text-left group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[13px] font-medium text-on-surface group-hover:text-primary transition-colors truncate">{b.name}</span>
                            <span className="text-[12px] text-on-surface-variant shrink-0 ml-2">{b.done}/{b.total} · {pct}%</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-surface-variant/60 overflow-hidden">
                            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
