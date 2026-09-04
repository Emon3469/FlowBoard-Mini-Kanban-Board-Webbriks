'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useAuth } from '@/lib/auth-context';
import { boardApi, notificationsApi, ApiTask, ApiColumn, ApiError, TaskMetadata, BoardExport } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';
import { useBoardRealtime } from '@/lib/socket';
import { KanbanToolbar } from '@/components/board/KanbanToolbar';
import { ColumnContainer } from '@/components/board/ColumnContainer';
import { TaskCardOverlay } from '@/components/board/TaskCard';
import { TaskDetailModal } from '@/components/board/TaskDetailModal';
import { ListView } from '@/components/board/ListView';
import { TimelineView } from '@/components/board/TimelineView';
import { MemberManager } from '@/components/board/MemberManager';
import { ToastContainer, showToast, Modal } from '@/components/ui/Modal';
import {
  TaskFilters, SortKey, GroupKey, emptyFilters, filtersActive, matchesFilters, sortTasks,
} from '@/lib/board-utils';

type BoardQuery = { data: import('@/lib/api').ApiBoard };

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTask, setActiveTask] = useState<ApiTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ApiTask | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState(false);
  const [view, setView] = useState<'list' | 'kanban' | 'timeline'>('kanban');

  // Filter / sort / group state
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>('manual');
  const [group, setGroup] = useState<GroupKey>('none');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Fetch board data
  const { data, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardApi.get(boardId),
    enabled: !!user && !!boardId,
    refetchInterval: 15000,
  });

  // Unread notifications for the toolbar bell
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Live board updates (layers on top of the polling above).
  useBoardRealtime(boardId);

  const board = data?.data;
  const columns = useMemo(
    () => [...(board?.columns ?? [])].sort((a, b) => a.position - b.position),
    [board?.columns]
  );
  const members = board?.members ?? [];

  // Current user's role on this board → RBAC gating
  const myRole = useMemo(
    () => members.find((m) => (m.userId ?? m.user?.id) === user?.id)?.role,
    [members, user?.id]
  );
  const canEdit = myRole === 'OWNER' || myRole === 'EDITOR';
  const isOwner = myRole === 'OWNER';

  const memberName = useCallback(
    (id: string) => members.find((m) => m.userId === id)?.user?.name ?? 'Unknown',
    [members]
  );
  const columnNameOf = useCallback(
    (columnId: string) => columns.find((c) => c.id === columnId)?.name ?? '—',
    [columns]
  );

  // Build a flat task map for quick lookup
  const taskMap = useMemo(() => {
    const map = new Map<string, ApiTask>();
    columns.forEach((col) => col.tasks.forEach((t) => map.set(t.id, t)));
    return map;
  }, [columns]);

  const allTasks = useMemo(() => columns.flatMap((c) => c.tasks), [columns]);
  const availableLabels = useMemo(() => {
    const set = new Set<string>();
    allTasks.forEach((t) => (t.labels ?? []).forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [allTasks]);

  const filteredTasks = useMemo(() => allTasks.filter((t) => matchesFilters(t, filters)), [allTasks, filters]);

  const anyFilter = filtersActive(filters) > 0;
  const dragEnabled = canEdit && sort === 'manual' && !anyFilter;

  // Per-column display tasks for Kanban (filter + sort)
  const displayTasksFor = useCallback(
    (column: ApiColumn) => sortTasks(column.tasks.filter((t) => matchesFilters(t, filters)), sort),
    [filters, sort]
  );

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Mutations ───

  const refetchBoard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['board', boardId] });
  }, [queryClient, boardId]);

  const moveTaskMutation = useMutation({
    mutationFn: boardApi.moveTask,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardQuery>(['board', boardId]);
      queryClient.setQueryData<BoardQuery>(['board', boardId], (old) => {
        if (!old) return old;
        const cols = old.data.columns.map((c) => ({ ...c, tasks: [...c.tasks] }));
        let moved: ApiTask | undefined;
        for (const c of cols) {
          const i = c.tasks.findIndex((t) => t.id === vars.taskId);
          if (i >= 0) { moved = { ...c.tasks[i] }; c.tasks.splice(i, 1); break; }
        }
        if (!moved) return old;
        const dest = cols.find((c) => c.id === vars.destinationColumnId);
        if (!dest) return old;
        const sorted = [...dest.tasks].sort((a, b) => a.position - b.position);
        const idx = Math.max(0, Math.min(vars.destinationIndex, sorted.length));
        const before = sorted[idx - 1];
        const after = sorted[idx];
        const pos = before && after ? (before.position + after.position) / 2
          : before ? before.position + 1024
          : after ? after.position - 1024
          : 1024;
        moved.position = pos;
        moved.columnId = dest.id;
        dest.tasks.push(moved);
        return { ...old, data: { ...old.data, columns: cols } };
      });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['board', boardId], ctx.previous);
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        showToast('Task was modified by another user. Refreshing...', 'warning');
      } else {
        showToast(err instanceof Error ? err.message : 'Failed to move task', 'error');
      }
    },
    onSettled: () => refetchBoard(),
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: (orderedColumnIds: string[]) => boardApi.reorderColumns(boardId, orderedColumnIds),
    onMutate: async (orderedColumnIds) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previous = queryClient.getQueryData<BoardQuery>(['board', boardId]);
      queryClient.setQueryData<BoardQuery>(['board', boardId], (old) => {
        if (!old) return old;
        const byId = new Map(old.data.columns.map((c) => [c.id, c]));
        const reordered = orderedColumnIds
          .map((id, i) => { const c = byId.get(id); return c ? { ...c, position: (i + 1) * 1024 } : null; })
          .filter(Boolean) as ApiColumn[];
        return { ...old, data: { ...old.data, columns: reordered } };
      });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['board', boardId], ctx.previous);
      showToast(err instanceof Error ? err.message : 'Failed to reorder columns', 'error');
    },
    onSettled: () => refetchBoard(),
  });

  const addColumnMutation = useMutation({
    mutationFn: (name: string) => boardApi.addColumn(boardId, name),
    onSuccess: () => { refetchBoard(); setShowAddColumn(false); setNewColumnName(''); showToast('Column added!', 'success'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to add column', 'error'),
  });

  const renameColumnMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => boardApi.updateColumn(id, name),
    onSuccess: () => refetchBoard(),
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to rename column', 'error'),
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (id: string) => boardApi.deleteColumn(id),
    onSuccess: () => { refetchBoard(); showToast('Column deleted', 'info'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete column', 'error'),
  });

  const addTaskMutation = useMutation({
    mutationFn: ({ columnId, title, description }: { columnId: string; title: string; description?: string }) =>
      boardApi.addTask(columnId, { title, description }),
    onSuccess: () => refetchBoard(),
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to add task', 'error'),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: TaskMetadata }) => boardApi.updateTask(taskId, data),
    onSuccess: () => { refetchBoard(); showToast('Task updated', 'success'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update task', 'error'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => boardApi.deleteTask(taskId),
    onSuccess: () => { refetchBoard(); showToast('Task deleted', 'info'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete task', 'error'),
  });

  const renameBoardMutation = useMutation({
    mutationFn: (name: string) => boardApi.update(boardId, name),
    onSuccess: () => { refetchBoard(); queryClient.invalidateQueries({ queryKey: ['boards'] }); setShowSettings(false); showToast('Board renamed', 'success'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to rename board', 'error'),
  });

  const deleteBoardMutation = useMutation({
    mutationFn: () => boardApi.delete(boardId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boards'] }); showToast('Board deleted', 'info'); router.push('/dashboard'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete board', 'error'),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'EDITOR' | 'VIEWER' }) => boardApi.addMember(boardId, { email, role }),
    onSuccess: () => { refetchBoard(); showToast('Member invited!', 'success'); },
    onError: (err) => { throw err; },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => boardApi.removeMember(boardId, userId),
    onSuccess: () => { refetchBoard(); showToast('Member removed', 'info'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to remove member', 'error'),
  });

  // ─── DnD Handlers ───

  function findColumnOfTask(taskId: string): ApiColumn | undefined {
    return columns.find((col) => col.tasks.some((t) => t.id === taskId));
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = taskMap.get(event.active.id as string);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (_event: DragOverEvent) => { /* visual feedback via ColumnContainer isOver */ };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !active) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const task = taskMap.get(activeId);
    if (!task) return;

    const sourceColumn = findColumnOfTask(activeId);
    if (!sourceColumn) return;

    let destColumn: ApiColumn | undefined;
    let destIndex = 0;

    if (overId.startsWith('column-')) {
      const colId = overId.replace('column-', '');
      destColumn = columns.find((c) => c.id === colId);
      destIndex = destColumn ? destColumn.tasks.length : 0;
    } else {
      destColumn = findColumnOfTask(overId);
      if (destColumn) {
        const sortedTasks = [...destColumn.tasks].sort((a, b) => a.position - b.position);
        const overIndex = sortedTasks.findIndex((t) => t.id === overId);
        // The backend recomputes the destination list EXCLUDING the moving task, so
        // destinationIndex == overIndex is correct for both same-column and cross-column moves.
        if (sourceColumn.id === destColumn.id) {
          const fromIndex = sortedTasks.findIndex((t) => t.id === activeId);
          if (fromIndex === overIndex) return; // no-op
        }
        destIndex = overIndex;
      }
    }

    if (!destColumn) return;

    moveTaskMutation.mutate({
      taskId: activeId,
      destinationColumnId: destColumn.id,
      destinationIndex: destIndex,
      expectedVersion: task.version,
    });
  };

  // ─── Handlers ───

  const handleAddTask = async (columnId: string, title: string, description?: string) => {
    await addTaskMutation.mutateAsync({ columnId, title, description });
  };
  const handleSaveTask = async (taskId: string, dataPatch: TaskMetadata) => {
    await updateTaskMutation.mutateAsync({ taskId, data: dataPatch });
  };
  const handleDeleteTask = async (taskId: string) => { await deleteTaskMutation.mutateAsync(taskId); };
  const handleRenameColumn = async (columnId: string, name: string) => { await renameColumnMutation.mutateAsync({ id: columnId, name }); };
  const handleDeleteColumn = async (columnId: string) => { await deleteColumnMutation.mutateAsync(columnId); };
  const handleAddMember = async (email: string, role: 'EDITOR' | 'VIEWER') => { await addMemberMutation.mutateAsync({ email, role }); };
  const handleRemoveMember = async (userId: string) => { await removeMemberMutation.mutateAsync(userId); };

  const handleMoveColumn = (columnId: string, dir: 'left' | 'right') => {
    const ids = columns.map((c) => c.id);
    const i = ids.indexOf(columnId);
    const j = dir === 'left' ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderColumnsMutation.mutate(ids);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) { setShowAddColumn(true); return; }
    addColumnMutation.mutate(newColumnName.trim());
  };

  // Import / Export
  const handleExport = async () => {
    try {
      const res = await boardApi.exportBoard(boardId);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(board?.name ?? 'board').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.flowboard.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Board exported', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BoardExport;
      if (!payload?.name || !Array.isArray(payload?.columns)) throw new Error('Invalid board file.');
      const res = await boardApi.importBoard(payload);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      showToast('Board imported!', 'success');
      router.push(`/boards/${res.data.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    }
  };

  const handleAskAI = () => {
    window.dispatchEvent(new CustomEvent('flowboard:ask-ai', { detail: { boardId } }));
  };

  const openSettings = () => { setSettingsName(board?.name ?? ''); setConfirmDeleteBoard(false); setShowSettings(true); };

  // ─── Loading / Error States ───

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary animate-pulse" />
          <span className="text-on-surface-variant text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
              <span className="material-symbols-outlined text-[28px]">view_kanban</span>
            </div>
            <p className="text-[13px] text-on-surface-variant">Loading board...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !board) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="bg-surface border border-outline rounded-2xl p-8 text-center max-w-sm">
            <span className="material-symbols-outlined text-danger text-[32px] mb-3 block">error</span>
            <h2 className="text-[15px] font-semibold text-on-surface">Board not found</h2>
            <p className="text-[12px] text-on-surface-variant mt-1">
              {error instanceof Error ? error.message : 'This board may have been deleted or you don\'t have access.'}
            </p>
            <button onClick={() => router.push('/dashboard')} className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors">
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

      {/* Toolbar */}
      <KanbanToolbar
        boardName={board.name}
        view={view}
        onViewChange={setView}
        canEdit={canEdit}
        isOwner={isOwner}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        group={group}
        onGroupChange={setGroup}
        members={members}
        availableLabels={availableLabels}
        unreadCount={unreadData?.data.count}
        onAskAI={handleAskAI}
        onOpenSettings={openSettings}
        onImport={handleImportClick}
        onExport={handleExport}
        onAddNew={() => setShowAddColumn(true)}
        onOpenMembers={() => setShowMembers(true)}
      />

      {/* Board Views */}
      {view === 'kanban' ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6 pt-2 custom-scrollbar">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-start gap-4 h-full min-w-max pb-4">
              {columns.map((column, index) => (
                <ColumnContainer
                  key={column.id}
                  column={column}
                  tasks={displayTasksFor(column)}
                  canEdit={canEdit}
                  dragEnabled={dragEnabled}
                  onAddTask={handleAddTask}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onRenameColumn={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onMoveColumn={handleMoveColumn}
                  columnIndex={index}
                  isFirst={index === 0}
                  isLast={index === columns.length - 1}
                />
              ))}

              {/* Add Column Button / Inline Form */}
              {canEdit && (
                <div className="flex-shrink-0 w-[280px]">
                  {showAddColumn ? (
                    <div className="bg-surface border border-outline rounded-2xl p-3.5">
                      <input
                        autoFocus
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddColumn();
                          if (e.key === 'Escape') { setShowAddColumn(false); setNewColumnName(''); }
                        }}
                        placeholder="Column name..."
                        className="w-full px-3 py-2 rounded-xl border border-outline bg-surface-variant/50 text-on-surface text-[13px] focus:outline-none focus:border-primary"
                      />
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={handleAddColumn} disabled={addColumnMutation.isPending || !newColumnName.trim()} className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors">
                          {addColumnMutation.isPending ? 'Adding...' : 'Add Column'}
                        </button>
                        <button onClick={() => { setShowAddColumn(false); setNewColumnName(''); }} className="px-3 py-1.5 rounded-lg text-[12px] text-on-surface-variant hover:bg-surface-variant transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddColumn(true)} className="w-full py-10 rounded-2xl border-2 border-dashed border-outline text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[24px]">add</span>
                      <span className="text-[13px] font-medium">Add Column</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
          </DndContext>
        </div>
      ) : view === 'list' ? (
        <ListView tasks={filteredTasks} columnNameOf={columnNameOf} members={members} sort={sort} group={group} onTaskClick={(task) => setSelectedTask(task)} />
      ) : (
        <TimelineView tasks={filteredTasks} columnNameOf={columnNameOf} onTaskClick={(task) => setSelectedTask(task)} />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        members={members}
        canEdit={canEdit}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Member Manager Modal */}
      <MemberManager
        open={showMembers}
        onClose={() => setShowMembers(false)}
        members={members}
        currentUserId={user.id}
        isOwner={isOwner}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />

      {/* Board Settings Modal (owner only) */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Board Settings" maxWidth="max-w-md">
        <div className="space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Board name</label>
            <div className="flex gap-2">
              <input
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-outline bg-surface text-on-surface text-[13px] focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => settingsName.trim() && settingsName.trim() !== board.name && renameBoardMutation.mutate(settingsName.trim())}
                disabled={renameBoardMutation.isPending || !settingsName.trim() || settingsName.trim() === board.name}
                className="px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Rename
              </button>
            </div>
          </div>

          <div className="border-t border-outline pt-4">
            <p className="text-[12px] font-medium text-danger mb-1">Danger zone</p>
            <p className="text-[11px] text-on-surface-variant mb-3">Deleting a board removes all its columns and tasks. This cannot be undone.</p>
            <button
              onClick={() => { if (confirmDeleteBoard) deleteBoardMutation.mutate(); else setConfirmDeleteBoard(true); }}
              disabled={deleteBoardMutation.isPending}
              className={`px-4 py-2 rounded-xl text-[12px] font-medium transition-colors ${confirmDeleteBoard ? 'bg-danger text-white hover:bg-danger/90' : 'border border-danger text-danger hover:bg-danger/10'}`}
            >
              {deleteBoardMutation.isPending ? 'Deleting...' : confirmDeleteBoard ? 'Click again to confirm delete' : 'Delete this board'}
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </AppLayout>
  );
}
