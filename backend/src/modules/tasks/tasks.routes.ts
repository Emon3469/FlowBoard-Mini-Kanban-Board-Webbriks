import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadColumnBoardContext, loadTaskBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { routeParam, sendError } from '../../lib/http';
import { emitBoardEvent } from '../../events/boardEvents';
import { moveSchema, taskSchema } from './tasks.schemas';
import { computePosition, INITIAL_GAP, rebalancedPositions } from './ordering';

const router = Router();
router.post('/columns/:columnId/tasks', authenticate, loadColumnBoardContext('columnId'), requireRole('EDITOR'), validate(taskSchema), async (req, res, next) => { try { const columnId = routeParam(req.params.columnId); const last = await prisma.task.findFirst({ where: { columnId }, orderBy: { position: 'desc' } }); res.status(201).json({ data: await prisma.task.create({ data: { columnId, title: req.body.title, description: req.body.description, position: (last?.position ?? 0) + INITIAL_GAP } }) }); } catch (error) { next(error); } });
router.patch('/tasks/:id', authenticate, loadTaskBoardContext(), requireRole('EDITOR'), validate(taskSchema.partial()), async (req, res, next) => { try { res.json({ data: await prisma.task.update({ where: { id: routeParam(req.params.id) }, data: req.body }) }); } catch (error) { next(error); } });
router.delete('/tasks/:id', authenticate, loadTaskBoardContext(), requireRole('EDITOR'), async (req, res, next) => { try { await prisma.task.delete({ where: { id: routeParam(req.params.id) } }); res.status(204).send(); } catch (error) { next(error); } });
router.post('/tasks/:id/move', authenticate, validate(moveSchema), loadTaskBoardContext(), requireRole('EDITOR'), async (req, res, next) => { try {
  const taskId = routeParam(req.params.id); const { destinationColumnId, destinationIndex, expectedVersion } = req.body;
  const source = await prisma.task.findUnique({ where: { id: taskId } }); const destination = await prisma.column.findUnique({ where: { id: destinationColumnId } }); const sourceColumn = source ? await prisma.column.findUnique({ where: { id: source.columnId } }) : null;
  if (!source || !destination || !sourceColumn) return sendError(res, 404, 'NOT_FOUND', 'Task or destination column not found.');
  if (sourceColumn.boardId !== destination.boardId) return sendError(res, 403, 'FORBIDDEN', 'Tasks can only move within the same board.');
  const moved = await prisma.$transaction(async (tx) => {
    const locked = await tx.task.updateMany({ where: { id: taskId, version: expectedVersion }, data: { version: { increment: 1 } } });
    if (locked.count !== 1) throw Object.assign(new Error('conflict'), { status: 409 });
    const tasks = await tx.task.findMany({ where: { columnId: destinationColumnId, id: { not: taskId } }, orderBy: { position: 'asc' } });
    const index = Math.min(destinationIndex, tasks.length); const prev = tasks[index - 1]?.position ?? null; const next = tasks[index]?.position ?? null; let position = computePosition(prev, next);
    if (position === null) { const positions = rebalancedPositions(tasks.length); for (let i = 0; i < tasks.length; i++) await tx.task.update({ where: { id: tasks[i].id }, data: { position: positions[i] } }); position = computePosition(positions[index - 1] ?? null, positions[index] ?? null)!; }
    return tx.task.update({ where: { id: taskId }, data: { columnId: destinationColumnId, position } });
  });
  emitBoardEvent(req.boardId!, { type: 'task.moved', payload: moved });
  res.json({ data: moved });
} catch (error) { if ((error as { status?: number }).status === 409) return sendError(res, 409, 'CONFLICT', 'Task changed since it was loaded. Refresh and try again.'); next(error); } });
export default router;
