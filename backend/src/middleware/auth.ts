import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, AuthUser } from '../lib/auth';

declare global { namespace Express { interface Request { user?: AuthUser; boardRole?: 'OWNER' | 'EDITOR' | 'VIEWER'; boardId?: string; } } }

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer ')) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
  try { req.user = verifyAccessToken(value.slice(7)); next(); }
  catch { return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token.' } }); }
}

export function requireRole(minimum: 'VIEWER' | 'EDITOR' | 'OWNER') {
  const rank = { VIEWER: 1, EDITOR: 2, OWNER: 3 };
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.boardRole || rank[req.boardRole] < rank[minimum]) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission for this action.' } });
    next();
  };
}
