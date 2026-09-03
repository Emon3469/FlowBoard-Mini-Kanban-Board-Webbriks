import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendError, routeParam } from '../lib/http';

export async function loadBoardContext(req: Request, res: Response, next: NextFunction) {
  try {
    const boardId = routeParam(req.params.id ?? req.params.boardId);
    if (!boardId || boardId === 'undefined') return sendError(res, 404, 'NOT_FOUND', 'Board context not found.');
    const board = await prisma.board.findUnique({ where: { id: boardId }, include: { members: true } });
    if (!board) return sendError(res, 404, 'NOT_FOUND', 'Board not found.');
    const membership = board.members.find((member) => member.userId === req.user!.id);
    if (!membership) return sendError(res, 403, 'FORBIDDEN', 'You do not have access to this board.');
    req.boardId = board.id;
    req.boardRole = membership.role;
    next();
  } catch (error) { next(error); }
}

export function loadColumnBoardContext(paramName = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const column = await prisma.column.findUnique({ where: { id: routeParam(req.params[paramName]) } });
      if (!column) return sendError(res, 404, 'NOT_FOUND', 'Column not found.');
      const board = await prisma.board.findUnique({ where: { id: column.boardId }, include: { members: true } });
      if (!board) return sendError(res, 404, 'NOT_FOUND', 'Board not found.');
      const membership = board.members.find((member) => member.userId === req.user!.id);
      if (!membership) return sendError(res, 403, 'FORBIDDEN', 'You do not have access to this board.');
      req.boardId = board.id;
      req.boardRole = membership.role;
      next();
    } catch (error) { next(error); }
  };
}

export function loadTaskBoardContext(paramName = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await prisma.task.findUnique({ where: { id: routeParam(req.params[paramName]) } });
      if (!task) return sendError(res, 404, 'NOT_FOUND', 'Task not found.');
      const column = await prisma.column.findUnique({ where: { id: task.columnId } });
      if (!column) return sendError(res, 404, 'NOT_FOUND', 'Column not found.');
      const board = await prisma.board.findUnique({ where: { id: column.boardId }, include: { members: true } });
      if (!board) return sendError(res, 404, 'NOT_FOUND', 'Board not found.');
      const membership = board.members.find((member) => member.userId === req.user!.id);
      if (!membership) return sendError(res, 403, 'FORBIDDEN', 'You do not have access to this board.');
      req.boardId = board.id;
      req.boardRole = membership.role;
      next();
    } catch (error) { next(error); }
  };
}