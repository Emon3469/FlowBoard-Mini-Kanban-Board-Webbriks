# Backend Development Setup & Troubleshooting

## Quick Start

```bash
npm run dev
```

This will automatically:
- ✅ Clean up any orphaned processes on port 4000
- ✅ Validate environment configuration
- ✅ Bind the port immediately, then verify database connectivity in the background (returns HTTP 503 instead of refusing connections if the DB is briefly down)
- ✅ Start the development server with file watching
- ✅ Handle graceful shutdown on Ctrl+C

## What Was Fixed

### Issue: `EADDRINUSE: address already in use :::4000`

This error occurred when:
1. Development server crashed or was force-killed without cleanup
2. Process remained in TIME_WAIT state (Windows)
3. Multiple dev instances were started
4. Terminal was closed without graceful shutdown

### Solutions Implemented

#### 1. **Automatic Port Cleanup** (`scripts/dev-start.ts`)
- Auto-kills orphaned processes before starting
- Validates `.env` configuration
- Waits for port availability before starting
- Works on Windows, macOS, and Linux

#### 2. **Graceful Shutdown** (`src/server.ts`)
- Handles SIGTERM and SIGINT signals
- Properly closes HTTP server
- Disconnects from database
- 10-second timeout for forced shutdown
- Prevents orphaned processes

#### 3. **Startup Validation** (`src/server.ts`)
- Validates required environment variables (hard-fails only on missing secrets)
- Verifies database connectivity in the background *after* the port is bound, so a database blip returns HTTP 503 instead of a connection-refused "Failed to fetch"
- Provides helpful error messages
- Logs startup progress with emojis for clarity

#### 4. **Enhanced Health Checks** (`src/app.ts`)
- `GET /health` now includes database status
- Returns 503 if database unreachable
- Shows connection timestamp
- Helps diagnose connection issues

## Available Commands

```bash
# Recommended: Auto-cleanup + watch mode
npm run dev

# Direct start (if port is already clean)
npm run dev:direct

# One-shot cleanup and start (Windows)
npm run dev:clean

# Build for production
npm build

# Start built version
npm start

# Run tests
npm test

# Run database seed
npm seed
```

## Troubleshooting

### Port Still in Use After `npm run dev`?

**Windows:**
```powershell
# See what's using port 4000
Get-NetTCPConnection -LocalPort 4000 -State Listen

# Force kill it
Get-NetTCPConnection -LocalPort 4000 -State Listen | Stop-Process -Force
```

**macOS/Linux:**
```bash
# See what's using port 4000
lsof -i :4000

# Force kill it
lsof -ti :4000 | xargs kill -9
```

### Database Connection Failed?

1. **Check PostgreSQL is running:**
   ```bash
   docker-compose up -d postgres  # if using Docker
   ```

2. **Verify .env configuration:**
   ```bash
   # Check DATABASE_URL is set correctly
   echo $env:DATABASE_URL
   ```

3. **Test connection directly:**
   ```bash
   curl http://localhost:4000/health
   ```

4. **Check database exists:**
   ```bash
   psql -U flowboard -d flowboard -c "SELECT 1;"
   ```

### Failed to Fetch / Connection Refused?

This usually means the backend isn't running. Check:
1. Terminal shows "✅ FlowBoard API listening on http://localhost:4000"
2. Frontend is trying to reach port 4000 (check `frontend/lib/api.ts`)
3. Both backend and frontend are running (use `npm run dev` from root)

### Environment Variables Missing?

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in required values:
   ```
   DATABASE_URL=postgresql://flowboard:flowboard@localhost:5432/flowboard
   JWT_ACCESS_SECRET=your-secret-here
   JWT_REFRESH_SECRET=your-secret-here
   PORT=4000
   ```

## Best Practices

1. **Always use `npm run dev`** – it handles cleanup automatically
2. **Use Ctrl+C to stop** – allows graceful shutdown (don't force-kill)
3. **Monitor startup logs** – they tell you exactly what's happening
4. **Check `/health` endpoint** – instant database status
5. **Keep .env in sync** – required variables must all be set

## How Graceful Shutdown Works

When you press Ctrl+C:
1. Server receives SIGINT signal
2. Stops accepting new connections
3. Waits for active requests to complete (or 10s timeout)
4. Closes HTTP server
5. Disconnects from database
6. Process exits cleanly (port is immediately available)

This means **no more stale processes** blocking the port!

## Development Workflow

```bash
# Initial setup
npm install
cp .env.example .env  # Configure values
npm run seed          # Optional: seed database

# Daily development
npm run dev           # Auto-cleanup + watch mode
# Make changes...
# Files auto-reload
# Press Ctrl+C when done (graceful shutdown)
```

## Still Having Issues?

Check the startup output for these indicators:

- ✅ = Working correctly
- ❌ = Error that needs fixing
- 🔍 = Checking something
- 🧹 = Cleaning up
- 📍 = Starting server
- ⏱️ = Waiting for input

Read the error message below the symbol – it tells you exactly what went wrong.
