'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { loadAccessToken } from './api';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
// Mirror the scheme-normalization in lib/api.ts so the socket connects to the
// same origin whether NEXT_PUBLIC_API_URL carries a scheme or is a bare host.
const API_URL = /^https?:\/\//i.test(RAW_API_URL)
  ? RAW_API_URL
  : `${/^(localhost|127\.|0\.0\.0\.0)/.test(RAW_API_URL) ? 'http' : 'https'}://${RAW_API_URL}`;

let socket: Socket | null = null;

/**
 * Lazily create (or reuse) the authenticated socket. Returns null during SSR or
 * when there is no access token yet. The connection is shared across the app and
 * layers *on top of* React Query polling — realtime is an enhancement, never the
 * only path, so the UI stays correct even if the socket never connects.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = loadAccessToken();
  if (!token) return null;
  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to live updates for a single board. Joins the server-side room
 * (membership is verified there) and refetches the board on any board event.
 * Debounced so a burst of events (e.g. a reorder) triggers a single refetch.
 */
export function useBoardRealtime(boardId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    if (!s || !boardId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const refetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: ['board', boardId] }), 250);
    };
    const join = () => s.emit('board:join', boardId);

    if (s.connected) join();
    s.on('connect', join);
    s.on('board:event', refetch);

    return () => {
      if (timer) clearTimeout(timer);
      s.emit('board:leave', boardId);
      s.off('connect', join);
      s.off('board:event', refetch);
    };
  }, [boardId, queryClient]);
}

/**
 * Subscribe to the current user's live notifications. Refreshes the inbox and the
 * unread-count badge whenever the server pushes a personal event.
 */
export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onUserEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    };
    s.on('user:event', onUserEvent);

    return () => { s.off('user:event', onUserEvent); };
  }, [queryClient]);
}
