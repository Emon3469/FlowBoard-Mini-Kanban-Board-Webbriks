'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Modal, ToastContainer, showToast } from '@/components/ui/Modal';
import { workspaceApi, ApiNote } from '@/lib/api';
import { formatRelativeTime } from '@/lib/board-utils';

export default function NotesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // editing: 'new' to create, an ApiNote to edit, null when closed
  const [editing, setEditing] = useState<ApiNote | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ApiNote | null>(null);

  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);

  const notes = useQuery({ queryKey: ['notes'], queryFn: workspaceApi.listNotes, enabled: !!user });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notes'] });

  const openCreate = () => { setTitle(''); setContent(''); setEditing('new'); };
  const openEdit = (note: ApiNote) => { setTitle(note.title); setContent(note.content); setEditing(note); };
  const closeEditor = () => setEditing(null);

  const save = useMutation({
    mutationFn: () => {
      const body = { title: title.trim(), content };
      return editing === 'new'
        ? workspaceApi.createNote(body)
        : workspaceApi.updateNote((editing as ApiNote).id, body);
    },
    onSuccess: () => {
      invalidate();
      showToast(editing === 'new' ? 'Note created.' : 'Note updated.', 'success');
      closeEditor();
    },
    onError: () => showToast('Could not save note.', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => workspaceApi.deleteNote(id),
    onSuccess: () => { invalidate(); showToast('Note deleted.', 'success'); setDeleteTarget(null); },
    onError: () => showToast('Could not delete note.', 'error'),
  });

  if (authLoading || !user) return null;

  const list = notes.data?.data ?? [];

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">sticky_note_2</span>
                Notes
              </h1>
              <p className="text-[13px] text-on-surface-variant mt-1">Keep decisions, reminders, and ideas in your personal workspace.</p>
            </div>
            <button onClick={openCreate} className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white font-medium text-[13px] hover:bg-primary/90 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New note
            </button>
          </div>

          {/* Grid */}
          {notes.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-xl bg-surface border border-outline animate-pulse" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] opacity-40">note_stack</span>
              <p className="text-[14px] mt-2">No notes yet.</p>
              <button onClick={openCreate} className="text-[13px] text-primary hover:underline mt-1">Create your first note</button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((note) => (
                <article key={note.id} className="group bg-surface border border-outline rounded-xl p-5 flex flex-col hover:border-primary/30 transition-colors">
                  <button onClick={() => openEdit(note)} className="text-left flex-1 min-w-0">
                    <h2 className="font-semibold text-[14px] text-on-surface truncate">{note.title}</h2>
                    <p className="mt-2 text-[13px] text-on-surface-variant whitespace-pre-wrap line-clamp-5">{note.content || 'Empty note'}</p>
                  </button>
                  <div className="mt-4 pt-3 border-t border-outline/60 flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant">Updated {formatRelativeTime(note.updatedAt)}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openEdit(note)} title="Edit" className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant hover:text-on-surface">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => setDeleteTarget(note)} title="Delete" className="p-1.5 rounded-lg hover:bg-danger/10 text-on-surface-variant hover:text-danger">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      <Modal open={editing !== null} onClose={closeEditor} title={editing === 'new' ? 'New note' : 'Edit note'}>
        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="w-full rounded-lg border border-outline bg-surface p-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note..."
            rows={8}
            className="w-full rounded-lg border border-outline bg-surface p-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              disabled={!title.trim() || save.isPending}
              onClick={() => save.mutate()}
              className="flex-1 rounded-lg bg-primary py-2.5 text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {save.isPending ? 'Saving…' : editing === 'new' ? 'Create note' : 'Save changes'}
            </button>
            <button onClick={closeEditor} className="px-4 py-2.5 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-variant transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete note">
        <p className="text-[13px] text-on-surface-variant">
          Delete <span className="font-semibold text-on-surface">{deleteTarget?.title}</span>? This cannot be undone.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <button
            disabled={remove.isPending}
            onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}
            className="flex-1 rounded-lg bg-danger py-2.5 text-white text-[13px] font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors"
          >
            {remove.isPending ? 'Deleting…' : 'Delete note'}
          </button>
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2.5 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-variant transition-colors">
            Cancel
          </button>
        </div>
      </Modal>

      <ToastContainer />
    </AppLayout>
  );
}
