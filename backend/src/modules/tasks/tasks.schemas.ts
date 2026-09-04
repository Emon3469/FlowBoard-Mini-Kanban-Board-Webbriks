import { z } from 'zod';

// Accepts an ISO date string (coerced to Date) or explicit null (to clear the field).
const nullableDate = z.union([z.coerce.date(), z.null()]);

export const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(2000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: nullableDate.optional(),
    startDate: nullableDate.optional(),
    labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    assigneeId: z.union([z.string().uuid(), z.null()]).optional(),
  })
  .strict();

export const moveSchema = z
  .object({
    destinationColumnId: z.string().uuid(),
    destinationIndex: z.number().int().min(0),
    expectedVersion: z.number().int().min(0),
  })
  .strict();
