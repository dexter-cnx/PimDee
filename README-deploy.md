# PimDee - พิมพ์ดี | Deploy Guide

## Storage Adapter

PimDee runs without a backend by default.

- `src/adapters/stats-adapter.ts` - contract
- `src/adapters/local-adapter.ts` - default, offline-capable LocalStorage implementation
- `src/adapters/firebase-adapter.ts` - Firebase stub for a later phase
- `src/adapters/supabase-adapter.ts` - Supabase stub for a later phase

Select with `.env`:

```env
VITE_ADAPTER=local
```

Accepted values: `local`, `firebase`, `supabase`.

## Install and verify

```bash
npm install
npm run build
```

## GitHub Pages

`vite.config.ts` already uses:

```ts
base: '/PimDee/'
```

The repository deploy target is:

`https://dexter-cnx.github.io/PimDee/`

Manual deploy:

```bash
npm run deploy
```

For GitHub Actions deployment, configure Pages to use GitHub Actions and add a workflow that runs `npm ci`, `npm run build`, then publishes `dist/`.

## Firebase / Supabase later

Do not put service-role or server secrets in Vite environment variables. Only browser-safe public configuration belongs in `VITE_*` values. The Firebase and Supabase adapters are intentionally stubs until Auth/Cloud Sync phases.
