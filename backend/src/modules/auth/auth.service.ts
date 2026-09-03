import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { prisma } from '../../lib/prisma';
import { createRefreshToken, hashToken, issueAccessToken, refreshTtlMs, setRefreshCookie } from '../../lib/auth';
import { userResponse } from '../../lib/http';

export async function issuePair(user: { id: string; name: string; email: string }, response: Response) {
  const refresh = createRefreshToken();
  await prisma.refreshToken.create({ data: { tokenHash: hashToken(refresh), userId: user.id, expiresAt: new Date(Date.now() + refreshTtlMs) } });
  setRefreshCookie(response, refresh);
  return { accessToken: issueAccessToken(userResponse(user)), user: userResponse(user) };
}

export async function register(name: string, email: string, password: string, response: Response) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return null;
  const user = await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12) } });
  return issuePair(user, response);
}

export async function authenticateCredentials(email: string, password: string, response: Response) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return issuePair(user, response);
}

export async function rotateRefreshToken(token: string | undefined, response: Response) {
  if (!token) return null;
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) return null;
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return issuePair(stored.user, response);
}
