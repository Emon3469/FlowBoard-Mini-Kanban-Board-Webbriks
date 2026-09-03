import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';

const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me';
const refreshTtlMs = 30 * 24 * 60 * 60 * 1000;
export type AuthUser = { id: string; email: string; name: string };

export function issueAccessToken(user: AuthUser) {
  return jwt.sign(user, accessSecret, { expiresIn: '15m' });
}
export function verifyAccessToken(token: string): AuthUser {
  return jwt.verify(token, accessSecret) as AuthUser;
}
export function createRefreshToken() { return crypto.randomBytes(32).toString('hex'); }
export function hashToken(token: string) {
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me';
  return crypto.createHmac('sha256', refreshSecret).update(token).digest('hex');
}
export function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', maxAge: refreshTtlMs });
}
export { refreshTtlMs };
