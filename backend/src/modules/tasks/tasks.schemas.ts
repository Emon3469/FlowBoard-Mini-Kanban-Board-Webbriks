import { z } from 'zod';
export const taskSchema = z.object({ title: z.string().trim().min(1).max(160), description: z.string().max(2000).optional() }).strict();
export const moveSchema = z.object({ destinationColumnId: z.string().uuid(), destinationIndex: z.number().int().min(0), expectedVersion: z.number().int().min(0) }).strict();