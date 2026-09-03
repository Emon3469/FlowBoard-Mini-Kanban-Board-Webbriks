import request from 'supertest';
import { prismaMock } from './testPrisma';
jest.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
import { app } from '../src/app';
import { issueAccessToken } from '../src/lib/auth';

const token = issueAccessToken({ id: 'bob-id', name: 'Bob', email: 'bob@example.com' });
describe('authorization middleware', () => {
  beforeEach(() => jest.clearAllMocks());
  it('rejects a non-member before loading board data', async () => {
    prismaMock.board.findUnique.mockResolvedValue({ id: 'board-a', members: [{ userId: 'alice-id', role: 'OWNER' }] });
    const response = await request(app).get('/boards/board-a').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403); expect(response.body.error.code).toBe('FORBIDDEN');
  });
  it('allows a viewer to read a board but not mutate it', async () => {
    prismaMock.board.findUnique.mockResolvedValue({ id: 'board-a', members: [{ userId: 'bob-id', role: 'VIEWER' }] });
    prismaMock.board.findUnique.mockResolvedValueOnce({ id: 'board-a', members: [{ userId: 'bob-id', role: 'VIEWER' }] }).mockResolvedValueOnce({ id: 'board-a', columns: [], members: [] });
    const read = await request(app).get('/boards/board-a').set('Authorization', `Bearer ${token}`);
    expect(read.status).toBe(200);
    prismaMock.board.findUnique.mockResolvedValue({ id: 'board-a', members: [{ userId: 'bob-id', role: 'VIEWER' }] });
    const update = await request(app).patch('/boards/board-a').set('Authorization', `Bearer ${token}`).send({ name: 'Nope' });
    expect(update.status).toBe(403);
  });
});
