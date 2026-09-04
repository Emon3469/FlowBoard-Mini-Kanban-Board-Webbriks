import { NextFunction, Request, Response } from 'express';
import { routeParam, sendError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { emitBoardEvent } from '../../events/boardEvents';
import { createNotification } from '../../lib/notify';
import { listMembers, removeMember, upsertMember } from './members.service';

export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try { res.json({ data: await listMembers(routeParam(req.params.id)) }); }
  catch (error) { next(error); }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const boardId = routeParam(req.params.id);
    const result = await upsertMember(boardId, req.body.email, req.body.role);
    if ('error' in result) {
      if (result.error === 'USER_NOT_FOUND') return sendError(res, 404, 'NOT_FOUND', 'User must register before being added.');
      return sendError(res, 400, 'BAD_REQUEST', 'A board must keep at least one owner.');
    }
    emitBoardEvent(boardId, { type: 'member.changed', payload: { action: result.created ? 'added' : 'updated', member: result.member } });
    if (result.member.userId !== req.user!.id && (result.created || result.roleChanged)) {
      const board = await prisma.board.findUnique({ where: { id: boardId }, select: { name: true } });
      const boardName = board?.name ?? 'a board';
      await createNotification({
        userId: result.member.userId,
        type: result.created ? 'member_added' : 'role_changed',
        title: result.created ? `You were added to "${boardName}"` : `Your role on "${boardName}" is now ${req.body.role}`,
        boardId,
        actorId: req.user!.id,
      });
    }
    res.status(201).json({ data: result.member });
  } catch (error) { next(error); }
}

export async function deleteMember(req: Request, res: Response, next: NextFunction) {
  try {
    const boardId = routeParam(req.params.id);
    const result = await removeMember(boardId, routeParam(req.params.userId));
    if ('error' in result) return sendError(res, 400, 'BAD_REQUEST', 'A board must keep at least one owner.');
    if (result.removed) emitBoardEvent(boardId, { type: 'member.changed', payload: { action: 'removed', userId: result.userId } });
    res.status(204).send();
  } catch (error) { next(error); }
}
