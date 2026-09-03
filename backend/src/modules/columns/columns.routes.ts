import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadBoardContext, loadColumnBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { INITIAL_GAP } from '../tasks/ordering';
import { routeParam } from '../../lib/http';
import { columnSchema } from './columns.schemas';

const router = Router();
router.post('/boards/:boardId/columns', authenticate, loadBoardContext, requireRole('EDITOR'), validate(columnSchema), async (req, res, next) => { try { const boardId = routeParam(req.params.boardId); const last = await prisma.column.findFirst({ where: { boardId }, orderBy: { position: 'desc' } }); res.status(201).json({ data: await prisma.column.create({ data: { boardId, name: req.body.name, position: (last?.position ?? 0) + INITIAL_GAP } }) }); } catch (error) { next(error); } });
router.patch('/columns/:id', authenticate, loadColumnBoardContext(), requireRole('EDITOR'), validate(columnSchema), async (req, res, next) => { try { res.json({ data: await prisma.column.update({ where: { id: routeParam(req.params.id) }, data: { name: req.body.name } }) }); } catch (error) { next(error); } });
router.delete('/columns/:id', authenticate, loadColumnBoardContext(), requireRole('EDITOR'), async (req, res, next) => { try { await prisma.column.delete({ where: { id: routeParam(req.params.id) } }); res.status(204).send(); } catch (error) { next(error); } });
export default router;
