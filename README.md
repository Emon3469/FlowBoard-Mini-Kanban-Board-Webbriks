# Webbriks Technical Assessment

## FlowBoard / Swift CR Management

FlowBoard is a focused collaborative Kanban workspace. It demonstrates the core Webbriks assessment requirements with a Node.js and Express API, PostgreSQL persistence through Prisma, JWT authentication, explicit board membership, and conflict-aware task movement.

The supplied brand asset is used at `frontend/public/flowboard-logo.png`; the browser favicon is `frontend/public/favicon.svg`.

## Assessment Coverage

### Authentication and collaboration

- `POST /auth/register` creates users with bcrypt password hashes.
- `POST /auth/login` issues a short-lived JWT access token.
- Refresh tokens are random opaque values stored as HMAC-SHA256 hashes using `JWT_REFRESH_SECRET`.
- Refresh tokens use an `httpOnly`, `sameSite=strict` cookie and rotate on `/auth/refresh`.
- Logout revokes the current refresh token.
- Boards have explicit `OWNER`, `EDITOR`, and `VIEWER` memberships.
- Board, column, and task access is authorized server-side through reusable resource-context middleware.
- Non-members receive `403 FORBIDDEN`, even when they know a resource ID.

### Workflow management and movement

- Board, column, and task creation, update, deletion, and retrieval are implemented.
- `POST /tasks/:id/move` supports same-column reordering and cross-column movement.
- The destination column is checked against the source task's board before the transaction starts.
- Task positions use fractional numeric gaps for normal moves.
- Exhausted gaps trigger deterministic rebalancing.
- `Task.version` is checked inside the transaction; stale collaborators receive `409 CONFLICT`.
- Successful moves emit board events consumed by the Socket.io layer.

### Frontend

- Next.js App Router and React Query manage server state.
- Login and registration are available from the initial screen.
- Boards and tasks load from the API.
- Drag-and-drop uses `@dnd-kit/core` and calls the movement endpoint with the task version.
- The API client retries once after a `401` by rotating the refresh token.
- Responsive navigation, search, loading/error states, task creation, and task details are included.

## Architecture

```text
frontend (Next.js + React Query + dnd-kit)
        |
        | REST / JSON + httpOnly refresh cookie
        v
backend (Node.js + Express + TypeScript)
        |
        | Prisma
        v
PostgreSQL
```

Backend feature structure:

```text
backend/src/
  events/boardEvents.ts
  middleware/auth.ts
  middleware/boardContext.ts
  middleware/validate.ts
  modules/auth/       routes, service, schemas
  modules/boards/     routes, schemas
  modules/columns/    routes, schemas
  modules/members/    routes, controller, service, schemas
  modules/tasks/      routes, schemas, ordering
  sockets/index.ts
```

## How To Run Locally

Prerequisites: Node.js 22+, npm, and PostgreSQL 16 or compatible. Docker is optional.

### Option A: PostgreSQL installed locally

1. Create a PostgreSQL database named `flowboard`.
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`.
3. Ensure the database role in `DATABASE_URL` owns the `public` schema or has `USAGE, CREATE` privileges. An administrator can run:

```sql
ALTER SCHEMA public OWNER TO flowboard;
GRANT USAGE, CREATE ON SCHEMA public TO flowboard;
```

4. Install, migrate, and seed:

```powershell
npm install
Push-Location backend; npm install; npx prisma generate; npx prisma migrate deploy; npm run seed; Pop-Location
Push-Location frontend; npm install; Pop-Location
```

For a custom API host, copy `frontend/.env.example` to `frontend/.env.local` and set `NEXT_PUBLIC_API_URL`.

5. Start the API and frontend in separate terminals:

```powershell
Push-Location backend; npm run dev; Pop-Location
Push-Location frontend; npm run dev; Pop-Location
```

**Note:** Backend startup now automatically cleans up orphaned processes. See [backend/STARTUP_GUIDE.md](backend/STARTUP_GUIDE.md) for troubleshooting common startup issues.

Open `http://localhost:3000`. The API health endpoint is `http://localhost:4001/health` (or port 4000 if configured).

