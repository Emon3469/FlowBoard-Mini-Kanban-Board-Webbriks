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

// Start server with error handling
async function startServer() {
  try {
    validateEnvironment();
    
    const dbConnected = await checkDatabase();
    if (!dbConnected) {
      console.error('❌ Cannot start server without database connection');
      process.exit(1);
    }

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

process.on('unhandledRejection', async (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('⚠️  Error during graceful shutdown:', err);
  }
  process.exit(1);
});

startServer();
