'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { workspaceApi } from '@/lib/api';

export default function NotesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  React.useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);
  const notes = useQuery({ queryKey: ['notes'], queryFn: workspaceApi.listNotes, enabled: !!user });
  const create = useMutation({ mutationFn: () => workspaceApi.createNote({ title, content }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); setTitle(''); setContent(''); setShowCreate(false); } });
  const remove = useMutation({ mutationFn: workspaceApi.deleteNote, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }) });
  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <h1 className="text-2xl font-bold">Notes</h1>
        <p className="text-xs text-on-surface-variant">Personal workspace</p>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">New note</button>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{notes.data?.data.map((note) => <article key={note.id} className="bg-surface border border-outline rounded-xl p-5"><h2 className="font-semibold">{note.title}</h2><p className="mt-3 text-sm text-on-surface-variant whitespace-pre-wrap">{note.content || 'Empty note'}</p><button onClick={() => remove.mutate(note.id)} className="mt-4 text-xs text-danger">Delete</button></article>)}</div>
        {!notes.isLoading && !notes.data?.data.length && <p className="text-on-surface-variant">Keep decisions, reminders, and ideas here.</p>}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New note">
          <div className="space-y-3">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" className="w-full rounded-lg border border-outline bg-surface p-2 text-on-surface" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a note..." rows={6} className="w-full rounded-lg border border-outline bg-surface p-2 text-on-surface" />
            <button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()} className="w-full rounded-lg bg-primary p-2 text-white disabled:opacity-50">Save note</button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}