import { prisma } from '../../lib/prisma';
import { createNotification } from '../../lib/notify';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface MovedTaskSnapshot {
  id: string;
  columnId: string;
  assigneeId: string | null;
  labels: string[];
  priority: string;
}

/**
 * Best-effort execution of a board's automation rules after a task has been
 * moved (and the move transaction has already committed). Rules whose
 * `triggerColumnId` matches the task's new column are applied.
 *
 * This function NEVER throws — any failure is swallowed and logged so it can
 * never affect the move response. Returns the updated task if any rule mutated
 * it, otherwise null.
 */
export async function runAutomationsForMove(params: {
  boardId: string;
  task: MovedTaskSnapshot;
  actorId: string;
}) {
  try {
    const { boardId, task, actorId } = params;
    const automations = await prisma.automation.findMany({
      where: { boardId, enabled: true, triggerColumnId: task.columnId },
    });
    if (automations.length === 0) return null;

    const data: Record<string, unknown> = {};
    const labels = new Set(task.labels ?? []);
    let assignedUserId: string | null = null;

    for (const rule of automations) {
      if (rule.action === 'set_priority' && rule.actionValue && PRIORITIES.includes(rule.actionValue)) {
        data.priority = rule.actionValue;
      } else if (rule.action === 'add_label' && rule.actionValue) {
        labels.add(rule.actionValue);
      } else if (rule.action === 'assign' && rule.actionValue) {
        const member = await prisma.boardMember.findUnique({
          where: { boardId_userId: { boardId, userId: rule.actionValue } },
        });
        if (member) {
          data.assigneeId = rule.actionValue;
          assignedUserId = rule.actionValue;
        }
      }
    }
    if (labels.size !== (task.labels?.length ?? 0)) data.labels = Array.from(labels);

    let updated = null;
    if (Object.keys(data).length > 0) {
      updated = await prisma.task.update({ where: { id: task.id }, data });
    }

    // Fire notifications for `notify` rules and for any auto-assignment.
    const notifyRules = automations.filter((rule) => rule.action === 'notify');
    if (notifyRules.length > 0) {
      const board = await prisma.board.findUnique({ where: { id: boardId }, select: { ownerId: true } });
      const recipientId = (updated?.assigneeId ?? task.assigneeId) || board?.ownerId || null;
      if (recipientId) {
        for (const rule of notifyRules) {
          await createNotification({
            userId: recipientId,
            type: 'automation',
            title: rule.name || 'Automation triggered',
            body: rule.actionValue || undefined,
            boardId,
            taskId: task.id,
            actorId,
          });
        }
      }
    }
    if (assignedUserId) {
      await createNotification({
        userId: assignedUserId,
        type: 'task_assigned',
        title: 'A task was assigned to you by an automation',
        boardId,
        taskId: task.id,
        actorId,
      });
    }

    return updated;
  } catch (error) {
    console.error('runAutomationsForMove failed (ignored):', error);
    return null;
  }
}
