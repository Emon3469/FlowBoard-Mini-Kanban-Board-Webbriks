import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { routeParam, sendError } from '../../lib/http';

const router = Router();

const actionEnum = z.enum(['set_priority', 'add_label', 'assign', 'notify']);
const automationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().optional(),
  triggerColumnId: z.union([z.string().uuid(), z.null()]).optional(),
  action: actionEnum,
  actionValue: z.union([z.string().max(200), z.null()]).optional(),
}).strict();

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

async function memberRole(boardId: string, userId: string) {
  const member = await prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  return member?.role ?? null;
}

async function validateRule(boardId: string, rule: { action: string; actionValue?: string | null; triggerColumnId?: string | null }) {
  if (rule.triggerColumnId) {
    const column = await prisma.column.findFirst({ where: { id: rule.triggerColumnId, boardId } });
    if (!column) return 'triggerColumnId must be a column of this board.';
  }
  if (rule.action === 'set_priority' && !PRIORITIES.includes(rule.actionValue ?? '')) return 'set_priority requires actionValue to be LOW, MEDIUM, HIGH, or URGENT.';
  if (rule.action === 'add_label' && !(rule.actionValue ?? '').trim()) return 'add_label requires a label in actionValue.';
  if (rule.action === 'assign') {
    if (!rule.actionValue) return 'assign requires actionValue to be a board member userId.';
    const member = await prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId: rule.actionValue } } });
    if (!member) return 'assign requires actionValue to be a member of this board.';
  }
  return null;
}

router.get('/boards/:id/automations', authenticate, loadBoardContext, requireRole('VIEWER'), async (req, res, next) => { try {
  res.json({ data: await prisma.automation.findMany({ where: { boardId: routeParam(req.params.id) }, orderBy: { createdAt: 'asc' } }) });
} catch (error) { next(error); } });

router.post('/boards/:id/automations', authenticate, loadBoardContext, requireRole('EDITOR'), validate(automationSchema), async (req, res, next) => { try {
  const boardId = routeParam(req.params.id);
  const error = await validateRule(boardId, req.body);
  if (error) return sendError(res, 400, 'BAD_REQUEST', error);
  const created = await prisma.automation.create({ data: { boardId, name: req.body.name, enabled: req.body.enabled ?? true, triggerColumnId: req.body.triggerColumnId ?? null, action: req.body.action, actionValue: req.body.actionValue ?? null } });
  res.status(201).json({ data: created });
} catch (error) { next(error); } });

router.patch('/automations/:id', authenticate, validate(automationSchema.partial()), async (req, res, next) => { try {
  const automation = await prisma.automation.findUnique({ where: { id: routeParam(req.params.id) } });
  if (!automation) return sendError(res, 404, 'NOT_FOUND', 'Automation not found.');
  const role = await memberRole(automation.boardId, req.user!.id);
  if (!role || role === 'VIEWER') return sendError(res, 403, 'FORBIDDEN', 'You do not have permission for this action.');
  const merged = { action: req.body.action ?? automation.action, actionValue: req.body.actionValue !== undefined ? req.body.actionValue : automation.actionValue, triggerColumnId: req.body.triggerColumnId !== undefined ? req.body.triggerColumnId : automation.triggerColumnId };
  const error = await validateRule(automation.boardId, merged);
  if (error) return sendError(res, 400, 'BAD_REQUEST', error);
  const updated = await prisma.automation.update({ where: { id: automation.id }, data: req.body });
  res.json({ data: updated });
} catch (error) { next(error); } });

router.delete('/automations/:id', authenticate, async (req, res, next) => { try {
  const automation = await prisma.automation.findUnique({ where: { id: routeParam(req.params.id) } });
  if (!automation) return res.status(204).send();
  const role = await memberRole(automation.boardId, req.user!.id);
  if (!role || role === 'VIEWER') return sendError(res, 403, 'FORBIDDEN', 'You do not have permission for this action.');
  await prisma.automation.delete({ where: { id: automation.id } });
  res.status(204).send();
} catch (error) { next(error); } });

export default router;
