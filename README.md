# Svigl

> A multiplayer SVG drawing and guessing game — think Skribbl.io, but the canvas is vector-first. Scribble freehand with **Pencil**, or drop exact shapes (line, rect, ellipse, fill); everything lives on the same board and syncs as structured SVG.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion, GSAP |
| Backend | FastAPI, SQLAlchemy 2, Alembic, PyJWT, Authlib |
| Database | PostgreSQL 17 |
| Auth | Google OAuth 2.0 + JWT session cookies |
| Realtime | WebSockets (room sync, canvas ops, game events) |
| Infrastructure | Docker, Docker Compose (local); Vercel (frontend), Railway (backend) |
| Tests | Vitest (frontend), pytest (backend) |

---

## Repository Structure

```
svigl/
├── backend/                 # FastAPI app (Python 3.12)
│   ├── app/
│   │   ├── api/             # HTTP routes (auth, rooms, gallery, session, …)
│   │   ├── auth/            # Google OAuth, JWT, cookies, guests
│   │   ├── data/            # Static data (e.g. words.json)
│   │   ├── db/              # Engine / session
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Game, room, canvas, drawings, …
│   │   └── websocket/       # Connection / room managers + handlers
│   ├── alembic/             # DB migrations
│   ├── tests/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── .env.local           # ← create this (never commit)
├── frontend/                # Next.js app (feature-oriented)
│   ├── app/                 # App Router pages (landing, room, gallery, …)
│   ├── features/            # Domain UI + logic
│   │   ├── whiteboard/      # SVG canvas, tools, sync, history
│   │   ├── room/            # Lobby + in-game shell
│   │   ├── landing/
│   │   ├── gallery/
│   │   └── …
│   ├── components/          # Shared UI (layout, landing, room chrome, …)
│   ├── services/            # API + WebSocket clients
│   ├── stores/              # Client state (session + active room)
│   ├── lib/                 # Helpers (create-store, auth, ws utils, …)
│   ├── hooks/
│   ├── contexts/
│   ├── types/
│   ├── .env.example
│   └── .env.local           # ← create this (never commit)
├── .env.example             # Docker Compose env template
├── .env                     # ← create this (never commit)
└── docker-compose.yml
```

---

## Whiteboard (drawing model)

The board is an 800×800 logical SVG viewBox. Shapes are structured objects (not a raster bitmap). Tools:

| Shortcut | Tool | Notes |
|----------|------|--------|
| `1` | **Pencil** | Default tool. Freehand stroke → simplified + smoothed SVG path (`d`) |
| `2` | Select | Click / marquee; move, resize, rotate |
| `3` | Line | Bezier curve/line with editable control handle |
| `4` | Rectangle | Shift = square |
| `5` | Ellipse | Shift = circle |
| `6` | Fill | Flood-fill closed regions → closed path |
| `7` | Eraser | Removes whole shapes under the cursor |

