'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import { boardApi, ApiTask, ApiColumn, ApiError } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';
import { KanbanToolbar } from '@/components/board/KanbanToolbar';
import { ColumnContainer } from '@/components/board/ColumnContainer';
import { TaskCardOverlay } from '@/components/board/TaskCard';
import { TaskDetailModal } from '@/components/board/TaskDetailModal';
import { MemberManager } from '@/components/board/MemberManager';
import { ToastContainer, showToast } from '@/components/ui/Modal';
import { Modal } from '@/components/ui/Modal';

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
  const [view, setView] = useState<'list' | 'kanban' | 'timeline'>('kanban');

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

  const board = data?.data;
  const columns = useMemo(
    () => [...(board?.columns ?? [])].sort((a, b) => a.position - b.position),
    [board?.columns]
  );

  // Build a flat task map for quick lookup
  const taskMap = useMemo(() => {
    const map = new Map<string, ApiTask>();
    columns.forEach((col) => col.tasks.forEach((t) => map.set(t.id, t)));
    return map;
  }, [columns]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ─── Mutations ───

  const refetchBoard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['board', boardId] });
  }, [queryClient, boardId]);

  const moveTaskMutation = useMutation({
    mutationFn: boardApi.moveTask,
    onSuccess: () => refetchBoard(),
    onError: (err) => {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        showToast('Task was modified by another user. Refreshing...', 'warning');
        refetchBoard();
      } else {
        showToast(err instanceof Error ? err.message : 'Failed to move task', 'error');
      }
    },
  });

  const addColumnMutation = useMutation({
    mutationFn: (name: string) => boardApi.addColumn(boardId, name),
    onSuccess: () => {
      refetchBoard();
      setShowAddColumn(false);
      setNewColumnName('');
      showToast('Column added!', 'success');
    },
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
    mutationFn: ({ taskId, data }: { taskId: string; data: { title?: string; description?: string } }) =>
      boardApi.updateTask(taskId, data),
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
    onSuccess: () => { refetchBoard(); showToast('Board renamed', 'success'); },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to rename board', 'error'),
  });

  const deleteBoardMutation = useMutation({
    mutationFn: () => boardApi.delete(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      showToast('Board deleted', 'info');
      router.push('/dashboard');
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete board', 'error'),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'EDITOR' | 'VIEWER' }) =>
      boardApi.addMember(boardId, { email, role }),
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

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by ColumnContainer's isOver state
  };

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

        if (sourceColumn.id === destColumn.id) {
          const fromIndex = sortedTasks.findIndex((t) => t.id === activeId);
          if (fromIndex === overIndex) return;
          destIndex = fromIndex < overIndex ? overIndex : overIndex;
        } else {
          destIndex = overIndex;
        }
      }
    }

    if (!destColumn) return;

    if (sourceColumn.id === destColumn.id) {
      const sortedTasks = [...sourceColumn.tasks].sort((a, b) => a.position - b.position);
      const fromIndex = sortedTasks.findIndex((t) => t.id === activeId);
      if (fromIndex === destIndex) return;
    }

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

  const handleSaveTask = async (taskId: string, data: { title?: string; description?: string }) => {
    await updateTaskMutation.mutateAsync({ taskId, data });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId);
  };

  const handleRenameColumn = async (columnId: string, name: string) => {
    await renameColumnMutation.mutateAsync({ id: columnId, name });
  };

  const handleDeleteColumn = async (columnId: string) => {
    await deleteColumnMutation.mutateAsync(columnId);
  };

  const handleAddMember = async (email: string, role: 'EDITOR' | 'VIEWER') => {
    await addMemberMutation.mutateAsync({ email, role });
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMemberMutation.mutateAsync(userId);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      setShowAddColumn(true);
      return;
    }
    addColumnMutation.mutate(newColumnName.trim());
  };

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
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Toolbar */}
      <KanbanToolbar
        boardName={board.name}
        view={view}
        onViewChange={setView}
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
                  tasks={[...column.tasks].sort((a, b) => a.position - b.position)}
                  onAddTask={handleAddTask}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onRenameColumn={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumn}
                  columnIndex={index}
                />
              ))}

              {/* Add Column Button / Inline Form */}
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
                      <button
                        onClick={handleAddColumn}
                        disabled={addColumnMutation.isPending || !newColumnName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors"
                      >
                        {addColumnMutation.isPending ? 'Adding...' : 'Add Column'}
                      </button>
                      <button
                        onClick={() => { setShowAddColumn(false); setNewColumnName(''); }}
                        className="px-3 py-1.5 rounded-lg text-[12px] text-on-surface-variant hover:bg-surface-variant transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddColumn(true)}
                    className="w-full py-10 rounded-2xl border-2 border-dashed border-outline text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[24px]">add</span>
                    <span className="text-[13px] font-medium">Add Column</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
            </DragOverlay>
            </DndContext>
          </div>
      ) : view === 'list' ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6 pt-2 custom-scrollbar">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">format_list_bulleted</span>
            <h2 className="text-2xl font-bold mt-4">List View</h2>
            <p className="text-on-surface-variant mt-4">
              List view functionality coming soon! This will display all tasks in a list format.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6 pt-2 custom-scrollbar">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">calendar_view_week</span>
            <h2 className="text-2xl font-bold mt-4">Timeline View</h2>
            <p className="text-on-surface-variant mt-4">
              Timeline view functionality coming soon! This will display tasks in a timeline/gantt chart format.
            </p>
          </div>
        </div>
      )}
      {/* Task Detail Modal */}
      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Member Manager Modal */}
      <MemberManager
        open={showMembers}
        onClose={() => setShowMembers(false)}
        members={board.members ?? []}
        currentUserId={user.id}
        isOwner={board.members?.some((m) => (m.userId ?? m.user?.id) === user.id && m.role === 'OWNER') ?? false}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />

      <ToastContainer />
    </AppLayout>
  );
}
