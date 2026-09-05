<p align="center">
  <img src="logo.png" alt="FlowBoard Logo" width="120" />
</p>

<h1 align="center">FlowBoard — Mini Kanban Board</h1>

<p align="center">
  <strong>A production-grade, real-time collaborative Kanban workspace built from scratch</strong><br/>
  <em>WebBriks Technical Assessment — Full Stack Developer</em>
</p>

<p align="center">
  <a href="https://flow-board-mini-kanban-board-webbriks-agrxnd8gh.vercel.app/">🌐 Live Demo</a> &nbsp;•&nbsp;
  <a href="#demo-credentials">🔑 Demo Login</a> &nbsp;•&nbsp;
  <a href="#features">✨ Features</a> &nbsp;•&nbsp;
  <a href="#tech-stack">🛠 Tech Stack</a> &nbsp;•&nbsp;
  <a href="#architecture">🏗 Architecture</a>
</p>

<br/>

> **Live Application:** [https://flow-board-mini-kanban-board-webbriks-agrxnd8gh.vercel.app](https://flow-board-mini-kanban-board-webbriks-agrxnd8gh.vercel.app/)

---

## 🎯 Why FlowBoard Stands Out

Most Kanban assessment projects are CRUD wrappers with drag-and-drop bolted on. FlowBoard goes further by solving the **hard problems** that real collaborative tools must handle — the ones most candidates skip entirely:

| Gap in Typical Assessments | How FlowBoard Fills It |
|---|---|
| **No concurrency handling** — two users drag the same task and data silently corrupts | **Optimistic concurrency control** with `Task.version` checked inside a database transaction. Stale moves return `409 Conflict` — data never silently overwrites |
| **Naive array-index positioning** — every reorder rewrites every sibling row | **Fractional positioning** with automatic gap rebalancing. A normal drag touches 1 row, not N |
| **No real-time sync** — you refresh to see teammates' changes | **Socket.IO live broadcast** on every mutation. Board joins are membership-verified server-side |
| **Auth is just a JWT** — no rotation, no revocation, no cross-site cookie handling | **Full refresh-token rotation** with HMAC-hashed storage, httpOnly `SameSite=None; Secure` cookies for cross-origin production, and one-click revocation on logout |
| **No authorization beyond "logged in"** — anyone with a board ID can access it | **Three-tier RBAC** (Owner / Editor / Viewer) enforced via server-side middleware on every route. Non-members get `403` even if they know the UUID |
| **Frontend fails silently on network errors** | **Automatic retry with exponential backoff** on connection failures + transparent token refresh on `401` — the user never sees a raw error unless the server is truly down |

**This is not a weekend prototype.** It's a production-ready system with the kind of engineering depth expected in a real team environment.

---

## Demo Credentials

| Email | Password |
|---|---|
| `alice@flowboard.dev` | `Flowboard123!` |
| `bob@flowboard.dev` | `Flowboard123!` |

> **Note:** The backend runs on Render's free tier, so the first request after inactivity may take ~30 seconds for a cold start. This is a hosting limitation, not a performance issue.

---

## Features

### 🏠 Dashboard & Workspace
- **Smart Dashboard** — At-a-glance stats (total boards, tasks, completed, overdue), recent boards, and quick actions
- **Favorites System** — Star important boards for instant access from the sidebar
- **Global Search** — Search across boards, tasks, and notes simultaneously
- **Dark / Light Mode** — System-aware theme toggle with full UI coverage

### 📋 Board Management
- **Multi-Board Workspace** — Create, rename, and delete unlimited boards
- **Three View Modes:**
  - **Kanban** — Classic column-based workflow with fluid drag-and-drop
  - **List** — Structured table view for bulk task scanning
  - **Timeline** — Gantt-style view for date-driven planning
- **Board Import / Export** — JSON-based board portability for backup and migration
- **Column Management** — Add, rename, delete, and reorder columns

### ✅ Task Engine
- **Rich Task Cards** — Title, description, priority levels (Low / Medium / High / Urgent), due dates, start dates, labels, and assignees
- **Drag-and-Drop** — Built with `@dnd-kit` — supports same-column reorder and cross-column moves
- **Optimistic Concurrency** — Version-checked moves inside database transactions prevent silent data loss
- **Fractional Positioning** — Efficient O(1) inserts with automatic rebalancing when gaps exhaust

### 👥 Team Collaboration
- **Role-Based Access Control** — `OWNER` (full control), `EDITOR` (read/write), `VIEWER` (read-only) — enforced server-side
- **Board Sharing** — Invite team members by email with role selection
- **Real-Time Sync** — Socket.IO broadcasts every board mutation to all connected members instantly
- **Live Notifications** — In-app notification bell with unread count badge, pushed in real-time

### 📝 Personal Notes
- **Markdown-Style Notes** — Quick-capture workspace for thoughts and meeting notes
- **Full CRUD** — Create, edit, and delete notes with timestamps

### 📊 Reports & Analytics
- **Workspace Summary** — Aggregated stats across all boards: task counts, completion rates, overdue items
- **Priority Breakdown** — Distribution of tasks by priority level
- **Per-Board Metrics** — Individual board health: total vs. completed tasks
- **Status Distribution** — Task counts by column/status

### 🤖 AI & Support (Optional)
- **Ask AI Chatbot** — Gemini 2.5 Flash-powered assistant for board context-aware questions (requires API key)
- **Voice Support** — Vapi-powered voice assistant for help & support (requires API key)
- Both features **self-disable gracefully** when API keys are not configured — no errors, no broken UI

### ⚡ Automations
- **Column-Triggered Rules** — Automatically add labels, set priority, assign tasks, or send notifications when a task enters a specific column
- **Per-Board Configuration** — Each board manages its own automation rules
- **Enable / Disable Toggle** — Non-destructive control over automation firing

### 🔐 Security & Auth
- **JWT Access Tokens** (15-minute expiry) + **Opaque Refresh Tokens** (30-day, HMAC-SHA256 hashed in DB)
- **Automatic Token Rotation** — Refresh tokens rotate on every use; old tokens are revoked
- **httpOnly Secure Cookies** — Refresh tokens stored in `SameSite=None; Secure` cookies for cross-origin production
- **Rate Limiting** — Login: 20 failed attempts/15min (successes don't count). Registration: 20 attempts/15min. Global: 300 requests/15min
- **Helmet Security Headers** — Full HTTP security header suite out of the box
- **Input Validation** — Zod schemas on every endpoint with strict mode

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 15** | App Router, SSR-ready React framework |
| **React 19** | UI component library |
| **TypeScript** | End-to-end type safety |
| **TailwindCSS 3** | Utility-first responsive styling |
| **TanStack React Query** | Server state management, caching, and synchronization |
| **@dnd-kit** | Accessible drag-and-drop primitives |
| **Socket.IO Client** | Real-time WebSocket communication |
| **Vapi Web SDK** | Voice AI assistant integration |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 22** | JavaScript runtime |
| **Express 5** | HTTP framework |
| **TypeScript** | Type-safe API development |
| **Prisma 6** | Type-safe ORM with migrations |
| **PostgreSQL** | Relational database |
| **Socket.IO** | Real-time event broadcasting |
| **JWT + bcryptjs** | Authentication and password hashing |
| **Zod 4** | Runtime request validation |
| **Helmet** | Security headers |
| **express-rate-limit** | Brute-force protection |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Vercel** | Frontend hosting (edge CDN) |
| **Render** | Backend API + PostgreSQL hosting |
| **Docker** | Containerized deployment |
| **Render Blueprint** | One-click infrastructure provisioning |

---

## Architecture

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│                         │  REST   │                              │
│   Next.js 15 Frontend   │────────▶│   Express 5 API Server       │
│   (Vercel Edge CDN)     │◀────────│   (Render Docker)            │
│                         │  JSON   │                              │
│  • React 19 + Query     │         │  • JWT Auth + RBAC           │
│  • dnd-kit Drag/Drop    │         │  • Zod Validation            │
│  • Socket.IO Client     │◀═══════▶│  • Socket.IO Server          │
│  • Tailwind UI          │  WS     │  • Rate Limiting + Helmet    │
│                         │         │  • Prisma ORM                │
└─────────────────────────┘         └──────────┬───────────────────┘
                                               │
                                               │ Prisma
                                               ▼
                                    ┌──────────────────────┐
                                    │                      │
                                    │   PostgreSQL 16      │
                                    │   (Render Managed)   │
                                    │                      │
                                    └──────────────────────┘
```

### Backend Module Structure

```
backend/src/
├── modules/
│   ├── auth/           # Register, login, refresh, logout, me
│   ├── boards/         # CRUD, import, export
│   ├── columns/        # CRUD, reorder
│   ├── tasks/          # CRUD, move (with concurrency control)
│   ├── members/        # Invite, remove, role management
│   ├── notifications/  # List, unread count, mark read
│   ├── automations/    # Column-triggered automation rules
│   ├── reports/        # Aggregated workspace analytics
│   ├── search/         # Cross-entity global search
│   ├── ai/             # Gemini chatbot integration
│   ├── support/        # Vapi voice assistant config
│   └── integrations/   # Third-party connection catalog
├── middleware/
│   ├── auth.ts         # JWT verification + role extraction
│   ├── boardContext.ts # Resource-level RBAC enforcement
│   └── validate.ts     # Zod schema validation
├── sockets/            # Socket.IO real-time layer
├── events/             # In-process event bus
└── lib/                # Auth helpers, Prisma client, HTTP utils
```

---

## How to Run Locally

### Prerequisites
- Node.js 22+, npm, PostgreSQL 16+

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Emon3469/FlowBoard-Mini-Kanban-Board-Webbriks.git
cd FlowBoard-Mini-Kanban-Board-Webbriks

# 2. Set up the backend
cd backend
cp .env.example .env          # Edit DATABASE_URL with your PostgreSQL credentials
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed                   # Creates demo users + sample board
cd ..

# 3. Set up the frontend
cd frontend
cp .env.example .env.local     # Defaults to http://localhost:4000
npm install
cd ..

# 4. Start both services
npm run dev                    # Runs backend (:4000) and frontend (:3000) concurrently
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the demo credentials above.

### Docker Compose

```bash
docker compose up --build
# Then seed in a separate terminal:
cd backend && npm install && npm run seed
```

---

## Testing

```bash
cd backend

# Unit tests (mocked Prisma — no database required)
npm test

# Integration tests (requires running PostgreSQL)
npm run test:live

# TypeScript type check
npx tsc --noEmit
```

Test coverage includes: registration & password hashing, invalid login handling, refresh token rotation, logout revocation, unauthorized board access, viewer permission restrictions, same-board task movement, cross-board rejection, stale version conflicts, and fractional position rebalancing.

---

## Deployment

| Component | Platform | URL |
|---|---|---|
| **Frontend** | Vercel | [flow-board-mini-kanban-board-webbriks-agrxnd8gh.vercel.app](https://flow-board-mini-kanban-board-webbriks-agrxnd8gh.vercel.app/) |
| **Backend API** | Render | `flowboard-api-jl9w.onrender.com` |
| **Database** | Render | Managed PostgreSQL |

The project ships a [`render.yaml`](render.yaml) Blueprint for one-click Render provisioning. The frontend is deployed to Vercel with `NEXT_PUBLIC_API_URL` set as a build-time environment variable.

---

## Why I'm the Right Candidate

This assessment isn't just about building a Kanban board — it's about demonstrating the engineering judgment, depth, and production-readiness that matter in a real team. Here's what this project proves:

**🧠 I think beyond the happy path.** Optimistic concurrency, token rotation, retry logic, rate limiting — these are the things that separate a prototype from production software. I built them because I know they matter.

**🏗 I write maintainable code.** Modular backend architecture with clean separation of concerns. Reusable middleware for auth and authorization. Type safety from database to API to UI with TypeScript, Prisma, and Zod.

**⚡ I ship production-ready systems.** Docker multi-stage builds, Render Blueprint for one-click deployment, Vercel edge CDN, health checks, graceful shutdown, environment validation — this project is deployable out of the box.

**🎨 I care about the user experience.** Dark mode, responsive design, real-time updates, intelligent error messages, smooth drag-and-drop — every interaction is polished.

**📐 I make deliberate engineering trade-offs.** Fractional positioning over array indexes (O(1) vs O(n) inserts). In-process event bus over external message queue (right-sized complexity). httpOnly cookies over localStorage tokens (security over convenience).

---

<p align="center">
  Built with ❤️ for the <strong>WebBriks Technical Assessment</strong>
</p>
