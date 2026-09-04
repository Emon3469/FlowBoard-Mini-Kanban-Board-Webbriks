# Webbriks Technical Assessment

## FlowBoard / Swift CR Management

FlowBoard is a focused collaborative Kanban workspace. It demonstrates the core Webbriks assessment requirements with a Node.js and Express API, PostgreSQL persistence through Prisma, JWT authentication, explicit board membership, and conflict-aware task movement.

The supplied brand asset is used at `frontend/public/flowboard-logo.png`; the browser favicon is `frontend/public/favicon.svg`.

## Assessment Coverage

### Authentication and collaboration

- `POST /auth/register` creates users with bcrypt password hashes.
- `POST /auth/login` issues a short-lived JWT access token.
- Refresh tokens are random opaque values stored as HMAC-SHA256 hashes using `JWT_REFRESH_SECRET`.
- Refresh tokens use an `httpOnly` cookie (`SameSite=Lax` in local development; `SameSite=None; Secure` when `COOKIE_SECURE=true`, for cross-site production) and rotate on `/auth/refresh`.
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

Open `http://localhost:3000`. The API health endpoint is `http://localhost:4000/health`.

To start both services from the repository root instead, run:

```powershell
npm run dev
```

Seeded accounts:

- `alice@flowboard.dev` / `Flowboard123!`
- `bob@flowboard.dev` / `Flowboard123!`

## Docker Compose

The Compose file uses the current Compose Specification and intentionally has no obsolete top-level `version` field. It runs the **full stack**: PostgreSQL, the backend API, and the frontend, each in its own container.

```powershell
docker compose up --build
```

Then seed demo data once (the seed script and dev dependencies are not in the slim runtime image, so run it from the host against the exposed database port):

```powershell
Push-Location backend; npm install; npm run seed; Pop-Location
```

Open `http://localhost:3000` and sign in with a seeded account.

What happens on `up`:

- **postgres** starts with a health check; the backend waits for it to be healthy.
- **backend** applies committed migrations (`prisma migrate deploy`) automatically, then serves on `http://localhost:4000` with a `/health` check.
- **frontend** is built with `NEXT_PUBLIC_API_URL=http://localhost:4000` baked in and serves on `http://localhost:3000`.

Do not run a local backend (`npm run dev`) and the Compose backend at the same time; both use port `4000`.

To add the Ask AI and Help & Support features locally, set `GOOGLE_API_KEY` and the `VAPI_*` variables in the `backend` service `environment:` block (they are optional — the features self-disable when the keys are absent).

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

The repository ships a Render Blueprint at [`render.yaml`](render.yaml) that provisions everything in one step: a managed PostgreSQL database plus two Dockerized web services (API and frontend). This is the recommended, lowest-friction path.

### Option A — One-click Blueprint (recommended)

1. **Push this repository to GitHub/GitLab** (Render deploys from a connected Git repo).
2. In the Render Dashboard choose **New → Blueprint**, then select this repository. Render reads `render.yaml` and shows the database and the two services (`flowboard-api`, `flowboard-web`).
3. Render prompts for the values marked `sync: false`. Enter:

   | Service | Variable | Value |
   |---|---|---|
   | `flowboard-web` | `NEXT_PUBLIC_API_URL` | `https://flowboard-api.onrender.com` |
   | `flowboard-api` | `CORS_ORIGIN` | `https://flowboard-web.onrender.com` |
   | `flowboard-api` | `GOOGLE_API_KEY` | your Google Gemini API key (enables **Ask AI**) |
   | `flowboard-api` | `VAPI_PUBLIC_KEY` | your Vapi public key (enables **Help & Support**) |
   | `flowboard-api` | `VAPI_PRIVATE_KEY` | your Vapi private key (server-side only) |
   | `flowboard-api` | `VAPI_ASSISTANT_ID` | optional Vapi assistant id (blank = inline assistant) |

   The two URLs follow the pattern `https://<service-name>.onrender.com`. Enter them as above so the frontend bundle is built against the correct API URL on the first build. `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are wired/generated automatically — do not set them by hand.

4. Click **Apply**. Render creates the database first, then builds and deploys both services. The API container runs `prisma migrate deploy` on startup, so the schema is created automatically.
5. **Seed demo data once.** Open the `flowboard-api` service → **Shell** and run:

   ```text
   npm run seed
   ```

   (The seed is idempotent, so re-running it is safe.)
6. Visit `https://flowboard-web.onrender.com` and sign in.

**If Render renamed a service** (because a name was already taken, e.g. `flowboard-api-xyz`), the two guessed URLs are wrong. Fix them once:
   - Set `flowboard-web` → `NEXT_PUBLIC_API_URL` to the real API URL and **Manual Deploy → Clear build cache & deploy** (the URL is baked in at build time).
   - Set `flowboard-api` → `CORS_ORIGIN` to the real web URL and redeploy.

