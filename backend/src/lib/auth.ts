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
  // Cross-site cookie behavior is driven by the explicit COOKIE_SECURE flag, not
  // NODE_ENV. In real deployments the SPA and API live on different hosts, so the
  // refresh cookie must be SameSite=None + Secure to survive cross-site requests
  // (set COOKIE_SECURE=true there — see render.yaml). Locally over http we use
  // SameSite=Lax without Secure: browsers silently DROP a Secure cookie on
  // http://localhost, which would otherwise break token refresh and force repeat
  // logins even when NODE_ENV happens to be "production".
  const crossSiteSecure = process.env.COOKIE_SECURE === 'true';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: crossSiteSecure ? 'none' : 'lax',
    secure: crossSiteSecure,
    maxAge: refreshTtlMs,
  });
}
export { refreshTtlMs };
