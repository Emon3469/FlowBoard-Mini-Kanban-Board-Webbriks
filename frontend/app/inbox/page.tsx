'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { boardApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';

export default function InboxPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);
  const boards = useQuery({ queryKey: ['boards'], queryFn: boardApi.list, enabled: !!user });
  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
        <p className="text-on-surface-variant">Recent workspace activity.</p>
        <div className="mt-6 max-w-2xl bg-surface border border-outline rounded-xl divide-y divide-outline">
          {boards.data?.data.length ? boards.data.data.map((board) => <div key={board.id} className="p-4 flex items-center gap-3"><span className="material-symbols-outlined text-primary">inbox</span><div><p className="font-medium">{board.name} is ready to review</p><p className="text-xs text-on-surface-variant">{board._count?.columns ?? board.columns?.length ?? 0} columns</p></div></div>) : <p className="p-5 text-on-surface-variant">Your inbox is clear.</p>}
        </div>
      </div>
    </AppLayout>
  );
}