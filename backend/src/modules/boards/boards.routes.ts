import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { routeParam, sendError } from '../../lib/http';
import { emitBoardEvent } from '../../events/boardEvents';
import { INITIAL_GAP } from '../tasks/ordering';
import { boardSchema } from './boards.schemas';

const router = Router();
router.use(authenticate);

const boardInclude = {
  columns: { orderBy: { position: 'asc' as const }, include: { tasks: { orderBy: { position: 'asc' as const } } } },
  members: { include: { user: { select: { id: true, name: true, email: true } } } },
};

const importSchema = z.object({
  version: z.number().optional(),
  name: z.string().trim().min(1).max(120),
  columns: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    tasks: z.array(z.object({
      title: z.string().trim().min(1).max(160),
      description: z.string().max(2000).nullish(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      dueDate: z.union([z.coerce.date(), z.null()]).optional(),
      startDate: z.union([z.coerce.date(), z.null()]).optional(),
      labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    }).strict()).max(500).default([]),
  }).strict()).max(50).default([]),
}).strict();

router.get('/', async (req, res, next) => { try { const boards = await prisma.board.findMany({ where: { members: { some: { userId: req.user!.id } } }, include: { members: { where: { userId: req.user!.id } }, _count: { select: { columns: true } } }, orderBy: { updatedAt: 'desc' } }); res.json({ data: boards }); } catch (error) { next(error); } });

router.post('/', validate(boardSchema), async (req, res, next) => { try {
  const board = await prisma.board.create({ data: { name: req.body.name, ownerId: req.user!.id, members: { create: { userId: req.user!.id, role: 'OWNER' } }, columns: { create: [{ name: 'To do', position: INITIAL_GAP }, { name: 'In progress', position: INITIAL_GAP * 2 }, { name: 'Done', position: INITIAL_GAP * 3 }] } }, include: boardInclude });
  res.status(201).json({ data: board });
} catch (error) { next(error); } });

router.post('/import', validate(importSchema), async (req, res, next) => { try {
  const { name, columns } = req.body as z.infer<typeof importSchema>;
  const board = await prisma.board.create({ data: {
    name,
    ownerId: req.user!.id,
    members: { create: { userId: req.user!.id, role: 'OWNER' } },
    columns: { create: columns.map((col, ci) => ({ name: col.name, position: INITIAL_GAP * (ci + 1), tasks: { create: (col.tasks ?? []).map((task, ti) => ({ title: task.title, description: task.description ?? undefined, priority: task.priority, dueDate: task.dueDate ?? undefined, startDate: task.startDate ?? undefined, labels: task.labels ?? undefined, position: INITIAL_GAP * (ti + 1) })) } })) },
  }, include: boardInclude });
  res.status(201).json({ data: board });
} catch (error) { next(error); } });

router.get('/:id', loadBoardContext, requireRole('VIEWER'), async (req, res, next) => { try { const board = await prisma.board.findUnique({ where: { id: routeParam(req.params.id) }, include: boardInclude }); res.json({ data: board }); } catch (error) { next(error); } });

router.get('/:id/export', loadBoardContext, requireRole('VIEWER'), async (req, res, next) => { try {
  const board = await prisma.board.findUnique({ where: { id: routeParam(req.params.id) }, include: { columns: { orderBy: { position: 'asc' }, include: { tasks: { orderBy: { position: 'asc' } } } } } });
  if (!board) return sendError(res, 404, 'NOT_FOUND', 'Board not found.');
  const payload = { version: 1, name: board.name, exportedAt: new Date().toISOString(), columns: board.columns.map((col) => ({ name: col.name, tasks: col.tasks.map((task) => ({ title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate, startDate: task.startDate, labels: task.labels })) })) };
  res.json({ data: payload });
} catch (error) { next(error); } });

router.patch('/:id', loadBoardContext, requireRole('OWNER'), validate(boardSchema), async (req, res, next) => { try { const updated = await prisma.board.update({ where: { id: routeParam(req.params.id) }, data: { name: req.body.name } }); emitBoardEvent(updated.id, { type: 'board.updated', payload: updated }); res.json({ data: updated }); } catch (error) { next(error); } });

router.delete('/:id', loadBoardContext, requireRole('OWNER'), async (req, res, next) => { try { await prisma.board.delete({ where: { id: routeParam(req.params.id) } }); res.status(204).send(); } catch (error) { next(error); } });

export default router;
