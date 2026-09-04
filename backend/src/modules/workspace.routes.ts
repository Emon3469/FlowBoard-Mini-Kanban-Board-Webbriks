import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendError, routeParam } from '../lib/http';

const router = Router();
router.use(authenticate);

const noteSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().max(20000).default(''),
}).strict();
const noteUpdateSchema = noteSchema.partial();

// ---- Notes ----
router.get('/notes', async (req, res, next) => {
  try { res.json({ data: await prisma.note.findMany({ where: { userId: req.user!.id }, orderBy: { updatedAt: 'desc' } }) }); }
  catch (error) { next(error); }
});
router.post('/notes', validate(noteSchema), async (req, res, next) => {
  try { res.status(201).json({ data: await prisma.note.create({ data: { title: req.body.title, content: req.body.content ?? '', userId: req.user!.id } }) }); }
  catch (error) { next(error); }
});
router.patch('/notes/:id', validate(noteUpdateSchema), async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({ where: { id: routeParam(req.params.id), userId: req.user!.id } });
    if (!note) return sendError(res, 404, 'NOT_FOUND', 'Note not found.');
    res.json({ data: await prisma.note.update({ where: { id: note.id }, data: { title: req.body.title, content: req.body.content } }) });
  } catch (error) { next(error); }
});
router.delete('/notes/:id', async (req, res, next) => {
  try { await prisma.note.deleteMany({ where: { id: routeParam(req.params.id), userId: req.user!.id } }); res.status(204).send(); }
  catch (error) { next(error); }
});

// ---- Favorites ----
router.get('/favorites', async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id, board: { members: { some: { userId: req.user!.id } } } },
      include: { board: { include: { members: { where: { userId: req.user!.id } }, _count: { select: { columns: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: favorites.map((favorite) => ({ boardId: favorite.boardId, board: favorite.board })) });
  } catch (error) { next(error); }
});
router.post('/favorites/:boardId', async (req, res, next) => {
  try {
    const boardId = routeParam(req.params.boardId);
    const membership = await prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId: req.user!.id } } });
    if (!membership) return sendError(res, 404, 'NOT_FOUND', 'Board not found.');
    const favorite = await prisma.favorite.upsert({ where: { userId_boardId: { userId: req.user!.id, boardId } }, create: { userId: req.user!.id, boardId }, update: {} });
    res.status(201).json({ data: favorite });
  } catch (error) { next(error); }
});
router.delete('/favorites/:boardId', async (req, res, next) => {
  try { await prisma.favorite.deleteMany({ where: { userId: req.user!.id, boardId: routeParam(req.params.boardId) } }); res.status(204).send(); }
  catch (error) { next(error); }
});

export default router;
