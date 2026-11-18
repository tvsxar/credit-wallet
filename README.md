# Credit Wallet — Stripe Payment Lab

A full-stack credit wallet application built with React, TypeScript, Node.js, Express, PostgreSQL, Better Auth, and Stripe Checkout.

Credit Wallet lets users purchase credit packs, check their balance, and view their transaction history through a simple interface.

The project focuses on backend architecture, relational database design, payment processing, and production-oriented engineering practices, including automated testing, containerization, CI, and deployment.

## Live Demo

**Live Application:** [Credit Wallet](https://credit-wallet.vercel.app/)

## Features

- Register and sign in using an email and password
- Browse available credit packs
- Access a welcome offer before the first paid order
- Purchase credits through Stripe Checkout
- Track the current credit balance
- View paginated wallet transaction history
- Process successful and expired checkout sessions
- Prevent duplicate credits when Stripe retries an event
- Responsive user interface

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS

**Backend**
- Node.js
- Express.js
- TypeScript
- Better Auth
- Stripe Checkout
- PostgreSQL
- node-postgres

**Testing**
- Vitest
- Supertest

**DevOps & Deployment**
- Docker
- Docker Compose
- GitHub Actions
- Vercel
- Render
- Neon PostgreSQL

## Architecture

Credit Wallet uses a separated frontend/backend architecture with a relational PostgreSQL database.

```text
┌───────────────────────────┐
│          Browser          │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│     React + TypeScript    │
│           Vercel          │
└─────────────┬─────────────┘
              │ HTTPS / REST API
              ▼
┌───────────────────────────┐     ┌───────────────────────┐
│   Node.js + Express API   │◄────│    Stripe Checkout    │
│           Render          │     │    Signed Webhooks    │
├───────────────────────────┤     └───────────────────────┘
│       Business Logic      │
│       node-postgres       │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│      Neon PostgreSQL      │
└───────────────────────────┘
```

The frontend communicates with the backend through a REST API. Better Auth manages user sessions.

The backend reads the product price and credit amount from the database, creates an order, and opens a Stripe Checkout session. After payment, Stripe sends a signed webhook. The backend verifies the signature, payment status, currency, and amount before updating the order, payment, and wallet in a single database transaction.

## Database Design

Credit Wallet uses a relational database designed around products, orders, payments, and wallet transactions.

**Products**
- Unique product identifier and SKU
- Product name
- Price in cents
- Number of credits

**Orders**
- User and product references
- Purchase amount and credits at the time of ordering
- Order status

**Payments**
- Order reference
- Unique Stripe Checkout session identifier
- Payment amount and status

**Wallet Transactions**
- User reference
- Order reference for purchased credits
- Transaction type (IN or OUT)
- Credit amount and timestamp

### Relationships

```text
                ┌─────────────────────┐
                │       products      │
                └──────────┬──────────┘
                           │ 1:N
                           ▼
                ┌─────────────────────┐
                │        orders       │
                └───┬─────────────┬───┘
                    │ 1:N         │ 1:0..1
                    ▼             ▼
           ┌────────────────┐  ┌───────────────────────┐
           │    payments    │  │  wallet_transactions  │
           └────────────────┘  └───────────────────────┘
```

Each order belongs to a user and references a product. A paid order can have one credit entry in the wallet ledger. PostgreSQL enforces this constraint so Stripe retries cannot add a duplicate entry.

### Balance Calculation

Credit balances are calculated from recorded wallet transactions.

```text
Current Balance = Total IN - Total OUT
```

For example:

```text
First purchase    +100
Second purchase   +100
----------------------
Balance            200
```

## Testing

Backend integration tests use **Vitest** and **Supertest** with a dedicated PostgreSQL test database.

The tests cover:

- Database connectivity
- Order creation and validation
- Successful and expired Stripe Checkout events
- Duplicate webhook delivery and payment transaction safety

The frontend is checked through TypeScript validation and a Vite production build.

## Docker

The backend has a Dockerfile for building the Express API image.

Docker Compose provides a PostgreSQL test database:

```bash
cd backend
docker compose -f docker-compose.test.yml up -d
```

Set `TEST_DB_PASSWORD` before starting the container. Apply the SQL migrations to the test database and set `TEST_PG_STRING` before running `npm test`.

## CI

Credit Wallet uses **GitHub Actions** for continuous integration. Pushes to `main` and pull requests targeting `main` trigger two independent jobs.

```text
                  Push / Pull Request
                           │
                           ▼
                 ┌───────────────────┐
                 │   GitHub Actions  │
                 └─────────┬─────────┘
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
  ┌───────────────────┐         ┌───────────────────┐
  │     Backend CI    │         │    Frontend CI    │
  ├───────────────────┤         ├───────────────────┤
  │   SQL Migrations  │         │  TypeScript Check │
  │   Backend Tests   │         │  Production Build │
  │  TypeScript Build │         └───────────────────┘
  │    Docker Build   │
  └───────────────────┘
```

## Deployment

**Frontend**

The React application is built with Vite and deployed on Vercel. Set `VITE_API_URL` to the public API origin before building. Vercel rewrites `/payment/success` and `/payment/cancel` to `/index.html` so React can handle the return from Stripe.

**Backend**

The Express API runs on Render. Set `CLIENT_URL` to the frontend origin and `BETTER_AUTH_URL` to the API origin. Configure Stripe to deliver `checkout.session.completed` and `checkout.session.expired` to `/api/webhooks/stripe`, and set `WEBHOOK_SECRET` to the deployed endpoint's signing secret.

**Database**

PostgreSQL is hosted on Neon. Automated tests use a separate database.

## Getting Started

### Prerequisites

- Node.js 22.12+ and npm
- PostgreSQL
- Stripe test-mode credentials for checkout
- Docker and Docker Compose for the PostgreSQL test service

### Manual Development

Clone the repository:

```bash
git clone https://github.com/tvsxar/credit-wallet.git
cd credit-wallet
```

Create a development database and apply the [SQL migrations](backend/db/migrations/) in filename order. Add product records to the development database to try checkout.

Configure `backend/.env`:

```env
PG_STRING=postgresql://USER:PASSWORD@localhost:5432/credit_wallet
BETTER_AUTH_URL=http://localhost:2111
BETTER_AUTH_SECRET=your_local_auth_secret
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
WEBHOOK_SECRET=whsec_...
```

For local payment testing, run the Stripe listener and use the signing secret it prints as `WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:2111/api/webhooks/stripe
```

Install backend dependencies and start the API:

```bash
cd backend
npm ci
npm run dev
```

Install frontend dependencies in another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. The frontend uses http://localhost:2111 by default. Set `VITE_API_URL` without the `/api` suffix to use a different API origin.

## Project Structure

```text
credit-wallet/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── db/
│   │   └── migrations/
│   ├── src/
│   │   ├── controllers/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── services/
│   ├── tests/
│   ├── Dockerfile
│   └── docker-compose.test.yml
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   └── types/
│   └── vite.config.ts
└── README.md
```

## API

Main API resources:

```text
/api/auth/*                   Registration, sign-in, and sessions
GET  /api/products            Available credit packs
POST /api/orders              Create an order and open Stripe Checkout
GET  /api/wallet/balance      Current credit balance
GET  /api/wallet/transactions Paginated wallet history
POST /api/webhooks/stripe     Stripe payment events
GET  /api/health              Service health check
```

## Author

**Taras Poiatsyka**

[GitHub](https://github.com/tvsxar) | [Portfolio](https://taras-portfolio-theta.vercel.app)
