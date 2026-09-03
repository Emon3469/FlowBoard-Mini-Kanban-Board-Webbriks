'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ApiTask } from '@/lib/api';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: ApiTask | null;
  onSave: (taskId: string, data: { title?: string; description?: string }) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function TaskDetailModal({ open, onClose, task, onSave, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setConfirmDelete(false);
    }
  }, [task]);

  if (!task) return null;

  const hasChanges = title !== task.title || description !== (task.description ?? '');

  const handleSave = async () => {
    if (!hasChanges || !title.trim()) return;
    setSaving(true);
    try {
      await onSave(task.id, {
        ...(title !== task.title ? { title: title.trim() } : {}),
        ...(description !== (task.description ?? '') ? { description: description.trim() || undefined } : {}),
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Task" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E] mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#0E1117] text-on-surface dark:text-white text-[13px] focus:outline-none focus:border-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E] mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Add a description..."
            className="w-full px-3 py-2.5 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#0E1117] text-on-surface dark:text-white text-[13px] focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">history</span>
            Version {task.version}
          </span>
          {task.updatedAt && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {new Date(task.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-outline dark:border-[#30363D]">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
              confirmDelete
                ? 'bg-danger text-white hover:bg-danger/90'
                : 'text-danger hover:bg-danger/10'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">delete</span>
              {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant dark:hover:bg-[#21262D] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || !title.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
