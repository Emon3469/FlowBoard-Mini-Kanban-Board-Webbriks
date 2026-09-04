'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ApiTask, ApiMember, TaskMetadata, Priority, PRIORITIES } from '@/lib/api';
import { priorityMeta, priorityOf, toDateInputValue, formatFullDate, avatarColor, initialsOf } from '@/lib/board-utils';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: ApiTask | null;
  members: ApiMember[];
  canEdit: boolean;
  onSave: (taskId: string, data: TaskMetadata) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function TaskDetailModal({ open, onClose, task, members, canEdit, onSave, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setPriority(priorityOf(task));
      setDueDate(toDateInputValue(task.dueDate));
      setStartDate(toDateInputValue(task.startDate));
      setLabels(task.labels ?? []);
      setAssigneeId(task.assigneeId ?? '');
      setLabelDraft('');
      setConfirmDelete(false);
    }
  }, [task]);

  if (!task) return null;

  const origDue = toDateInputValue(task.dueDate);
  const origStart = toDateInputValue(task.startDate);
  const origLabels = task.labels ?? [];
  const labelsChanged = labels.length !== origLabels.length || labels.some((l, i) => l !== origLabels[i]);
  const hasChanges =
    title !== task.title ||
    description !== (task.description ?? '') ||
    priority !== priorityOf(task) ||
    dueDate !== origDue ||
    startDate !== origStart ||
    labelsChanged ||
    assigneeId !== (task.assigneeId ?? '');

  const addLabel = () => {
    const v = labelDraft.trim();
    if (v && !labels.includes(v)) setLabels([...labels, v]);
    setLabelDraft('');
  };

  const handleSave = async () => {
    if (!hasChanges || !title.trim()) return;
    const patch: TaskMetadata = {};
    if (title !== task.title) patch.title = title.trim();
    if (description !== (task.description ?? '')) patch.description = description.trim() || null;
    if (priority !== priorityOf(task)) patch.priority = priority;
    if (dueDate !== origDue) patch.dueDate = dueDate ? dueDate : null;
    if (startDate !== origStart) patch.startDate = startDate ? startDate : null;
    if (labelsChanged) patch.labels = labels;
    if (assigneeId !== (task.assigneeId ?? '')) patch.assigneeId = assigneeId || null;
    setSaving(true);
    try {
      await onSave(task.id, patch);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch {
      // handled by parent
    } finally {
      setDeleting(false);
    }
  };

  const labelClass = 'block text-[12px] font-medium text-on-surface-variant mb-1.5';
  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-outline bg-surface text-on-surface text-[13px] focus:outline-none focus:border-primary disabled:opacity-60';

  return (
    <Modal open={open} onClose={onClose} title={canEdit ? 'Edit Task' : 'Task Details'} maxWidth="max-w-lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
        {/* Title */}
        <div>
          <label className={labelClass}>Title</label>
          <input type="text" value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea value={description} disabled={!canEdit} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add a description..." className={cn(inputClass, 'resize-none')} />
        </div>

        {/* Priority + Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Priority</label>
            {canEdit ? (
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputClass}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{priorityMeta[p].label}</option>)}
              </select>
            ) : (
              <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold', priorityMeta[priority].chip)}>{priorityMeta[priority].label}</span>
            )}
          </div>
          <div>
            <label className={labelClass}>Assignee</label>
            {canEdit ? (
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.user?.name ?? m.user?.email ?? m.userId}</option>)}
              </select>
            ) : (
              <span className="text-[13px] text-on-surface">{members.find((m) => m.userId === assigneeId)?.user?.name ?? 'Unassigned'}</span>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Start date</label>
            {canEdit ? (
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            ) : (
              <span className="text-[13px] text-on-surface">{formatFullDate(task.startDate) || '—'}</span>
            )}
          </div>
          <div>
            <label className={labelClass}>Due date</label>
            {canEdit ? (
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            ) : (
              <span className="text-[13px] text-on-surface">{formatFullDate(task.dueDate) || '—'}</span>
            )}
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className={labelClass}>Labels</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {labels.map((label) => (
              <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-outline bg-surface-variant/50 text-[11px] font-medium text-on-surface">
                <span className="material-symbols-outlined text-[13px]">label</span>
                {label}
                {canEdit && (
                  <button onClick={() => setLabels(labels.filter((l) => l !== label))} className="hover:text-danger" aria-label={`Remove ${label}`}>
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                )}
              </span>
            ))}
            {labels.length === 0 && !canEdit && <span className="text-[12px] text-on-surface-variant">No labels</span>}
          </div>
          {canEdit && (
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
              onBlur={addLabel}
              placeholder="Add a label and press Enter"
              maxLength={40}
              className={inputClass}
            />
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">history</span>Version {task.version}</span>
          {task.updatedAt && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{new Date(task.updatedAt).toLocaleDateString()}</span>}
        </div>

        {/* Actions */}
        {canEdit ? (
          <div className="flex items-center justify-between pt-3 border-t border-outline">
            <button onClick={handleDelete} disabled={deleting} className={cn('px-3 py-2 rounded-lg text-[12px] font-medium transition-colors', confirmDelete ? 'bg-danger text-white hover:bg-danger/90' : 'text-danger hover:bg-danger/10')}>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">delete</span>
                {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete'}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !hasChanges || !title.trim()} className="px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-3 border-t border-outline">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant transition-colors">Close</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
