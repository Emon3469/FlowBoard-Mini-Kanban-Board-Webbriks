import request from 'supertest';
import { prismaMock } from './testPrisma';
jest.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
import { app } from '../src/app';
import { issueAccessToken } from '../src/lib/auth';

const boardId = '44444444-4444-4444-8444-444444444444';
const columnId = '22222222-2222-4222-8222-222222222222';
const destinationColumnId = '33333333-3333-4333-8333-333333333333';
const taskId = '11111111-1111-4111-8111-111111111111';
const memberId = '99999999-9999-4999-8999-999999999999';
const editorId = 'editor-id';
const token = issueAccessToken({ id: editorId, name: 'Editor', email: 'editor@example.com' });

const editorBoard = { id: boardId, members: [{ userId: editorId, role: 'EDITOR' }] };

// Wire up the loadTaskBoardContext middleware chain (task -> column -> board).
function setupTaskContext() {
  prismaMock.task.findUnique.mockResolvedValue({ id: taskId, columnId, version: 1 });
  prismaMock.column.findUnique.mockResolvedValue({ id: columnId, boardId });
  prismaMock.board.findUnique.mockResolvedValue(editorBoard);
}

describe('task metadata validation (assignee-must-be-member)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects assigning a task to a non-member with 400', async () => {
    setupTaskContext();
    prismaMock.boardMember.findUnique.mockResolvedValue(null); // assignee is not a member
    const response = await request(app).patch(`/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).send({ assigneeId: memberId });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(prismaMock.task.update).not.toHaveBeenCalled();
  });

  it('allows assigning a task to a board member', async () => {
    setupTaskContext();
    prismaMock.boardMember.findUnique.mockResolvedValue({ id: 'm1', boardId, userId: memberId, role: 'EDITOR' });
    prismaMock.task.update.mockResolvedValue({ id: taskId, columnId, assigneeId: memberId, title: 'Task' });
    prismaMock.notification.create.mockResolvedValue({ id: 'n1' });
    const response = await request(app).patch(`/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).send({ assigneeId: memberId });
    expect(response.status).toBe(200);
    expect(response.body.data.assigneeId).toBe(memberId);
    expect(prismaMock.task.update).toHaveBeenCalled();
  });

  it('rejects an invalid priority via schema (strict Zod)', async () => {
    setupTaskContext();
    const response = await request(app).patch(`/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).send({ priority: 'SUPER' });
    expect(response.status).toBe(400);
  });
});

describe('automation execution isolation', () => {
  const sourceColumn = { id: columnId, boardId };
  const destination = { id: destinationColumnId, boardId };

  function setupMove() {
    prismaMock.task.findUnique.mockResolvedValue({ id: taskId, columnId, version: 3 });
    prismaMock.column.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => (where.id === columnId ? sourceColumn : destination));
    prismaMock.board.findUnique.mockResolvedValue(editorBoard);
    const tx = { task: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({ id: taskId, columnId: destinationColumnId, position: 1024, version: 4 }) } };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
  }

  beforeEach(() => jest.clearAllMocks());

  it('a throwing automation rule does NOT fail the move', async () => {
    setupMove();
    prismaMock.automation.findMany.mockRejectedValue(new Error('boom')); // automation lookup blows up
    const response = await request(app).post(`/tasks/${taskId}/move`).set('Authorization', `Bearer ${token}`).send({ destinationColumnId, destinationIndex: 0, expectedVersion: 3 });
    expect(response.status).toBe(200);
    expect(response.body.data.columnId).toBe(destinationColumnId); // response is the committed move, not the failed automation
  });

  it('applies a matching set_priority rule after the move commits', async () => {
    setupMove();
    prismaMock.automation.findMany.mockResolvedValue([{ id: 'a1', boardId, enabled: true, triggerColumnId: destinationColumnId, action: 'set_priority', actionValue: 'URGENT', name: 'Bump' }]);
    prismaMock.task.update.mockResolvedValue({ id: taskId, columnId: destinationColumnId, priority: 'URGENT', position: 1024, version: 4 });
    const response = await request(app).post(`/tasks/${taskId}/move`).set('Authorization', `Bearer ${token}`).send({ destinationColumnId, destinationIndex: 0, expectedVersion: 3 });
    expect(response.status).toBe(200);
    expect(response.body.data.priority).toBe('URGENT');
    expect(prismaMock.task.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: taskId }, data: expect.objectContaining({ priority: 'URGENT' }) }));
  });
});

describe('favorites hardening', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when favoriting a board you are not a member of', async () => {
    prismaMock.boardMember.findUnique.mockResolvedValue(null);
    const response = await request(app).post(`/favorites/${boardId}`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(prismaMock.favorite.upsert).not.toHaveBeenCalled();
  });

  it('favorites a board you are a member of', async () => {
    prismaMock.boardMember.findUnique.mockResolvedValue({ id: 'm1', boardId, userId: editorId, role: 'VIEWER' });
    prismaMock.favorite.upsert.mockResolvedValue({ id: 'f1', userId: editorId, boardId });
    const response = await request(app).post(`/favorites/${boardId}`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(201);
    expect(prismaMock.favorite.upsert).toHaveBeenCalled();
  });
});

describe('board import / export round-trip', () => {
  beforeEach(() => jest.clearAllMocks());

  it('imports an exported board payload, creating nested columns and tasks', async () => {
    prismaMock.board.create.mockResolvedValue({ id: 'new-board', name: 'Imported', columns: [], members: [] });
    const payload = { version: 1, name: 'Imported', columns: [ { name: 'To do', tasks: [{ title: 'A', priority: 'HIGH', labels: ['x'] }, { title: 'B' }] }, { name: 'Done', tasks: [] } ] };
    const response = await request(app).post('/boards/import').set('Authorization', `Bearer ${token}`).send(payload);
    expect(response.status).toBe(201);
    const createArg = prismaMock.board.create.mock.calls[0][0];
    expect(createArg.data.name).toBe('Imported');
    expect(createArg.data.columns.create).toHaveLength(2);
    expect(createArg.data.columns.create[0].tasks.create).toHaveLength(2);
    expect(createArg.data.members.create.role).toBe('OWNER');
  });

  it('rejects an import payload with no name', async () => {
    const response = await request(app).post('/boards/import').set('Authorization', `Bearer ${token}`).send({ columns: [] });
    expect(response.status).toBe(400);
    expect(prismaMock.board.create).not.toHaveBeenCalled();
  });

  it('exports a board as structured JSON for a viewer', async () => {
    prismaMock.board.findUnique
      .mockResolvedValueOnce({ id: boardId, members: [{ userId: editorId, role: 'VIEWER' }] }) // loadBoardContext
      .mockResolvedValueOnce({ id: boardId, name: 'Exported', columns: [{ name: 'To do', tasks: [{ title: 'A', description: null, priority: 'MEDIUM', dueDate: null, startDate: null, labels: [] }] }] });
    const response = await request(app).get(`/boards/${boardId}/export`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.version).toBe(1);
    expect(response.body.data.columns[0].tasks[0].title).toBe('A');
  });
});

describe('notifications API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the unread count for the bell badge', async () => {
    prismaMock.notification.count.mockResolvedValue(3);
    const response = await request(app).get('/notifications/unread-count').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(3);
    expect(prismaMock.notification.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: editorId, read: false }) }));
  });

  it('marks all notifications read when no ids are supplied', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });
    const response = await request(app).post('/notifications/read').set('Authorization', `Bearer ${token}`).send({});
    expect(response.status).toBe(200);
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { read: true } }));
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/notifications');
    expect(response.status).toBe(401);
  });
});
