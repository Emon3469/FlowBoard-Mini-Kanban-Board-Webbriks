'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { boardApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);
  const boards = useQuery({ queryKey: ['boards'], queryFn: boardApi.list, enabled: !!user });
  const columns = boards.data?.data.flatMap((board) => board.columns ?? []) ?? [];
  const tasks = columns.flatMap((column) => column.tasks ?? []);
  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <p className="text-on-surface-variant">A live summary of your workspace.</p>
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          {[['Boards', boards.data?.data.length ?? 0], ['Columns', columns.length], ['Tasks', tasks.length]].map(([label, value]) => <div key={label} className="bg-surface border border-outline rounded-xl p-5"><p className="text-xs text-on-surface-variant">{label}</p><strong className="text-3xl">{value}</strong></div>)}
        </div>
      </div>
    </AppLayout>
  );
}