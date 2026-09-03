import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
export function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: result.error.issues.map((issue) => issue.message).join(', ') } });
    req.body = result.data;
    next();
  };
}
