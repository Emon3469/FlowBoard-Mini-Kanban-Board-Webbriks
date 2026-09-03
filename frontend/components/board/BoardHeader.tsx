'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ApiBoard, ApiMember } from '@/lib/api';

interface BoardHeaderProps {
  board: ApiBoard;
  currentUserId: string;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onOpenMembers: () => void;
  onAddColumn: () => void;
}

export function BoardHeader({
  board,
  currentUserId,
  onRename,
  onDelete,
  onOpenMembers,
  onAddColumn,
}: BoardHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(board.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentMember = board.members?.find((m) => (m.userId ?? m.user?.id) === currentUserId);
  const isOwner = currentMember?.role === 'OWNER';

  const handleRename = async () => {
    if (editName.trim() && editName.trim() !== board.name) {
      await onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await onDelete();
  };

  return (
    <div className="bg-surface/80 dark:bg-[#161B22]/80 backdrop-blur-xl border-b border-outline dark:border-[#30363D] px-5 py-3">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Back + Board Name */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg hover:bg-surface-variant dark:hover:bg-[#21262D] transition-colors flex-shrink-0"
            title="Back to boards"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">arrow_back</span>
          </Link>

          {isEditing && isOwner ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false); }}
              className="text-[16px] font-bold px-2 py-1 rounded-lg border border-primary bg-surface dark:bg-[#0E1117] text-on-surface dark:text-white focus:outline-none max-w-xs"
            />
          ) : (
            <h1
              className={`text-[16px] font-bold text-on-surface dark:text-white truncate ${isOwner ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
              onDoubleClick={() => { if (isOwner) { setEditName(board.name); setIsEditing(true); } }}
              title={isOwner ? 'Double-click to rename' : board.name}
            >
              {board.name}
            </h1>
          )}
        </div>

        {/* Right: Members + Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Member Avatars */}
          <button
            onClick={onOpenMembers}
            className="flex items-center -space-x-1.5 mr-1 hover:opacity-80 transition-opacity"
            title="View members"
          >
            {board.members?.slice(0, 5).map((m: ApiMember) => (
              <div
                key={m.userId ?? m.user?.id}
                className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center border-2 border-surface dark:border-[#161B22]"
                title={`${m.user?.name} (${m.role})`}
              >
                {(m.user?.name ?? '?')[0].toUpperCase()}
              </div>
            ))}
            {(board.members?.length ?? 0) > 5 && (
              <div className="w-7 h-7 rounded-full bg-surface-variant dark:bg-[#21262D] text-on-surface-variant text-[10px] font-medium flex items-center justify-center border-2 border-surface dark:border-[#161B22]">
                +{(board.members?.length ?? 0) - 5}
              </div>
            )}
          </button>

          {/* Share Button */}
          {isOwner && (
            <button
              onClick={onOpenMembers}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[12px] font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              Share
            </button>
          )}

          {/* Add Column */}
          <button
            onClick={onAddColumn}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            Column
          </button>

          {/* Delete Board */}
          {isOwner && (
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded-lg transition-colors ${
                confirmDelete
                  ? 'bg-danger text-white'
                  : 'hover:bg-danger/10 text-on-surface-variant hover:text-danger'
              }`}
              title={confirmDelete ? 'Click again to confirm deletion' : 'Delete board'}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
