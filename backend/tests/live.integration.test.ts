import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

const live = process.env.RUN_LIVE_DB_TESTS === '1' ? describe : describe.skip;

live('PostgreSQL integration', () => {
  const email = `integration-${Date.now()}@example.com`;
  let accessToken = '';
  let boardId = '';

  afterAll(async () => {
    if (boardId) await prisma.board.delete({ where: { id: boardId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('persists auth and board data in PostgreSQL', async () => {
    const registration = await request(app).post('/auth/register').send({ name: 'Integration User', email, password: 'Password123!' });
    expect(registration.status).toBe(201);
    accessToken = registration.body.data.accessToken;
    const created = await request(app).post('/boards').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Integration Board' });
    expect(created.status).toBe(201);
    boardId = created.body.data.id;
    const fetched = await request(app).get(`/boards/${boardId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.name).toBe('Integration Board');
  });
});
