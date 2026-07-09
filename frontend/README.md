# Svigl Frontend

Next.js 16 app for the Svigl multiplayer drawing game.

## Setup

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL + NEXT_PUBLIC_WS_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full repo setup (Docker backend, env files, production deploy) is in the [root README](../README.md).

## Client state

No external state library. Two stores under `stores/`:

- **`session.ts`** — auth user, guest flag, display name, bootstrap ready flag
- **`room.ts`** — active room + persisted room code in `localStorage`

Both are backed by `lib/create-store.ts` (React `useSyncExternalStore`).

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Production (Vercel)

Set at build time:

```env
NEXT_PUBLIC_API_URL=https://<your-railway-host>
NEXT_PUBLIC_WS_URL=wss://<your-railway-host>
```

Redeploy after changing env vars.
