# Credit Wallet frontend

React, TypeScript and Vite. Use Node.js 22.12+ or a supported newer release.

## Run locally

Prepare the backend's PostgreSQL database using its two SQL migrations in
`backend/db/migrations/` in filename order. Use the backend's existing local
environment configuration. The catalog reads the `products` table, so a fresh
database shows an empty catalog until this table contains product records.

In one terminal, from the repository root:

```sh
cd backend
npm ci
BETTER_AUTH_URL=http://localhost:5173 npm run dev
```

In a second terminal, from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to port 2111. The command-line
`BETTER_AUTH_URL` override lets Better Auth trust the browser origin served by
Vite. The same address is used by the backend's Stripe return URLs.

For a complete payment test, use the backend's Stripe test environment. Forward
events with `stripe listen --forward-to localhost:2111/api/webhooks/stripe` and
make sure the backend process uses that listener's signing secret as
`WEBHOOK_SECRET`. Keep Stripe and Better Auth secrets in the backend environment.

## Build

Run `npm run build` from this directory to type-check and build into `dist/`.
The Vite API proxy runs during local development.
