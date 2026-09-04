import { EventEmitter } from 'node:events';

export type BoardEvent = {
  type:
    | 'task.moved'
    | 'task.created'
    | 'task.updated'
    | 'task.deleted'
    | 'column.created'
    | 'column.updated'
    | 'column.deleted'
    | 'column.reordered'
    | 'member.changed'
    | 'board.updated';
  payload: unknown;
};

export type UserEvent = {
  type: 'notification.created';
  payload: unknown;
};

export const boardEvents = new EventEmitter();
boardEvents.setMaxListeners(1000);

export function emitBoardEvent(boardId: string, event: BoardEvent) {
  boardEvents.emit(`board:${boardId}`, event);
  boardEvents.emit('board:event', { boardId, ...event });
}

export function emitUserEvent(userId: string, event: UserEvent) {
  boardEvents.emit('user:event', { userId, ...event });
}
