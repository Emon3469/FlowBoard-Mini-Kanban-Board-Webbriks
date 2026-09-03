import { z } from 'zod';

export const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
}).strict();
