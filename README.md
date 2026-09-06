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
| Infrastructure | Docker, Docker Compose (local); any Linux host / container for production |
| Tests | Vitest (frontend), pytest (backend) |

---

## Repository Structure

```
svigl/
├── backend/                 # FastAPI app (Python 3.12)
│   ├── app/
│   │   ├── api/             # HTTP routes (auth, rooms, gallery, labs, games, users, session, …)
│   │   ├── auth/            # Google OAuth, JWT, cookies, guests
│   │   ├── data/            # Static data (e.g. words.json)
│   │   ├── db/              # Engine / session
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Game, room, canvas, drawings, labs, replay, …
│   │   └── websocket/       # Connection / room managers + handlers
│   ├── alembic/             # DB migrations
│   ├── scripts/
│   ├── tests/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── .env.local           # ← create this (never commit)
├── frontend/                # Next.js app (feature-oriented)
│   ├── app/                 # App Router pages (see routes below)
│   ├── features/            # Domain UI + logic
│   │   ├── whiteboard/      # SVG canvas, tools, sync, history
│   │   ├── room/            # Lobby + in-game shell
│   │   ├── landing/
│   │   ├── gallery/
│   │   ├── labs/            # Precision drawing challenges
│   │   ├── legal/           # Privacy Policy + Terms
│   │   ├── replay/
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

### Public routes

| Path | Page |
|------|------|
| `/` | Landing |
| `/sign-in` | Google OAuth + guest sign-in |
| `/room/[code]` | Multiplayer lobby + game |
| `/gallery` | Saved drawings + replay |
| `/labs` | Precision drawing challenges + leaderboards |
| `/profile`, `/profile/[username]` | Player profiles |
| `/feedback` | Feedback form |
| `/policies` | Privacy Policy |
| `/termsandconditions` | Terms & Conditions |
| `/demo` | Offline demo game |

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
- [Node.js](https://nodejs.org/) ≥ 20.9 and npm (Next.js 16)
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
DEBUG=true
BACKEND_PORT=8000

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_HOST_PORT=5433   # host-side port; change if 5433 is taken

# Local cookie defaults (production: COOKIE_SECURE=true, COOKIE_SAMESITE=none)
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
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

# Optional: extra CORS origins in addition to FRONTEND_URL
# CORS_ORIGINS=http://localhost:3000,https://staging.example.com
```

> **Safari / iPad note:** When the frontend and API are on different sites, Safari may block cross-site cookies (ITP). The app falls back to a Bearer token in `sessionStorage` (guest login response body, Google OAuth hash) and passes it on HTTP + WebSocket. Cookies still work in Chrome. For a cleaner production setup, put both on the same site (e.g. `app.example.com` + `api.example.com`) and use `COOKIE_SAMESITE=lax`.

> **Google OAuth setup:** Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID. Add `http://localhost:8000/auth/google/callback` as an authorised redirect URI. For production, also add `https://<your-api-host>/auth/google/callback`.

### 3. `frontend/.env.local`

```bash
cp frontend/.env.example frontend/.env.local
```

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Optional — leave unset locally to disable analytics
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional — EmailJS credentials for the /feedback form (unset disables it)
# NEXT_PUBLIC_EMAILJS_SERVICE_ID=
# NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
# NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
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

# ── Backend tests ───────────────────────────────────────────
cd backend
pytest               # requires pytest installed in the local Python env
```

---

## Full Local Setup (step by step)

```bash
# 1. Clone
git clone https://github.com/Anayshah13/svigl.git
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

Feature modules under `frontend/features/` own domain UI (whiteboard, room game shell, gallery, labs, legal, replay, landing, etc.). Shared chrome and primitives live in `frontend/components/`; HTTP/WS clients in `frontend/services/`.

---

## Production Deployment

Hosting-agnostic: configure via environment variables, then run the usual process managers / reverse proxies for your host.

### Backend (FastAPI)

From `backend/` (with a virtualenv and dependencies installed):

```bash
# migrations
alembic upgrade head

# serve (PORT defaults to 8000 if unset)
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers
```

Or use the container image built from `backend/Dockerfile` (entrypoint runs migrations, then uvicorn). Listen port is controlled by `PORT`.

Required variables (see `backend/.env.example`):

- `FRONTEND_URL` — live site origin, e.g. `https://svigl.com` (also the primary CORS origin)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `SESSION_SECRET_KEY`
- `COOKIE_SECURE`, `COOKIE_SAMESITE`, `DEBUG=false`
- `DATABASE_URL` — e.g. `postgresql://user:pass@host:5432/dbname`
- `CORS_ORIGINS` — optional comma-separated extra origins (preview/staging)

Health check: `GET /health`

### Frontend (Next.js)

From `frontend/`:

```bash
npm run build
npm start
```

Set at **build** time:

```env
NEXT_PUBLIC_API_URL=https://<your-api-host>
NEXT_PUBLIC_WS_URL=wss://<your-api-host>
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX   # optional; omit to disable analytics

# Optional — EmailJS for the /feedback form; omit to disable it
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```

These values are inlined into the public client bundle — never put a private key here. Rebuild after changing them.

### Google Cloud Console

Add production redirect URI:

`https://<your-api-host>/auth/google/callback`

Keep `http://localhost:8000/auth/google/callback` for local dev.
