import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadBoardContext, loadColumnBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { INITIAL_GAP, rebalancedPositions } from '../tasks/ordering';
import { routeParam, sendError } from '../../lib/http';
import { emitBoardEvent } from '../../events/boardEvents';
import { columnSchema } from './columns.schemas';

const router = Router();
const reorderSchema = z.object({ orderedColumnIds: z.array(z.string().uuid()).min(1).max(50) }).strict();

router.post('/boards/:boardId/columns', authenticate, loadBoardContext, requireRole('EDITOR'), validate(columnSchema), async (req, res, next) => { try { const boardId = routeParam(req.params.boardId); const last = await prisma.column.findFirst({ where: { boardId }, orderBy: { position: 'desc' } }); const created = await prisma.column.create({ data: { boardId, name: req.body.name, position: (last?.position ?? 0) + INITIAL_GAP } }); emitBoardEvent(boardId, { type: 'column.created', payload: created }); res.status(201).json({ data: created }); } catch (error) { next(error); } });

router.post('/boards/:boardId/columns/reorder', authenticate, loadBoardContext, requireRole('EDITOR'), validate(reorderSchema), async (req, res, next) => { try {
  const boardId = routeParam(req.params.boardId);
  const columns = await prisma.column.findMany({ where: { boardId } });
  const ids = new Set(columns.map((column) => column.id));
  const ordered = req.body.orderedColumnIds as string[];
  if (ordered.length !== columns.length || !ordered.every((id) => ids.has(id))) return sendError(res, 400, 'BAD_REQUEST', 'orderedColumnIds must list every column of this board exactly once.');
  const positions = rebalancedPositions(ordered.length);
  await prisma.$transaction(ordered.map((id, index) => prisma.column.update({ where: { id }, data: { position: positions[index] } })));
  const updated = await prisma.column.findMany({ where: { boardId }, orderBy: { position: 'asc' } });
  emitBoardEvent(boardId, { type: 'column.reordered', payload: updated });
  res.json({ data: updated });
} catch (error) { next(error); } });

router.patch('/columns/:id', authenticate, loadColumnBoardContext(), requireRole('EDITOR'), validate(columnSchema), async (req, res, next) => { try { const updated = await prisma.column.update({ where: { id: routeParam(req.params.id) }, data: { name: req.body.name } }); emitBoardEvent(req.boardId!, { type: 'column.updated', payload: updated }); res.json({ data: updated }); } catch (error) { next(error); } });

router.delete('/columns/:id', authenticate, loadColumnBoardContext(), requireRole('EDITOR'), async (req, res, next) => { try { const id = routeParam(req.params.id); await prisma.column.delete({ where: { id } }); emitBoardEvent(req.boardId!, { type: 'column.deleted', payload: { id } }); res.status(204).send(); } catch (error) { next(error); } });

export default router;
