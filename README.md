# Aranya Ceylon 🎋

Premium Ceylon spice e-commerce platform with a **dual-market** design: a local
Sri Lankan store (LKR, paid via PayHere) and an international store (USD, paid
via Stripe), served from one catalog and one API.

## Stack

- **Backend:** Node + Express + TypeScript, Prisma 7 (PostgreSQL / Neon), `jose` JWTs,
  bcrypt, Stripe + PayHere, Resend (email), node-cron.
- **Shared:** `@aranya/shared` — Zod schemas/types shared between backend and frontend.
- **Frontend:** `aranya-next/` — production Next.js 14 (App Router) + TypeScript storefront,
  talking to the API through a same-origin BFF proxy (`src/app/api/[...path]/route.ts`).
- **Tooling:** pnpm workspaces, Vitest, Playwright, ESLint (flat config), GitHub Actions CI.

## Monorepo layout

```
backend/      Express API, Prisma schema + migrations, cron jobs, services
shared/       Zod schemas and types (built to dist/, consumed by backend & frontend)
aranya-next/  Next.js storefront + admin console (see aranya-next/README.md)
docs/         Audits, test plans, operational notes, and design references
```

## Prerequisites

- Node ≥ 20 and pnpm ≥ 9 (pnpm is the only supported package manager)
- A Neon PostgreSQL database for production
- Docker, when running the PostgreSQL integration suite locally

Production uses Neon's serverless driver with `@prisma/adapter-neon`. Local and
CI integration tests deliberately use the standard `pg` driver through
`@prisma/adapter-pg` so concurrency behavior is proven against real PostgreSQL.

## Setup

```bash
pnpm install
pnpm --filter @aranya/shared build          # shared must be built before backend typechecks
cp backend/.env.example backend/.env         # then fill in the values below
pnpm --filter @aranya/backend exec prisma generate
pnpm --filter @aranya/backend exec prisma migrate deploy
pnpm dev:backend                             # http://localhost:4000
```

Seed a demo catalog (dev only — requires `ENABLE_DEV_ROUTES=true`):

```bash
pnpm --filter @aranya/backend run seed:catalog
# or POST /dev/seed-catalog while the server is running
```

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (production Neon URLs use `sslmode=require`) |
| `DATABASE_ADAPTER` | `neon` for production; `pg` for local/CI integration tests |
| `JWT_ACCESS_SECRET` | Secret for signing short-lived access tokens (refresh tokens are opaque, not JWTs) |
| `COOKIE_SECRET` | Secret for the signed `x-market` cookie |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated; also used in payment redirects |
| `API_URL` | Public API base URL (used in PayHere `notify_url`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe (international market) |
| `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_MODE` | PayHere (local market) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `LOW_STOCK_THRESHOLD` | Low-stock alert threshold (default 10) |
| `ENABLE_DEV_ROUTES` | `true` enables `POST /dev/seed-catalog`. **Never set in production.** |
| `NODE_ENV` | Runtime mode: `development`, `test`, or `production` |

## Scripts (run from the repo root)

| Command | Description |
|---|---|
| `pnpm dev:backend` | Start the API with hot reload |
| `pnpm build:backend` | Compile the backend to `dist/` |
| `pnpm typecheck` | Typecheck all workspaces |
| `pnpm lint` | Lint all workspaces |
| `pnpm test:unit` | Run backend unit tests with mocked dependencies |
| `pnpm test:integration` | Run backend integration tests against PostgreSQL |
| `pnpm test:e2e` | Run the Playwright checkout suite in Chromium |
| `pnpm build` | Build every workspace |

## Testing

The repository has three intentionally separate test layers:

1. **Unit tests** use Vitest and mocked dependencies. They are fast, but do not
   claim to prove database locking or transaction behavior.
2. **Integration tests** use Prisma with `@prisma/adapter-pg` against a dedicated
   PostgreSQL database. They prove checkout stock concurrency and webhook
   idempotency using real database transactions.
3. **Browser tests** use Playwright with Chromium. They exercise checkout
   validation, the stub-payment success path, cart clearing, and insufficient
   stock while deterministically intercepting the storefront BFF.

Run the unit suite:

```bash
pnpm test:unit
```

Run the PostgreSQL integration suite:

```bash
docker compose -f compose.integration.yml up -d --wait
export DATABASE_URL=postgresql://aranya:aranya_test@localhost:55432/aranya_integration
export DIRECT_URL="$DATABASE_URL"
export DATABASE_ADAPTER=pg
pnpm --filter @aranya/backend exec prisma migrate deploy
pnpm test:integration
docker compose -f compose.integration.yml down
```

The explicit migration environment above and the integration test configuration
both target a database whose name contains `integration`; the cleanup helper
refuses to truncate any other database. See
[`backend/src/test/integration/README.md`](backend/src/test/integration/README.md)
for explicit environment-variable setup.

Run the browser suite:

```bash
pnpm --filter aranya-ceylon-storefront exec playwright install chromium
pnpm test:e2e
```

## Database migrations

Migrations live in `backend/prisma/migrations`. Apply them with:

```bash
pnpm --filter @aranya/backend exec prisma migrate deploy
```

Some migrations are hand-written raw SQL (full-text search, CHECK constraints,
index cleanup). Review `migration.sql` before deploying to production.

## Notes

- **Money** is computed in integer cents end-to-end to avoid float drift; `Decimal`
  columns store 2dp values.
- **Refresh tokens** are opaque random strings stored hashed (SHA-256); only access
  tokens are JWTs.
- **Cron jobs** currently run in every instance — gate them behind leader election
  before scaling horizontally (see `src/index.ts`).
- See [`docs/README.md`](docs/README.md) for the documentation index and
  [`docs/operations/known-issues.md`](docs/operations/known-issues.md) for the
  historical audit log.
