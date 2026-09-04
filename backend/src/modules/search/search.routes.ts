import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Global search scoped strictly to data the user can access.
router.get('/search', authenticate, async (req, res, next) => { try {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 1) return res.json({ data: { boards: [], tasks: [], notes: [] } });
  const userId = req.user!.id;
  const [boards, tasks, notes] = await Promise.all([
    prisma.board.findMany({ where: { members: { some: { userId } }, name: { contains: q, mode: 'insensitive' } }, take: 10, select: { id: true, name: true } }),
    prisma.task.findMany({ where: { title: { contains: q, mode: 'insensitive' }, column: { board: { members: { some: { userId } } } } }, take: 15, select: { id: true, title: true, priority: true, column: { select: { id: true, name: true, boardId: true } } } }),
    prisma.note.findMany({ where: { userId, OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }] }, take: 10, select: { id: true, title: true } }),
  ]);
  res.json({ data: { boards, tasks: tasks.map((task) => ({ id: task.id, title: task.title, priority: task.priority, boardId: task.column.boardId, columnName: task.column.name })), notes } });
} catch (error) { next(error); } });

export default router;
