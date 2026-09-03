'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ApiMember } from '@/lib/api';

interface MemberManagerProps {
  open: boolean;
  onClose: () => void;
  members: ApiMember[];
  currentUserId: string;
  isOwner: boolean;
  onAddMember: (email: string, role: 'EDITOR' | 'VIEWER') => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

const roleBadge: Record<string, string> = {
  OWNER: 'bg-warning/10 text-warning',
  EDITOR: 'bg-primary/10 text-primary',
  VIEWER: 'bg-surface-variant text-on-surface-variant',
};

export function MemberManager({
  open,
  onClose,
  members,
  currentUserId,
  isOwner,
  onAddMember,
  onRemoveMember,
}: MemberManagerProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!email.trim()) return;
    setError('');
    setAdding(true);
    try {
      await onAddMember(email.trim().toLowerCase(), role);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Board Members" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Member List */}
        <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
          {members.map((m) => {
            const initials = m.user.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={m.userId ?? m.user.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-variant/50 dark:bg-[#21262D]/50"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-on-surface dark:text-white truncate">
                    {m.user.name}
                    {(m.userId ?? m.user.id) === currentUserId && (
                      <span className="text-[11px] text-on-surface-variant ml-1">(you)</span>
                    )}
                  </p>
                  <p className="text-[11px] text-on-surface-variant truncate">{m.user.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${roleBadge[m.role]}`}>
                  {m.role}
                </span>
                {isOwner && m.role !== 'OWNER' && (m.userId ?? m.user.id) !== currentUserId && (
                  <button
                    onClick={() => onRemoveMember(m.userId ?? m.user.id)}
                    className="p-1 rounded-lg hover:bg-danger/10 text-on-surface-variant hover:text-danger transition-colors"
                    title="Remove member"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Member Form (owner only) */}
        {isOwner && (
          <div className="pt-3 border-t border-outline dark:border-[#30363D]">
            <label className="block text-[12px] font-medium text-on-surface-variant mb-2">
              Invite Member
            </label>

            {error && (
              <div className="mb-2 p-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-[12px]">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="user@example.com"
                className="flex-1 px-3 py-2 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#0E1117] text-on-surface dark:text-white text-[13px] focus:outline-none focus:border-primary"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="px-2 py-2 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#0E1117] text-on-surface dark:text-white text-[12px] focus:outline-none focus:border-primary"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={adding || !email.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {adding ? '...' : 'Invite'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
