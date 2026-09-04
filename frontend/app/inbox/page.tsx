'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notificationsApi, ApiNotification, NotificationType } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastContainer, showToast } from '@/components/ui/Modal';
import { formatRelativeTime } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

const typeMeta: Record<NotificationType, { icon: string; tint: string }> = {
  board_shared: { icon: 'share', tint: 'bg-primary/10 text-primary' },
  task_assigned: { icon: 'assignment_ind', tint: 'bg-warning/10 text-warning' },
  member_added: { icon: 'person_add', tint: 'bg-success/10 text-success' },
  role_changed: { icon: 'admin_panel_settings', tint: 'bg-primary/10 text-primary' },
  automation: { icon: 'bolt', tint: 'bg-warning/10 text-warning' },
};

function metaFor(type: string) {
  return typeMeta[type as NotificationType] ?? { icon: 'notifications', tint: 'bg-surface-variant text-on-surface-variant' };
}

export default function InboxPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-count'] });
  };

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markRead(ids),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: invalidate,
    onError: () => showToast('Could not remove notification.', 'error'),
  });

  const items = notifications.data?.data ?? [];
  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const visible = tab === 'unread' ? items.filter((n) => !n.read) : items;

  const openNotification = (n: ApiNotification) => {
    if (!n.read) markRead.mutate([n.id]);
    if (n.boardId) router.push(`/boards/${n.boardId}`);
  };

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">inbox</span>
                Inbox
              </h1>
              <p className="text-[13px] text-on-surface-variant mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}
              </p>
            </div>
            <button
              onClick={() => markRead.mutate(undefined)}
              disabled={unreadCount === 0 || markRead.isPending}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline bg-surface text-[13px] font-medium text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Mark all read
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 bg-surface border border-outline rounded-lg p-0.5 w-fit text-[13px] font-medium">
            {(['all', 'unread'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-1.5 rounded-md capitalize transition-colors',
                  tab === t ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {t}{t === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
              </button>
            ))}
          </div>

          {/* Feed */}
          {notifications.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-surface border border-outline animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] opacity-40">notifications_off</span>
              <p className="text-[14px] mt-2">{tab === 'unread' ? 'No unread notifications.' : 'Your inbox is clear.'}</p>
              <p className="text-[12px] mt-1">Sharing a board or assigning a task will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((n) => {
                const m = metaFor(n.type);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'group flex items-start gap-3 p-3.5 rounded-xl border transition-colors',
                      n.read ? 'bg-surface border-outline' : 'bg-primary/[0.04] border-primary/20'
                    )}
                  >
                    <span className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', m.tint)}>
                      <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                    </span>
                    <button
                      onClick={() => openNotification(n)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                        <p className={cn('text-[13.5px] truncate', n.read ? 'font-medium text-on-surface' : 'font-semibold text-on-surface')}>{n.title}</p>
                      </div>
                      {n.body && <p className="text-[12.5px] text-on-surface-variant mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1.5">
                        {formatRelativeTime(n.createdAt)}
                        {n.boardId && (
                          <span className="inline-flex items-center gap-0.5 text-primary">
                            · Open board <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </span>
                        )}
                      </p>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          onClick={() => markRead.mutate([n.id])}
                          title="Mark as read"
                          className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                      )}
                      <button
                        onClick={() => remove.mutate(n.id)}
                        title="Dismiss"
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-on-surface-variant hover:text-danger"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </AppLayout>
  );
}
