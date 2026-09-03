import { Response } from 'express';

export function sendError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export const routeParam = (value: string | string[] | undefined) => String(value);

export function userResponse(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}
