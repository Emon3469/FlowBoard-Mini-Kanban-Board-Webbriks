import 'dotenv/config';
import { app } from './app';
import { createServer, Server } from 'node:http';
import { attachSockets } from './sockets';
import { prisma } from './lib/prisma';

const port = Number(process.env.PORT ?? 4000);
const isDev = process.env.NODE_ENV !== 'production';

// Validate required environment variables
function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Check database connectivity before starting server
async function checkDatabase() {
  try {
    console.log('🔍 Validating database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Graceful shutdown handler
function setupGracefulShutdown(server: Server) {
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        console.log('✅ HTTP server closed');
        try {
          await prisma.$disconnect();
          console.log('✅ Database connection closed');
        } catch (err) {
          console.error('⚠️  Error disconnecting database:', err);
        }
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown (timeout)');
        process.exit(1);
      }, 10000);
    });
  });
}

// Probe the database in the background with capped backoff. We deliberately do
// NOT gate server.listen() on this, nor exit on failure: binding the port
// immediately means a transient DB problem (a restart, a bad password, the DB
// still booting) surfaces to the browser as an HTTP 503 — see /health and the
// error handler in app.ts — instead of a connection-refused "Failed to fetch".
// The server keeps retrying until the database is reachable.
async function probeDatabaseWithRetry() {
  for (let attempt = 1; ; attempt++) {
    if (await checkDatabase()) return;
    const delayMs = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
    console.error(
      `⚠️  Database not reachable (attempt ${attempt}). Retrying in ${delayMs / 1000}s. ` +
        `The API stays up and returns HTTP 503 until the database is ready.`,
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

// Start server with error handling
async function startServer() {
  try {
    // Missing secrets are a non-transient, unrecoverable misconfiguration, so
    // this stays a hard exit. Database connectivity, by contrast, is verified
    // AFTER the port is bound (below), so a DB blip never becomes a
    // connection-refused "Failed to fetch" in the browser.
    validateEnvironment();

    const server = createServer(app);
    attachSockets(server);
    setupGracefulShutdown(server);

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${port} is already in use`);
        console.error(`\n💡 Quick fix (Windows): Get-NetTCPConnection -LocalPort ${port} -State Listen | Stop-Process -Id {ProcessId} -Force`);
        console.error(`💡 Quick fix (Mac/Linux): lsof -ti :${port} | xargs kill -9\n`);
        if (isDev) {
          console.error('💡 Or restart VS Code terminal to force cleanup\n');
        }
        process.exit(1);
      }
      throw error;
    });

    server.listen(port, () => {
      console.log(`\n✅ FlowBoard API listening on http://localhost:${port}`);
      console.log(`📚 Health check: http://localhost:${port}/health`);
      if (isDev) {
        console.log(`⏱️  Press Ctrl+C to stop (graceful shutdown will run)\n`);
      }
    });

    // Verify database connectivity WITHOUT blocking the port bind or exiting on
    // failure. Runs in the background and degrades to HTTP 503 while retrying.
    void probeDatabaseWithRetry();
  } catch (error) {
    console.error('❌ Failed to start server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Ensure database disconnects on uncaught errors
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught exception:', error);
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('⚠️  Error during graceful shutdown:', err);
  }
  process.exit(1);
});

// A stray unhandled rejection (e.g. a best-effort background socket emit or
// post-commit automation) is logged but must NOT take down the whole API:
// killing the process here turns one background error into "failed to fetch"
// for every client until the server restarts.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled rejection (logged, server kept alive):', reason);
});

startServer();
