'use client';

import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { integrationsApi, IntegrationCatalogItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastContainer, showToast } from '@/components/ui/Modal';
import { formatFullDate } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

const providerIcon: Record<string, string> = {
  github: 'code', gitlab: 'merge', slack: 'tag', 'google-drive': 'folder', figma: 'draw', notion: 'description',
};

export default function IntegrationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);

  const integrations = useQuery({ queryKey: ['integrations'], queryFn: integrationsApi.list, enabled: !!user });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['integrations'] });

  const connect = useMutation({
    mutationFn: (p: string) => integrationsApi.connect(p),
    onSuccess: () => { invalidate(); showToast('Integration connected.', 'success'); },
    onError: () => showToast('Could not connect. Please try again.', 'error'),
  });
  const disconnect = useMutation({
    mutationFn: (p: string) => integrationsApi.disconnect(p),
    onSuccess: () => { invalidate(); showToast('Integration disconnected.', 'info'); },
    onError: () => showToast('Could not disconnect. Please try again.', 'error'),
  });

  const grouped = useMemo(() => {
    const items = integrations.data?.data ?? [];
    const map = new Map<string, IntegrationCatalogItem[]>();
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    }
    return Array.from(map, ([category, list]) => ({ category, list }));
  }, [integrations.data]);

  const pending = (p: string) =>
    (connect.isPending && connect.variables === p) || (disconnect.isPending && disconnect.variables === p);

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">extension</span>
              Integrations
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-1">Connect the tools your team already uses. Connections are saved to your account.</p>
          </div>

          {integrations.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-surface border border-outline animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ category, list }) => (
                <section key={category}>
                  <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wide mb-3">{category}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {list.map((it) => (
                      <div key={it.provider} className="bg-surface border border-outline rounded-xl p-4 flex flex-col">
                        <div className="flex items-start gap-3">
                          <span className="w-10 h-10 rounded-lg bg-surface-variant text-on-surface flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[20px]">{providerIcon[it.provider] ?? 'extension'}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-semibold text-on-surface">{it.name}</p>
                              {it.connected && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Connected
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-on-surface-variant mt-0.5">{it.description}</p>
                            {it.connected && it.connectedAt && (
                              <p className="text-[10.5px] text-on-surface-variant mt-1">Since {formatFullDate(it.connectedAt)}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => (it.connected ? disconnect.mutate(it.provider) : connect.mutate(it.provider))}
                            disabled={pending(it.provider)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50',
                              it.connected
                                ? 'border border-outline text-on-surface hover:bg-surface-variant'
                                : 'bg-primary text-white hover:bg-primary/90'
                            )}
                          >
                            {pending(it.provider) ? '…' : it.connected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </AppLayout>
  );
}
