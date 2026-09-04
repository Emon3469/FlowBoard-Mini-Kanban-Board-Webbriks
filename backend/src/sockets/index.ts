import { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { boardEvents } from '../events/boardEvents';
import { verifyAccessToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

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
    const userId = socket.data.user.id as string;
    // Every socket joins its own user room for personal notifications.
    socket.join(`user:${userId}`);

    socket.on('board:join', async (boardId: string) => {
      if (typeof boardId !== 'string' || boardId.length > 100) return;
      try {
        // SECURITY: only members may subscribe to a board's live events.
        const member = await prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
        if (member) socket.join(`board:${boardId}`);
        else socket.emit('board:join:denied', { boardId });
      } catch {
        socket.emit('board:join:denied', { boardId });
      }
    });

    socket.on('board:leave', (boardId: string) => { if (typeof boardId === 'string') socket.leave(`board:${boardId}`); });
  });

  boardEvents.on('board:event', (event: { boardId: string }) => io.to(`board:${event.boardId}`).emit('board:event', event));
  boardEvents.on('user:event', (event: { userId: string }) => io.to(`user:${event.userId}`).emit('user:event', event));
  return io;
}
