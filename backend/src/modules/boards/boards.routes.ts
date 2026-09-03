import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { routeParam } from '../../lib/http';
import { boardSchema } from './boards.schemas';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => { try { const boards = await prisma.board.findMany({ where: { members: { some: { userId: req.user!.id } } }, include: { members: { where: { userId: req.user!.id } }, _count: { select: { columns: true } } }, orderBy: { updatedAt: 'desc' } }); res.json({ data: boards }); } catch (error) { next(error); } });
router.post('/', validate(boardSchema), async (req, res, next) => { try { const board = await prisma.board.create({ data: { name: req.body.name, ownerId: req.user!.id, members: { create: { userId: req.user!.id, role: 'OWNER' } } } }); res.status(201).json({ data: board }); } catch (error) { next(error); } });
router.get('/:id', loadBoardContext, requireRole('VIEWER'), async (req, res, next) => { try { const board = await prisma.board.findUnique({ where: { id: routeParam(req.params.id) }, include: { columns: { orderBy: { position: 'asc' }, include: { tasks: { orderBy: { position: 'asc' } } } }, members: { include: { user: { select: { id: true, name: true, email: true } } } } } }); res.json({ data: board }); } catch (error) { next(error); } });
router.patch('/:id', loadBoardContext, requireRole('OWNER'), validate(boardSchema), async (req, res, next) => { try { res.json({ data: await prisma.board.update({ where: { id: routeParam(req.params.id) }, data: { name: req.body.name } }) }); } catch (error) { next(error); } });
router.delete('/:id', loadBoardContext, requireRole('OWNER'), async (req, res, next) => { try { await prisma.board.delete({ where: { id: routeParam(req.params.id) } }); res.status(204).send(); } catch (error) { next(error); } });
export default router;
