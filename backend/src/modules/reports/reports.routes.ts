import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Aggregate metrics across every board the user can access. The final column of
// each board is treated as its "done" state (standard Kanban convention).
router.get('/reports/summary', authenticate, async (req, res, next) => { try {
  const userId = req.user!.id;
  const boards = await prisma.board.findMany({
    where: { members: { some: { userId } } },
    include: { columns: { orderBy: { position: 'asc' }, include: { tasks: true } } },
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const byPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  const statusMap = new Map<string, number>();
  const byBoard: { boardId: string; name: string; total: number; done: number }[] = [];
  let totalTasks = 0, completed = 0, overdue = 0, upcoming = 0, assignedToMe = 0;

  for (const board of boards) {
    let boardTotal = 0, boardDone = 0;
    const lastIndex = board.columns.length - 1;
    board.columns.forEach((column, index) => {
      statusMap.set(column.name, (statusMap.get(column.name) ?? 0) + column.tasks.length);
      const isDoneColumn = index === lastIndex && board.columns.length > 1;
      for (const task of column.tasks) {
        totalTasks++; boardTotal++;
        byPriority[task.priority] = (byPriority[task.priority] ?? 0) + 1;
        if (task.assigneeId === userId) assignedToMe++;
        if (isDoneColumn) { boardDone++; completed++; }
        else if (task.dueDate) {
          if (task.dueDate < now) overdue++;
          else if (task.dueDate <= soon) upcoming++;
        }
      }
    });
    byBoard.push({ boardId: board.id, name: board.name, total: boardTotal, done: boardDone });
  }

  const byStatus = Array.from(statusMap, ([columnName, count]) => ({ columnName, count }));
  res.json({ data: { totals: { boards: boards.length, tasks: totalTasks, completed, overdue, upcoming, assignedToMe }, byPriority, byBoard, byStatus } });
} catch (error) { next(error); } });

export default router;
