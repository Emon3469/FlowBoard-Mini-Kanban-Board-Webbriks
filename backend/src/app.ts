import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes';
import boardRoutes from './modules/boards/boards.routes';
import columnRoutes from './modules/columns/columns.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import memberRoutes from './modules/members/members.routes';
import { sendError } from './lib/http';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma';
import workspaceRoutes from './modules/workspace.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import reportRoutes from './modules/reports/reports.routes';
import searchRoutes from './modules/search/search.routes';
import aiRoutes from './modules/ai/ai.routes';
import supportRoutes from './modules/support/support.routes';
import integrationRoutes from './modules/integrations/integrations.routes';
import automationRoutes from './modules/automations/automations.routes';

export const app = express();
// Behind Render's proxy, trust the first hop so express-rate-limit and secure
// cookies see the real client IP / protocol.
app.set('trust proxy', 1);
app.use(helmet());
// A STRING origin makes cors echo that exact value as Access-Control-Allow-Origin
// for EVERY request — it never compares against the caller. So a browser tab on
// http://127.0.0.1:3000 (Next's "Network" URL, a bookmark, or a LAN IP) gets an
// ACAO that doesn't match its own origin, the browser blocks the response, and
// the fetch dies as "Failed to fetch". Accept a comma-separated allowlist and
// reflect the caller's origin when it matches. Requests with no Origin header
// (curl, health checks, same-origin) are allowed.
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, skip: (req) => req.path === '/health' }));

// Health check with database status
app.get('/health', async (_req, res) => {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      data: {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Health check failed - database error:', error);
    return sendError(res, 503, 'DB_ERROR', 'Database connection failed.');
  }
});

app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);
app.use('/', memberRoutes);
app.use('/', columnRoutes);
app.use('/', taskRoutes);
app.use('/', workspaceRoutes);
app.use('/', notificationRoutes);
app.use('/', reportRoutes);
app.use('/', searchRoutes);
app.use('/', aiRoutes);
app.use('/', supportRoutes);
app.use('/', integrationRoutes);
app.use('/', automationRoutes);

// TEMPORARY SEED ENDPOINT – REMOVE AFTER FIRST USE
if (process.env.SEED_ENABLED === 'true') {
  app.get('/seed', async (_req, res) => {
    try {
      // Import the seed function from your seed file
      await import('./prisma/seed.js');
      res.json({ success: true, message: 'Database seeded' });
    } catch (err) {
      console.error('Seed error:', err);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });
}

// Catch-all error handler
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Request error:', error);

  // Check if it's a Prisma error
  if (error instanceof Error) {
    if (error.message.includes('Connection refused') || error.message.includes('getaddrinfo')) {
      return sendError(res, 503, 'DB_ERROR', 'Database connection failed. Check your database status.');
    }
    if (error.message.includes('too many connections')) {
      return sendError(res, 503, 'DB_POOL_ERROR', 'Database connection pool exhausted. Try again soon.');
    }
  }

  sendError(res, 500, 'INTERNAL_ERROR', process.env.NODE_ENV === 'production' ? 'Something went wrong.' : String(error));
});