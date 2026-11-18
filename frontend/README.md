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
BETTER_AUTH_URL=http://localhost:2111 npm run dev
```

In a second terminal, from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. The browser calls http://localhost:2111 directly by
default. Set `VITE_API_URL` in `frontend/.env.local` to use another API origin.
Set `CLIENT_URL` on the backend if the frontend origin differs from
http://localhost:5173.

For a complete payment test, use the backend's Stripe test environment. Forward
events with `stripe listen --forward-to localhost:2111/api/webhooks/stripe` and
make sure the backend process uses that listener's signing secret as
`WEBHOOK_SECRET`. Keep Stripe and Better Auth secrets in the backend environment.

## Build

Run `npm run build` from this directory to type-check and build into `dist/`.
Vite embeds `VITE_API_URL` at build time. Rebuild after changing it.

## Render

For a Static Site rooted at `frontend`, use `npm ci && npm run build` as the
build command and `dist` as the publish directory. Set these environment
variables to the public HTTPS origins of your services:

| Service | Variable | Example |
| --- | --- | --- |
| Frontend | `VITE_API_URL` | `https://api.example.com` |
| Backend | `CLIENT_URL` | `https://app.example.com` |
| Backend | `BETTER_AUTH_URL` | `https://api.example.com` |

Use URLs without an `/api` suffix. Keep `PG_STRING`, `BETTER_AUTH_SECRET`,
`STRIPE_SECRET_KEY`, and `WEBHOOK_SECRET` on the backend. Configure Stripe to
send events to `https://api.example.com/api/webhooks/stripe` and use that
endpoint's signing secret for `WEBHOOK_SECRET`.

Add a Static Site **Rewrite** from `/payment/*` to `/index.html` so Checkout
return paths load the React app. Requests to the API go directly to the
backend URL.

For cookie-based sign-in across browsers, use HTTPS subdomains of the same
custom domain, as in the examples. Separate `onrender.com` service URLs are
cross-site, so browser third-party cookie settings can block sign-in.
