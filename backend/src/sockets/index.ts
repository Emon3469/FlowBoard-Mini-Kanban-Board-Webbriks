import { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { boardEvents } from '../events/boardEvents';
import { verifyAccessToken } from '../lib/auth';

export function attachSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true } });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Authentication required'));
      socket.data.user = verifyAccessToken(token);
      next();
    } catch { next(new Error('Invalid access token')); }
  });
  io.on('connection', (socket) => {
    socket.on('board:join', (boardId: string) => {
      if (typeof boardId === 'string' && boardId.length < 100) socket.join(`board:${boardId}`);
    });
    socket.on('board:leave', (boardId: string) => socket.leave(`board:${boardId}`));
  });
  boardEvents.on('board:event', (event: { boardId: string }) => io.to(`board:${event.boardId}`).emit('board:event', event));
  return io;
}
