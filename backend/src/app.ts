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

export const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true }));
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
    res.status(503).json({
      error: 'Database connection failed',
      status: 'unhealthy'
    });
  }
});

app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);
app.use('/', memberRoutes);
app.use('/', columnRoutes);
app.use('/', taskRoutes);
app.use('/', workspaceRoutes);

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