To start both services from the repository root instead, run:

```powershell
npm run dev
```

Seeded accounts:

- `alice@flowboard.dev` / `Flowboard123!`
- `bob@flowboard.dev` / `Flowboard123!`

## Docker Compose

The Compose file uses the current Compose Specification and intentionally has no obsolete top-level `version` field. It runs PostgreSQL and the backend; the frontend runs as a normal local Next.js process.

```powershell
docker compose up --build
Push-Location backend; npm run seed; Pop-Location
Push-Location frontend; npm install; npm run dev; Pop-Location
```

The backend container waits for PostgreSQL, applies committed migrations, and exposes a health check on port `4000`.

Do not run the local backend and the Compose backend at the same time because both use port `4000`.

## Testing

Fast tests use a mocked Prisma boundary and do not require PostgreSQL:

```powershell
Push-Location backend; npm test; npm run build; Pop-Location
```

The suite covers registration and password hashing, invalid login, refresh rotation, logout revocation, unauthorized board access, viewer restrictions, same-board movement, cross-board rejection, stale versions, and ordering/rebalance behavior.

With PostgreSQL running and migrated:

```powershell
Push-Location backend; npm run test:live; Pop-Location
```

## Render Deployment

Deploy PostgreSQL first, then the API, then the frontend. Docker is not required for Render deployment.

### PostgreSQL

1. Create a Render PostgreSQL database.
2. Copy its Internal Database URL.
3. Keep the database private and use the URL only in the backend service.

### Backend Web Service

1. Create a Render Web Service from this repository.
2. Set Root Directory to `backend`.
3. Configure:

```text
Build Command: npm ci && npx prisma generate && npm run build
Start Command: npx prisma migrate deploy && npm start
```

4. Add environment variables:

```text
DATABASE_URL=<Render Internal Database URL>
JWT_ACCESS_SECRET=<long random secret>
JWT_REFRESH_SECRET=<different long random secret>
CORS_ORIGIN=https://<frontend-service>.onrender.com
NODE_ENV=production
COOKIE_SECURE=true
PORT=10000
```

5. Deploy and verify `https://<backend-service>.onrender.com/health`.
6. Run the seed command from a one-off Render shell or local machine using the production `DATABASE_URL`:

```text
npm run seed
```

### Frontend Web Service

1. Create a second Render Web Service from the same repository.
2. Set Root Directory to `frontend`.
3. Configure:

```text
Build Command: npm ci && npm run build
Start Command: npm start
```

4. Add:

```text
NEXT_PUBLIC_API_URL=https://<backend-service>.onrender.com
```

5. Deploy the frontend.
6. Update the backend `CORS_ORIGIN` with the final frontend URL and redeploy the backend.

### Production verification

1. Open the frontend URL.
2. Sign in with `alice@flowboard.dev` or register a new account.
3. Confirm boards load from the API.
4. Create a task and drag it between columns.
5. Refresh and confirm the task remains moved.
6. Sign in as Bob in a private window and confirm the shared board is visible.

## Security and Known Constraints

- Never commit `backend/.env`; use Render environment variables in production.
- Replace all local secret values with independently generated secrets.
- CORS is restricted to the configured frontend origin.
- Auth routes are limited to five attempts per 15 minutes; the general API has a broader limiter.
- Production errors return generic messages while details are logged server-side.
- Docker image vulnerability warnings depend on the current Node/Alpine scanner. Docker was unavailable on the development machine, so Compose should be smoke-tested in CI or on the deployment host.
- Prisma is pinned to 6.19.3. The `DATABASE_URL` in `schema.prisma` is required by Prisma 6; Prisma 7 config-only datasource syntax should only be adopted together with a coordinated Prisma upgrade.

## Design Decisions

The implementation favors a small, explainable architecture over a large feature surface. Explicit memberships make authorization uniform. Fractional positions avoid rewriting every task during normal moves, while rebalancing prevents precision exhaustion. Optimistic version checks make concurrent edits visible and recoverable. The event bus is in-process so Socket.io can broadcast committed changes without coupling transport concerns to database services.
