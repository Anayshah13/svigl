# Svigl

> A multiplayer SVG-based drawing and guessing game — frontend prototype.

Svigl is a web app inspired by Skribbl.io, except every drawing is built from editable SVG primitives instead of freehand raster strokes.

This repository is **frontend-only**. Rooms, drawing, and the gallery run entirely in the browser with local demo data — no backend or Docker required.

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What works locally

* Landing page — create or join a room with a display name
* Lobby — local room with a demo player; ready up and start
* Game — SVG drawing canvas (path, rectangle, circle), chat, and score UI
* Gallery — curated sample drawings
* Profile — demo stats when viewing sample authors (e.g. `/profile?user=Mira`)

---

## Technology stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js, TypeScript, Tailwind CSS, Framer Motion, Zustand |

---

## Repository structure

```text
svigl/
├── frontend/           # Next.js app
├── docs/               # Architecture and domain docs
└── README.md
```

---

## Scripts

From `frontend/`:

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

---

## Design docs

See [`docs/`](docs/) for architecture, state machines, and drawing model notes from the original full-stack design.
