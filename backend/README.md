# Backend (realtime proxy)

This folder is where the backend will live (proxy + cache for real NJ Transit realtime feeds).

## Environment setup

1. Copy the template:

```bash
cp backend/env.example backend/.env
```

2. Edit `backend/.env` and set:
- `NJT_ENV` (`test` or `prod`)
- `NJT_USERNAME` / `NJT_PASSWORD` (from the NJT developer portal)

Notes:
- `backend/.env` is **ignored by git**.
- Backend reads env vars from `process.env` (see `backend/src/env.ts`).

## Running (dev)

In one terminal:

```bash
npm run backend:dev
```

In another terminal:

```bash
npm run dev
```

Vite is configured to proxy `/api/*` to the backend on `http://localhost:8787`.

