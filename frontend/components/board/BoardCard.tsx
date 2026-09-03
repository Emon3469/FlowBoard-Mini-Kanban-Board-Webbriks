'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiBoard } from '@/lib/api';

interface BoardCardProps {
  board: ApiBoard;
}

export function BoardCard({ board }: BoardCardProps) {
  const [favorite, setFavorite] = useState(false);
  const memberCount = board.members?.length ?? 0;
  const columnCount = board._count?.columns ?? board.columns?.length ?? 0;

  const initials = board.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-primary text-white',
    'bg-success text-white',
    'bg-warning text-white',
    'bg-info text-white',
    'bg-purple-500 text-white',
    'bg-pink-500 text-white',
  ];
  const colorIndex = board.name.length % colors.length;

  useEffect(() => {
    setFavorite(JSON.parse(localStorage.getItem('flowboard_favorites') ?? '[]').includes(board.id));
  }, [board.id]);

  const toggleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    const favorites = new Set<string>(JSON.parse(localStorage.getItem('flowboard_favorites') ?? '[]'));
    if (favorites.has(board.id)) favorites.delete(board.id);
    else favorites.add(board.id);
    localStorage.setItem('flowboard_favorites', JSON.stringify([...favorites]));
    setFavorite(favorites.has(board.id));
  };

  return (
    <Link href={`/boards/${board.id}`} className="group block">
      <div className="bg-surface dark:bg-[#161B22] border border-outline dark:border-[#30363D] rounded-2xl p-5 shadow-card hover:shadow-elevated hover:border-primary/30 dark:hover:border-primary/40 transition-all duration-200 h-full">
        {/* Board Avatar */}
        <div className={`w-11 h-11 rounded-xl ${colors[colorIndex]} flex items-center justify-center text-[14px] font-bold mb-4 shadow-sm`}>
          {initials}
        </div>

        {/* Board Name */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] text-on-surface dark:text-white group-hover:text-primary transition-colors mb-1 truncate">
            {board.name}
          </h3>
          <button type="button" onClick={toggleFavorite} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'} className="shrink-0 text-amber-500">
            <span className="material-symbols-outlined text-[18px]">{favorite ? 'star' : 'star_border'}</span>
          </button>
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-3 mt-3 text-[12px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">view_column</span>
            {columnCount} {columnCount === 1 ? 'column' : 'columns'}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">group</span>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Member Avatars */}
        {board.members && board.members.length > 0 && (
          <div className="flex items-center mt-3 -space-x-1.5">
            {board.members.slice(0, 4).map((m) => (
              <div
                key={m.userId ?? m.user?.id}
                className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center border-2 border-surface dark:border-[#161B22]"
                title={m.user?.name ?? 'Member'}
              >
                {(m.user?.name ?? '?')[0].toUpperCase()}
              </div>
            ))}
            {board.members.length > 4 && (
              <div className="w-6 h-6 rounded-full bg-surface-variant dark:bg-[#21262D] text-on-surface-variant text-[10px] font-medium flex items-center justify-center border-2 border-surface dark:border-[#161B22]">
                +{board.members.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Updated At */}
        {board.updatedAt && (
          <p className="text-[11px] text-on-surface-variant mt-3">
            Updated {new Date(board.updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  );
}
