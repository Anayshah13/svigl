# Svigl Frontend

Next.js 16 app for the Svigl multiplayer drawing game.

## Setup

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL + NEXT_PUBLIC_WS_URL (optional: NEXT_PUBLIC_GA_MEASUREMENT_ID)
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
npm test         # Vitest unit tests
```

## Production

Set at build time (any host):

```env
NEXT_PUBLIC_API_URL=https://<your-api-host>
NEXT_PUBLIC_WS_URL=wss://<your-api-host>
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX          # optional
NEXT_PUBLIC_EMAILJS_SERVICE_ID=                     # optional (/feedback form)
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```

These are inlined into the public client bundle — never put a private key here. Rebuild after changing them.