**Pencil** samples pointer input, simplifies with RDP, and commits a compact quadratic-bezier path so freehand sketching stays vector and multiplayer-friendly alongside geometric shapes. Core logic lives in `frontend/features/whiteboard/` (`pencilStroke.ts`, `types.ts`, `serialize.ts`, canvas + sync).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Node.js](https://nodejs.org/) ≥ 18 and npm (for the frontend)
- Python 3.12 + pip (only if running the backend outside Docker)

---

## Environment Setup

The project uses three `.env` files. Copy each example and fill in the values.

### 1. Root `.env` — Docker Compose + PostgreSQL

```bash
cp .env.example .env
```

```env
# .env (root)
APP_NAME=API
DEBUG=false
BACKEND_PORT=8000

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_HOST_PORT=5433   # host-side port; change if 5433 is taken
```

### 2. `backend/.env.local` — Secrets (never commit)

```bash
cp backend/.env.example backend/.env.local
```

```env
# backend/.env.local
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

FRONTEND_URL=http://localhost:3000

# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
SESSION_SECRET_KEY=change-me-to-a-long-random-string
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRE_MINUTES=10080

# Local cookie defaults (production: COOKIE_SECURE=true, COOKIE_SAMESITE=none)
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

> **Safari / iPad note:** With the frontend on Vercel and API on Railway, Safari blocks cross-site cookies (ITP). The app falls back to a Bearer token in `sessionStorage` (guest login response body, Google OAuth hash) and passes it on HTTP + WebSocket. Cookies still work in Chrome. For a cleaner production setup, put both on the same site (e.g. `svigl.com` + `api.svigl.com`) and use `COOKIE_SAMESITE=lax`.

> **Google OAuth setup:** Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID. Add `http://localhost:8000/auth/google/callback` as an authorised redirect URI. For production, also add `https://<your-railway-host>/auth/google/callback`.

### 3. `frontend/.env.local`

```bash
cp frontend/.env.example frontend/.env.local
```

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Running the Dev Server

### Backend (Docker — recommended)

```bash
# 1. Start PostgreSQL + FastAPI with hot-reload
docker compose up --build
```

The API will be available at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

To stop:

```bash
docker compose down
```

To wipe the database volume as well:

```bash
docker compose down -v
```

---

### Database Migrations (Alembic)

Migrations must be run **after** the database container is healthy.

```bash
# Run inside the backend container
docker compose exec backend alembic upgrade head
```

Or, if running Python locally (outside Docker), from `backend/`:

```bash
# Ensure DATABASE_URL resolves to localhost (POSTGRES_HOST=localhost, POSTGRES_HOST_PORT=5433)
alembic upgrade head
```

To create a new migration after changing a model:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe your change"
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## All Commands at a Glance

```bash
# ── Docker ──────────────────────────────────────────────────
docker compose up --build          # start backend + postgres (hot-reload)
docker compose up -d               # start in background
docker compose down                # stop containers
docker compose down -v             # stop + delete postgres volume
docker compose logs -f backend     # stream backend logs

# ── Alembic (run inside container) ──────────────────────────
docker compose exec backend alembic upgrade head          # apply all migrations
docker compose exec backend alembic downgrade -1          # roll back one
docker compose exec backend alembic revision --autogenerate -m "msg"  # new migration
docker compose exec backend alembic history               # show migration history
docker compose exec backend alembic current               # show applied revision

# ── Frontend ────────────────────────────────────────────────
cd frontend
npm install          # install dependencies
npm run dev          # development server  → http://localhost:3000
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npm test             # Vitest unit tests
```

---

## Full Local Setup (step by step)

```bash
# 1. Clone
git clone <repo-url>
cd svigl

# 2. Create env files
cp .env.example .env
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local

# 3. Fill in backend/.env.local (Google OAuth credentials + secret keys)
#    See "Environment Setup" above.

# 4. Start Docker services
docker compose up --build

# 5. (New terminal) Apply DB migrations
docker compose exec backend alembic upgrade head

# 6. (New terminal) Start the frontend
cd frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 (host port) |

---

## Client State (Frontend)

Global UI state lives in two small stores under `frontend/stores/`:

| Store | Purpose |
|-------|---------|
| `session.ts` | Auth user, guest flag, display name, `authReady` bootstrap flag |
| `room.ts` | Active room snapshot + `localStorage` persistence for room code |

Both use a tiny in-house store helper (`frontend/lib/create-store.ts`) built on React’s `useSyncExternalStore` — no Zustand or other state library.

Feature modules under `frontend/features/` own domain UI (whiteboard, room game shell, gallery, landing, etc.). Shared chrome and primitives live in `frontend/components/`; HTTP/WS clients in `frontend/services/`.

---

## Production Deployment

| Service | Host | Notes |
|---------|------|-------|
| Frontend | [Vercel](https://vercel.com) | Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` at build time |
| Backend | [Railway](https://railway.app) | Docker build from `backend/`; set service root directory to `backend` |

### Railway (backend)

Required variables (see `backend/.env.example`):

- `FRONTEND_URL` — e.g. `https://svigl.vercel.app`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `SESSION_SECRET_KEY`
- `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, `DEBUG=false`
- `DATABASE_URL` — from Railway Postgres

**Networking:** public domain **target port must be `8080`** (matches `PORT` in `backend/Dockerfile`). A mismatch causes Railway 502 “Application failed to respond”.

Health check: `GET /health`

### Vercel (frontend)

```env
NEXT_PUBLIC_API_URL=https://<your-railway-host>
NEXT_PUBLIC_WS_URL=wss://<your-railway-host>
```

Redeploy after changing these (they are baked in at build time).

### Google Cloud Console

Add production redirect URI:

`https://<your-railway-host>/auth/google/callback`

Keep `http://localhost:8000/auth/google/callback` for local dev.
