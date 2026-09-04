import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { routeParam } from '../../lib/http';

const router = Router();
router.use(authenticate);

router.get('/notifications', async (req, res, next) => { try {
  const unreadOnly = req.query.unread === 'true';
  const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id, ...(unreadOnly ? { read: false } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ data: notifications });
} catch (error) { next(error); } });

router.get('/notifications/unread-count', async (req, res, next) => { try {
  const count = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });
  res.json({ data: { count } });
} catch (error) { next(error); } });

const readSchema = z.object({ ids: z.array(z.string().uuid()).optional() }).strict();
router.post('/notifications/read', validate(readSchema), async (req, res, next) => { try {
  const ids = req.body.ids as string[] | undefined;
  await prisma.notification.updateMany({ where: { userId: req.user!.id, ...(ids && ids.length ? { id: { in: ids } } : {}) }, data: { read: true } });
  res.json({ data: { ok: true } });
} catch (error) { next(error); } });

router.delete('/notifications/:id', async (req, res, next) => { try {
  await prisma.notification.deleteMany({ where: { id: routeParam(req.params.id), userId: req.user!.id } });
  res.status(204).send();
} catch (error) { next(error); } });

export default router;
