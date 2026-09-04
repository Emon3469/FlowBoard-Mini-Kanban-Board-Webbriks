'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { boardApi, automationsApi, ApiAutomation, AutomationInput, PRIORITIES, Priority } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Modal, ToastContainer, showToast } from '@/components/ui/Modal';
import { priorityMeta } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

type Action = ApiAutomation['action'];
const ACTION_LABELS: Record<Action, string> = {
  set_priority: 'Set priority',
  add_label: 'Add label',
  assign: 'Assign to member',
  notify: 'Notify members',
};
const ACTION_ICONS: Record<Action, string> = {
  set_priority: 'flag', add_label: 'label', assign: 'person', notify: 'notifications',
};

export default function WorkflowsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);

  const [boardId, setBoardId] = useState<string>('');

  const boards = useQuery({ queryKey: ['boards'], queryFn: boardApi.list, enabled: !!user });
  useEffect(() => {
    const list = boards.data?.data;
    if (list && list.length && !boardId) setBoardId(list[0].id);
  }, [boards.data, boardId]);

  const board = useQuery({ queryKey: ['board', boardId], queryFn: () => boardApi.get(boardId), enabled: !!boardId });
  const automations = useQuery({ queryKey: ['automations', boardId], queryFn: () => automationsApi.list(boardId), enabled: !!boardId });

  const columns = board.data?.data.columns ?? [];
  const members = board.data?.data.members ?? [];
  const myRole = members.find((m) => m.userId === user?.id)?.role;
  const canEdit = myRole === 'OWNER' || myRole === 'EDITOR';

  const columnName = (id: string | null) => (id ? columns.find((c) => c.id === id)?.name ?? 'a column' : null);
  const memberName = (id: string | null) => (id ? members.find((m) => m.userId === id)?.user?.name ?? 'a member' : null);

  /* ── Rule form ── */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fName, setFName] = useState('');
  const [fTrigger, setFTrigger] = useState('');
  const [fAction, setFAction] = useState<Action>('set_priority');
  const [fValue, setFValue] = useState('MEDIUM');
  const [fEnabled, setFEnabled] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ApiAutomation | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automations', boardId] });

  const defaultValueFor = (action: Action): string => {
    if (action === 'set_priority') return 'MEDIUM';
    if (action === 'assign') return members.find((m) => m.userId !== user?.id)?.userId ?? members[0]?.userId ?? '';
    return '';
  };

  const openCreate = () => {
    setEditingId(null);
    setFName('');
    setFTrigger(columns[0]?.id ?? '');
    setFAction('set_priority');
    setFValue('MEDIUM');
    setFEnabled(true);
    setFormOpen(true);
  };
  const openEdit = (a: ApiAutomation) => {
    setEditingId(a.id);
    setFName(a.name);
    setFTrigger(a.triggerColumnId ?? '');
    setFAction(a.action);
    setFValue(a.actionValue ?? defaultValueFor(a.action));
    setFEnabled(a.enabled);
    setFormOpen(true);
  };
  const onActionChange = (action: Action) => { setFAction(action); setFValue(defaultValueFor(action)); };

  const buildInput = (): AutomationInput => ({
    name: fName.trim(),
    enabled: fEnabled,
    triggerColumnId: fTrigger || null,
    action: fAction,
    actionValue: fAction === 'notify' ? null : fValue,
  });

  const valid = () => {
    if (!fName.trim()) return false;
    if (fAction === 'set_priority') return PRIORITIES.includes(fValue as Priority);
    if (fAction === 'add_label') return fValue.trim().length > 0;
    if (fAction === 'assign') return !!fValue;
    return true; // notify
  };

  const save = useMutation({
    mutationFn: () => (editingId ? automationsApi.update(editingId, buildInput()) : automationsApi.create(boardId, buildInput())),
    onSuccess: () => { invalidate(); showToast(editingId ? 'Workflow updated.' : 'Workflow created.', 'success'); setFormOpen(false); },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not save workflow.', 'error'),
  });
  const toggleEnabled = useMutation({
    mutationFn: (a: ApiAutomation) => automationsApi.update(a.id, { enabled: !a.enabled }),
    onSuccess: invalidate,
    onError: () => showToast('Could not update workflow.', 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => automationsApi.remove(id),
    onSuccess: () => { invalidate(); showToast('Workflow deleted.', 'success'); setDeleteTarget(null); },
    onError: () => showToast('Could not delete workflow.', 'error'),
  });

  const describe = (a: ApiAutomation): string => {
    const trigger = a.triggerColumnId ? `moved to "${columnName(a.triggerColumnId)}"` : 'moved to any column';
    let effect = '';
    if (a.action === 'set_priority') effect = `set priority to ${a.actionValue}`;
    else if (a.action === 'add_label') effect = `add the label "${a.actionValue}"`;
    else if (a.action === 'assign') effect = `assign it to ${memberName(a.actionValue)}`;
    else effect = 'notify board members';
    return `When a task is ${trigger}, ${effect}.`;
  };

  const rules = automations.data?.data ?? [];
  const boardList = boards.data?.data ?? [];

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-[22px] font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">bolt</span>
                Workflows
              </h1>
              <p className="text-[13px] text-on-surface-variant mt-1">Automate actions when a task moves between columns. Rules run automatically after each move.</p>
            </div>
          </div>

          {boardList.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] opacity-40">bolt</span>
              <p className="text-[14px] mt-2">Create a board first to add workflows.</p>
            </div>
          ) : (
            <>
              {/* Board selector + add */}
              <div className="flex items-center justify-between gap-3 mt-5 mb-4">
                <label className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                  Board
                  <select
                    value={boardId}
                    onChange={(e) => setBoardId(e.target.value)}
                    className="rounded-lg border border-outline bg-surface px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  >
                    {boardList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                {canEdit && (
                  <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    New workflow
                  </button>
                )}
              </div>

              {!canEdit && (
                <p className="text-[12px] text-on-surface-variant mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  You have view-only access to this board&apos;s workflows.
                </p>
              )}

              {/* Rules */}
              {automations.isLoading || board.isLoading ? (
                <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-20 rounded-xl bg-surface border border-outline animate-pulse" />)}</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-14 text-on-surface-variant border border-dashed border-outline rounded-xl">
                  <span className="material-symbols-outlined text-[40px] opacity-40">rule_settings</span>
                  <p className="text-[13px] mt-2">No workflows yet on this board.</p>
                  {canEdit && <button onClick={openCreate} className="text-[13px] text-primary hover:underline mt-1">Create one</button>}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rules.map((a) => (
                    <div key={a.id} className={cn('bg-surface border rounded-xl p-4 flex items-start gap-3', a.enabled ? 'border-outline' : 'border-outline opacity-70')}>
                      <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', a.enabled ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant')}>
                        <span className="material-symbols-outlined text-[18px]">{ACTION_ICONS[a.action]}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-semibold text-on-surface truncate">{a.name}</p>
                          {!a.enabled && <span className="text-[10px] text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded-full">Paused</span>}
                        </div>
                        <p className="text-[12px] text-on-surface-variant mt-0.5">{describe(a)}</p>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleEnabled.mutate(a)}
                            title={a.enabled ? 'Pause' : 'Enable'}
                            className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant"
                          >
                            <span className="material-symbols-outlined text-[18px]">{a.enabled ? 'toggle_on' : 'toggle_off'}</span>
                          </button>
                          <button onClick={() => openEdit(a)} title="Edit" className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant hover:text-on-surface">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => setDeleteTarget(a)} title="Delete" className="p-1.5 rounded-lg hover:bg-danger/10 text-on-surface-variant hover:text-danger">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create / edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit workflow' : 'New workflow'}>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Name</label>
            <input autoFocus value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Escalate on Done" className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">When a task is moved to</label>
            <select value={fTrigger} onChange={(e) => setFTrigger(e.target.value)} className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary">
              <option value="">Any column</option>
              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Then</label>
            <select value={fAction} onChange={(e) => onActionChange(e.target.value as Action)} className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary">
              {(Object.keys(ACTION_LABELS) as Action[]).map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
            </select>
          </div>

          {fAction === 'set_priority' && (
            <div>
              <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Priority</label>
              <select value={fValue} onChange={(e) => setFValue(e.target.value)} className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary">
                {PRIORITIES.map((p) => <option key={p} value={p}>{priorityMeta[p].label}</option>)}
              </select>
            </div>
          )}
          {fAction === 'add_label' && (
            <div>
              <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Label</label>
              <input value={fValue} onChange={(e) => setFValue(e.target.value)} placeholder="e.g. needs-review" className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
            </div>
          )}
          {fAction === 'assign' && (
            <div>
              <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Assign to</label>
              <select value={fValue} onChange={(e) => setFValue(e.target.value)} className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary">
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.user?.name ?? m.user?.email}</option>)}
              </select>
            </div>
          )}
          {fAction === 'notify' && (
            <p className="text-[12px] text-on-surface-variant bg-surface-variant/60 rounded-lg px-3 py-2">All board members will get a notification when this rule runs.</p>
          )}

          <label className="flex items-center gap-2 text-[13px] text-on-surface cursor-pointer">
            <input type="checkbox" checked={fEnabled} onChange={(e) => setFEnabled(e.target.checked)} />
            Enabled
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button disabled={!valid() || save.isPending} onClick={() => save.mutate()} className="flex-1 rounded-lg bg-primary py-2.5 text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create workflow'}
            </button>
            <button onClick={() => setFormOpen(false)} className="px-4 py-2.5 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-variant transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete workflow">
        <p className="text-[13px] text-on-surface-variant">Delete <span className="font-semibold text-on-surface">{deleteTarget?.name}</span>? This cannot be undone.</p>
        <div className="flex items-center gap-2 mt-4">
          <button disabled={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)} className="flex-1 rounded-lg bg-danger py-2.5 text-white text-[13px] font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors">
            {remove.isPending ? 'Deleting…' : 'Delete workflow'}
          </button>
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2.5 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-variant transition-colors">Cancel</button>
        </div>
      </Modal>

      <ToastContainer />
    </AppLayout>
  );
}
