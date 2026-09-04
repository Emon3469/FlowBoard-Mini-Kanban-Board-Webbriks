import { prisma } from './prisma';
import { emitUserEvent } from '../events/boardEvents';

export type NotificationType =
  | 'board_shared'
  | 'task_assigned'
  | 'member_added'
  | 'role_changed'
  | 'automation';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  boardId?: string | null;
  taskId?: string | null;
  actorId?: string | null;
}

/**
 * Persist a notification and push it to the recipient's live socket room.
 * Never throws — notification delivery must not break the action that triggered it.
 * Skips self-notifications (a user acting on their own resource).
 */
export async function createNotification(input: CreateNotificationInput) {
  if (input.actorId && input.actorId === input.userId) return null;
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        boardId: input.boardId ?? null,
        taskId: input.taskId ?? null,
        actorId: input.actorId ?? null,
      },
    });
    emitUserEvent(input.userId, { type: 'notification.created', payload: notification });
    return notification;
  } catch (error) {
    console.error('createNotification failed:', error);
    return null;
  }
}
