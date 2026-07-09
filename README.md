# Svigl

> A multiplayer SVG-based drawing and guessing game — think Skribbl.io, but every drawing is built from editable SVG primitives instead of freehand raster strokes.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Zustand |
| Backend | FastAPI, SQLAlchemy 2, Alembic, PyJWT, Authlib |
| Database | PostgreSQL 17 |
| Auth | Google OAuth 2.0 + JWT session cookies |
| Infrastructure | Docker, Docker Compose |

---

## Repository Structure

```
svigl/
├── backend/            # FastAPI app (Python 3.12)
│   ├── app/            # Application source
│   ├── alembic/        # DB migrations
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example    # Root-level env vars template
│   └── .env.local      # ← create this (never commit)
├── frontend/           # Next.js app
│   ├── app/
│   ├── components/
│   ├── .env.example
│   └── .env.local      # ← create this (never commit)
├── docs/               # Architecture and domain docs
├── .env.example        # Docker Compose env template
├── .env                # ← create this (never commit)
└── docker-compose.yml
```

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

## Design Docs

See [`docs/`](docs/) for architecture, state machines, and drawing model notes.
