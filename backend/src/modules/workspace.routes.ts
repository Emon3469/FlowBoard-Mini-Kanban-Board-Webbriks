import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/notes', async (req, res, next) => {
  try { res.json({ data: await prisma.note.findMany({ where: { userId: req.user!.id }, orderBy: { updatedAt: 'desc' } }) }); }
  catch (error) { next(error); }
});
router.post('/notes', async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body.content === 'string' ? req.body.content : '';
    if (!title) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Title is required' } });
    res.status(201).json({ data: await prisma.note.create({ data: { title, content, userId: req.user!.id } }) });
  } catch (error) { next(error); }
});
router.patch('/notes/:id', async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!note) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found' } });
    res.json({ data: await prisma.note.update({ where: { id: note.id }, data: { title: req.body.title?.trim(), content: req.body.content } }) });
  } catch (error) { next(error); }
});
router.delete('/notes/:id', async (req, res, next) => {
  try { await prisma.note.deleteMany({ where: { id: req.params.id, userId: req.user!.id } }); res.status(204).send(); }
  catch (error) { next(error); }
});
router.get('/favorites', async (req, res, next) => {
  try { res.json({ data: await prisma.favorite.findMany({ where: { userId: req.user!.id }, select: { boardId: true } }) }); }
  catch (error) { next(error); }
});
router.post('/favorites/:boardId', async (req, res, next) => {
  try { res.status(201).json({ data: await prisma.favorite.upsert({ where: { userId_boardId: { userId: req.user!.id, boardId: req.params.boardId } }, create: { userId: req.user!.id, boardId: req.params.boardId }, update: {} }) }); }
  catch (error) { next(error); }
});
router.delete('/favorites/:boardId', async (req, res, next) => {
  try { await prisma.favorite.deleteMany({ where: { userId: req.user!.id, boardId: req.params.boardId } }); res.status(204).send(); }
  catch (error) { next(error); }
});
export default router;
