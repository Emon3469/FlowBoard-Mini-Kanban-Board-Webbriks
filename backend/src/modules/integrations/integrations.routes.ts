import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { sendError, routeParam } from '../../lib/http';

const router = Router();
router.use(authenticate);

// A curated catalogue. "Connecting" records the user's intent (a scoped, safe
// simulation) rather than performing a real OAuth handshake.
const CATALOG = [
  { provider: 'github', name: 'GitHub', description: 'Link commits and pull requests to your tasks.', category: 'Development' },
  { provider: 'gitlab', name: 'GitLab', description: 'Sync merge requests and pipeline status.', category: 'Development' },
  { provider: 'slack', name: 'Slack', description: 'Post board activity to a channel.', category: 'Communication' },
  { provider: 'google-drive', name: 'Google Drive', description: 'Attach documents and files to tasks.', category: 'Files' },
  { provider: 'figma', name: 'Figma', description: 'Embed design frames on your cards.', category: 'Design' },
  { provider: 'notion', name: 'Notion', description: 'Mirror tasks into a Notion database.', category: 'Docs' },
];
const PROVIDERS = new Set(CATALOG.map((item) => item.provider));

router.get('/integrations', async (req, res, next) => { try {
  const connections = await prisma.integration.findMany({ where: { userId: req.user!.id } });
  const byProvider = new Map(connections.map((connection) => [connection.provider, connection]));
  res.json({ data: CATALOG.map((item) => { const c = byProvider.get(item.provider); return { ...item, connected: c?.connected ?? false, connectedAt: c?.connectedAt ?? null }; }) });
} catch (error) { next(error); } });

router.post('/integrations/:provider/connect', async (req, res, next) => { try {
  const provider = routeParam(req.params.provider);
  if (!PROVIDERS.has(provider)) return sendError(res, 404, 'NOT_FOUND', 'Unknown integration provider.');
  const now = new Date();
  const integration = await prisma.integration.upsert({ where: { userId_provider: { userId: req.user!.id, provider } }, update: { connected: true, connectedAt: now }, create: { userId: req.user!.id, provider, connected: true, connectedAt: now } });
  res.json({ data: integration });
} catch (error) { next(error); } });

router.post('/integrations/:provider/disconnect', async (req, res, next) => { try {
  const provider = routeParam(req.params.provider);
  if (!PROVIDERS.has(provider)) return sendError(res, 404, 'NOT_FOUND', 'Unknown integration provider.');
  const integration = await prisma.integration.upsert({ where: { userId_provider: { userId: req.user!.id, provider } }, update: { connected: false, connectedAt: null }, create: { userId: req.user!.id, provider, connected: false } });
  res.json({ data: integration });
} catch (error) { next(error); } });

export default router;
