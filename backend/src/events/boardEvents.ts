import { EventEmitter } from 'node:events';

export type BoardEvent = {
  type: 'task.moved' | 'task.created' | 'task.updated' | 'task.deleted';
  payload: unknown;
};

export const boardEvents = new EventEmitter();
boardEvents.setMaxListeners(100);

export function emitBoardEvent(boardId: string, event: BoardEvent) {
  boardEvents.emit(`board:${boardId}`, event);
  boardEvents.emit('board:event', { boardId, ...event });
}
