import request from 'supertest';
import { prismaMock } from './testPrisma';
jest.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
import { app } from '../src/app';
import { issueAccessToken } from '../src/lib/auth';

const user = { id: 'user-1', name: 'Alice', email: 'alice@example.com', passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOZB6Qx3qHh8E8t0fQxY8f5OQ9YjQw7qK' };
describe('authentication API', () => {
  beforeEach(() => jest.clearAllMocks());
  it('registers a user, hashes the password, and returns an access token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }) => ({ ...user, ...data }));
    prismaMock.refreshToken.create.mockResolvedValue({});
    const response = await request(app).post('/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'Password123!' });
    expect(response.status).toBe(201); expect(response.body.data.accessToken).toEqual(expect.any(String)); expect(response.headers['set-cookie'][0]).toContain('refreshToken=');
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.not.stringContaining('Password123!') }) }));
  });
  it('rejects invalid login credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const response = await request(app).post('/auth/login').send({ email: 'alice@example.com', password: 'wrong-password' });
    expect(response.status).toBe(401); expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
  it('rotates a valid refresh token and revokes the old token', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({ id: 'refresh-1', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user });
    prismaMock.refreshToken.update.mockResolvedValue({}); prismaMock.refreshToken.create.mockResolvedValue({});
    const response = await request(app).post('/auth/refresh').set('Cookie', 'refreshToken=old-token');
    expect(response.status).toBe(200); expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({ data: { revokedAt: expect.any(Date) } })); expect(response.headers['set-cookie'][0]).toContain('refreshToken=');
  });
  it('requires authentication for logout', async () => {
    const response = await request(app).post('/auth/logout');
    expect(response.status).toBe(401);
  });
  it('revokes the refresh token on authenticated logout', async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    const response = await request(app).post('/auth/logout').set('Authorization', `Bearer ${issueAccessToken({ id: user.id, name: user.name, email: user.email })}`).set('Cookie', 'refreshToken=old-token');
    expect(response.status).toBe(204); expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
  });
});
