import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadColumnBoardContext, loadTaskBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { routeParam, sendError } from '../../lib/http';
import { emitBoardEvent } from '../../events/boardEvents';
import { createNotification } from '../../lib/notify';
import { runAutomationsForMove } from '../automations/automations.service';
import { moveSchema, taskSchema } from './tasks.schemas';
import { computePosition, INITIAL_GAP, rebalancedPositions } from './ordering';

const router = Router();

async function isBoardMember(boardId: string, userId: string) {
  const member = await prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  return Boolean(member);
}

router.post('/columns/:columnId/tasks', authenticate, loadColumnBoardContext('columnId'), requireRole('EDITOR'), validate(taskSchema), async (req, res, next) => { try {
  const columnId = routeParam(req.params.columnId);
  if (req.body.assigneeId && !(await isBoardMember(req.boardId!, req.body.assigneeId))) return sendError(res, 400, 'BAD_REQUEST', 'Assignee must be a member of this board.');
  const last = await prisma.task.findFirst({ where: { columnId }, orderBy: { position: 'desc' } });
  const created = await prisma.task.create({ data: { columnId, title: req.body.title, description: req.body.description, priority: req.body.priority, dueDate: req.body.dueDate ?? undefined, startDate: req.body.startDate ?? undefined, labels: req.body.labels ?? undefined, assigneeId: req.body.assigneeId ?? undefined, position: (last?.position ?? 0) + INITIAL_GAP } });
  emitBoardEvent(req.boardId!, { type: 'task.created', payload: created });
  if (created.assigneeId) await createNotification({ userId: created.assigneeId, type: 'task_assigned', title: 'A task was assigned to you', body: created.title, boardId: req.boardId!, taskId: created.id, actorId: req.user!.id });
  res.status(201).json({ data: created });
} catch (error) { next(error); } });

router.patch('/tasks/:id', authenticate, loadTaskBoardContext(), requireRole('EDITOR'), validate(taskSchema.partial()), async (req, res, next) => { try {
  const id = routeParam(req.params.id);
  if (req.body.assigneeId && !(await isBoardMember(req.boardId!, req.body.assigneeId))) return sendError(res, 400, 'BAD_REQUEST', 'Assignee must be a member of this board.');
  const updated = await prisma.task.update({ where: { id }, data: req.body });
  emitBoardEvent(req.boardId!, { type: 'task.updated', payload: updated });
  if (req.body.assigneeId) await createNotification({ userId: req.body.assigneeId, type: 'task_assigned', title: 'A task was assigned to you', body: updated.title, boardId: req.boardId!, taskId: updated.id, actorId: req.user!.id });
  res.json({ data: updated });
} catch (error) { next(error); } });

router.delete('/tasks/:id', authenticate, loadTaskBoardContext(), requireRole('EDITOR'), async (req, res, next) => { try {
  const id = routeParam(req.params.id);
  await prisma.task.delete({ where: { id } });
  emitBoardEvent(req.boardId!, { type: 'task.deleted', payload: { id } });
  res.status(204).send();
} catch (error) { next(error); } });

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
  // Best-effort automation execution — post-commit, fully isolated, never affects the move response.
  const afterAutomation = await runAutomationsForMove({ boardId: req.boardId!, task: { id: moved.id, columnId: moved.columnId, assigneeId: (moved as { assigneeId?: string | null }).assigneeId ?? null, labels: (moved as { labels?: string[] }).labels ?? [], priority: (moved as { priority?: string }).priority ?? 'MEDIUM' }, actorId: req.user!.id }).catch(() => null);
  if (afterAutomation) emitBoardEvent(req.boardId!, { type: 'task.updated', payload: afterAutomation });
  res.json({ data: afterAutomation ?? moved });
} catch (error) { if ((error as { status?: number }).status === 409) return sendError(res, 409, 'CONFLICT', 'Task changed since it was loaded. Refresh and try again.'); next(error); } });

export default router;