### Option B — Manual services (no Blueprint)

Create the database and each service by hand. Docker is used via each service's Dockerfile.

1. **PostgreSQL:** New → PostgreSQL. Copy its **Internal Database URL**.
2. **Backend:** New → Web Service → this repo → **Runtime: Docker**, **Dockerfile Path** `./backend/Dockerfile`, **Docker Build Context Directory** `./backend`, **Health Check Path** `/health`. Add environment variables:

   ```text
   DATABASE_URL=<Render Internal Database URL>
   JWT_ACCESS_SECRET=<long random secret>
   JWT_REFRESH_SECRET=<different long random secret>
   CORS_ORIGIN=https://<frontend-service>.onrender.com
   NODE_ENV=production
   COOKIE_SECURE=true
   PORT=4000
   GOOGLE_API_KEY=<optional, enables Ask AI>
   VAPI_PUBLIC_KEY=<optional, enables Help & Support>
   VAPI_PRIVATE_KEY=<optional, server-side only>
   VAPI_ASSISTANT_ID=<optional>
   ```

   Deploy, then verify `https://<backend-service>.onrender.com/health` returns `ok`. Seed via the service **Shell**: `npm run seed`.
3. **Frontend:** New → Web Service → this repo → **Runtime: Docker**, **Dockerfile Path** `./frontend/Dockerfile`, **Docker Build Context Directory** `./frontend`, **Health Check Path** `/login`. Add:

   ```text
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_API_URL=https://<backend-service>.onrender.com
   ```

   Deploy. If you set `NEXT_PUBLIC_API_URL` after the first build, redeploy with **Clear build cache** so the value is re-baked into the bundle.
4. Set the backend `CORS_ORIGIN` to the final frontend URL and redeploy the backend.

### Deployment notes

- **Migrations run automatically** on backend start (`prisma migrate deploy` in `backend/Dockerfile`). No manual migration step is needed.
- **`NEXT_PUBLIC_API_URL` is build-time.** Next.js inlines `NEXT_PUBLIC_*` into the client bundle during build. Render passes service env vars whose names match a Dockerfile `ARG` as build arguments, and `frontend/Dockerfile` declares `ARG NEXT_PUBLIC_API_URL`, so the value bakes in. Changing it later requires a redeploy with the build cache cleared.
- **Secrets stay server-side.** `GOOGLE_API_KEY` and `VAPI_*` live only on the API service, which declares no matching build `ARG`, so they are never baked into any image. The Vapi *public* key reaches the browser only through the authenticated `GET /support/config` endpoint; the private key is never sent to the client.
- **Free plan caveats.** Free web services spin down after inactivity and cold-start on the next request; the free PostgreSQL instance is time-limited. Upgrade the plans in `render.yaml` (or in the dashboard) for always-on production use.
- **Same region.** The database and both services are pinned to `oregon` in `render.yaml` so the internal `DATABASE_URL` resolves. Keep them in one region if you change it.

### Production verification

1. Open the frontend URL.
2. Sign in with `alice@flowboard.dev` / `Flowboard123!` or register a new account.
3. Confirm boards load, then create a task and drag it between columns; refresh and confirm it stays moved.
4. Switch Kanban → List → Timeline views.
5. Share a board with `bob@flowboard.dev`, sign in as Bob in a private window, and confirm the shared board plus an Inbox notification and bell badge appear.
6. Open **Reports** and confirm non-zero aggregates.
7. If keys were set: open **Ask AI** and confirm a reply; start a **Help & Support** voice call.

## Security and Known Constraints

- Never commit `backend/.env`; use Render environment variables in production.
- Replace all local secret values with independently generated secrets.
- CORS is restricted to the configured frontend origin.
- Auth routes are limited to 20 *failed* attempts per 15 minutes (successful logins are not counted); the general API has a broader limiter.
- Production errors return generic messages while details are logged server-side.
- Docker image vulnerability warnings depend on the current Node/Alpine scanner. Docker was unavailable on the development machine, so Compose should be smoke-tested in CI or on the deployment host.
- Prisma is pinned to 6.19.3. The `DATABASE_URL` in `schema.prisma` is required by Prisma 6; Prisma 7 config-only datasource syntax should only be adopted together with a coordinated Prisma upgrade.

## Design Decisions

The implementation favors a small, explainable architecture over a large feature surface. Explicit memberships make authorization uniform. Fractional positions avoid rewriting every task during normal moves, while rebalancing prevents precision exhaustion. Optimistic version checks make concurrent edits visible and recoverable. The event bus is in-process so Socket.io can broadcast committed changes without coupling transport concerns to database services.
