#!/usr/bin/env node
/**
 * Development server startup with automatic port cleanup
 * Handles orphaned processes that prevent fresh starts
 */

import { spawn, spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PORT = Number(process.env.PORT ?? 4000);
const isWindows = platform() === 'win32';

async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    if (isWindows) {
      // Resolve connection owners to process IDs before stopping them.
      const psCommand = `$ownerPids = @(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($ownerPid in $ownerPids) { Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue }`;
      spawnSync('powershell.exe', ['-NoProfile', '-Command', psCommand], { stdio: 'ignore' });
      return true;
    } else {
      // macOS/Linux: Use lsof
      const result = spawnSync('bash', ['-c', `lsof -ti :${port} | xargs kill -9 2>/dev/null`], { stdio: 'ignore' });
      if (result.status === 0 || result.status === null) {
        console.log(`🧹 Cleaned up any existing process on port ${port}`);
        return true;
      }
    }
  } catch (error) {
    // Silently continue if cleanup fails (process may not exist)
  }
  return false;
}

function validateEnvironment(): boolean {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    console.error('💡 Copy .env.example to .env and fill in required values');
    return false;
  }

  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const missing = required.filter(key => !envContent.includes(key));
  
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars in .env: ${missing.join(', ')}`);
    return false;
  }

  console.log('✅ Environment validation passed');
  return true;
}

async function main() {
  console.log('🚀 Starting FlowBoard API development server...\n');

  if (!validateEnvironment()) {
    process.exit(1);
  }

  // Wait a bit before killing to avoid interrupting current shutdown
  await new Promise(r => setTimeout(r, 500));

  // Clean up any orphaned process
  await killProcessOnPort(PORT);

  // The port-availability probe uses PowerShell, so it only runs on Windows.
  // (killProcessOnPort already handles macOS/Linux via lsof above.) Gating this
  // matters: on a non-Windows host powershell.exe does not exist, so spawnSync
  // returns an error with no stdout — and the old unconditional gate below read
  // that empty output as "port in use" and exited, so the dev server never
  // started on Mac/Linux.
  if (isWindows) {
    // Wait for port to be available
    let retries = 5;
    while (retries > 0) {
      try {
        const result = spawnSync('powershell.exe', [
          '-NoProfile',
          '-Command',
          `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count`
        ], { encoding: 'utf-8', stdio: 'pipe' });

        if (result.stdout?.trim() === '0') {
          break; // Port is free
        }
      } catch (e) {
        break; // Error means port might be free, continue
      }

      retries--;
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const portCheck = spawnSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `(Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count`
    ], { encoding: 'utf-8', stdio: 'pipe' });
    // Only abort when PowerShell actually reported one or more listeners. A
    // spawn error or empty output (a transient probe failure) must NOT be read
    // as "port in use" — otherwise a hiccup in the probe needlessly blocks
    // startup.
    const listenerCount = portCheck.error == null ? portCheck.stdout?.trim() : undefined;
    if (listenerCount != null && listenerCount !== '' && listenerCount !== '0') {
      console.error(`❌ Port ${PORT} is still in use. Stop the owning process and retry.`);
      process.exit(1);
    }
  }

  console.log(`📍 Starting server on port ${PORT}...\n`);

  // Start tsx watch process
  const watcher = spawn('tsx', ['watch', 'src/server.ts'], {
    cwd: __dirname.replace(/scripts$/, ''),
    stdio: 'inherit',
    shell: true
  });

  watcher.on('error', (error) => {
    console.error('❌ Failed to start dev server:', error);
    process.exit(1);
  });

  // Forward signals for graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping dev server...');
    watcher.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    watcher.kill('SIGTERM');
  });
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
