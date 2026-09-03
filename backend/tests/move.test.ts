import request from 'supertest';
import { prismaMock } from './testPrisma';
jest.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
import { app } from '../src/app';
import { issueAccessToken } from '../src/lib/auth';

const taskId = '11111111-1111-4111-8111-111111111111';
const sourceColumnId = '22222222-2222-4222-8222-222222222222';
const destinationColumnId = '33333333-3333-4333-8333-333333333333';
const boardId = '44444444-4444-4444-8444-444444444444';
const token = issueAccessToken({ id: 'editor-id', name: 'Editor', email: 'editor@example.com' });
const editorBoard = { id: boardId, members: [{ userId: 'editor-id', role: 'EDITOR' }] };
const sourceTask = { id: taskId, columnId: sourceColumnId, title: 'Move me', position: 1024, version: 3 };
const sourceColumn = { id: sourceColumnId, boardId };
const destinationColumn = { id: destinationColumnId, boardId };

function setupMoveMocks(destination = destinationColumn) {
  prismaMock.task.findUnique.mockResolvedValue(sourceTask);
  prismaMock.column.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === sourceColumnId ? sourceColumn : destination);
  prismaMock.board.findUnique.mockResolvedValue(editorBoard);
}

describe('task movement API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('moves a task inside one board in a transaction', async () => {
    setupMoveMocks();
    const tx = { task: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findMany: jest.fn().mockResolvedValue([{ id: 'other', position: 1024 }, { id: 'later', position: 2048 }]), update: jest.fn().mockResolvedValue({ ...sourceTask, columnId: destinationColumnId, position: 1536, version: 4 }) } };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    const response = await request(app).post(`/tasks/${taskId}/move`).set('Authorization', `Bearer ${token}`).send({ destinationColumnId, destinationIndex: 1, expectedVersion: 3 });
    expect(response.status).toBe(200); expect(response.body.data.columnId).toBe(destinationColumnId); expect(tx.task.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ version: 3 }) }));
  });
  it('returns 409 for a stale task version', async () => {
    setupMoveMocks();
    const tx = { task: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    const response = await request(app).post(`/tasks/${taskId}/move`).set('Authorization', `Bearer ${token}`).send({ destinationColumnId, destinationIndex: 0, expectedVersion: 2 });
    expect(response.status).toBe(409); expect(response.body.error.code).toBe('CONFLICT');
  });
  it('rejects a destination column from another board', async () => {
    setupMoveMocks({ id: destinationColumnId, boardId: '55555555-5555-4555-8555-555555555555' });
    const response = await request(app).post(`/tasks/${taskId}/move`).set('Authorization', `Bearer ${token}`).send({ destinationColumnId, destinationIndex: 0, expectedVersion: 3 });
    expect(response.status).toBe(403); expect(response.body.error.code).toBe('FORBIDDEN'); expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
  it('rejects a viewer from moving tasks', async () => {
    setupMoveMocks(); prismaMock.board.findUnique.mockResolvedValue({ id: boardId, members: [{ userId: 'editor-id', role: 'VIEWER' }] });
    const response = await request(app).post(`/tasks/${taskId}/move`).set('Authorization', `Bearer ${token}`).send({ destinationColumnId, destinationIndex: 0, expectedVersion: 3 });
    expect(response.status).toBe(403);
  });
});
