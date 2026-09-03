import { z } from 'zod';
export const boardSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict();