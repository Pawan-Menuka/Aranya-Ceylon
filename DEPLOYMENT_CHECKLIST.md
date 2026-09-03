# Deployment Checklist — Aranya Ceylon — 2026-09-03

A launch-day runbook. This does not replace `SECURITY.md` (infra-layer controls,
organized by provider) or `README.md` (env var reference) — it pulls the
actionable subset of both into an order-of-operations checklist, plus two bugs
found while compiling it.

Status legend: `pending` | `done` | `skipped (reason)`

## Bugs found and fixed while compiling this

| # | Finding | Fix | Status |
|---|---|---|---|
| 1 | `.github/workflows/deploy.yml` set the CI env var `DIRECT_DATABASE_URL`, but nothing in the codebase reads that name — `prisma.config.ts`, `prisma/seed.ts`, and `prisma/seed-catalog.ts` all read `DIRECT_URL`. So the `prisma migrate deploy` step in CI silently fell back to the pooled `DATABASE_URL` for migrations instead of the intended direct (non-pgbouncer) connection — the exact failure mode `DIRECT_URL` exists to avoid. | Renamed the env key in `deploy.yml` to `DIRECT_URL` (still sourced from the same `secrets.DIRECT_DATABASE_URL` GitHub secret, so no secret needs to be renamed/re-added). | done |
| 2 | `backend/.env.example` had `FRONTEND_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `RESEND_API_KEY` each defined **twice**, with different placeholder text in each copy (apparent merge/paste debris). Real risk: someone filling in Railway env vars from this file could copy the wrong occurrence, or not notice the file even has two. | Deduped to one canonical definition per variable. | done |

## Pre-launch checklist (infra/manual — cannot be done from here)

Grouped in the order you'd actually work through them.

### 1. Database (Neon)
- [ ] Confirm PITR (point-in-time-restore) backup retention is enabled, window acceptable (SECURITY.md recommends ≥7 days).
- [ ] `DATABASE_URL` = pooled connection string; `DIRECT_URL` = the non-pooled endpoint (no `-pooler` host) — required for `prisma migrate deploy` to run correctly (see bug #1 above).
- [ ] Run `prisma migrate deploy` against production once secrets are set; review `backend/prisma/migrations/**/migration.sql` for the hand-written raw-SQL ones first (README flags these explicitly — full-text search, CHECK constraints, index cleanup).

### 2. Backend secrets (Railway or wherever it's hosted)
Set every variable from `backend/.env.example`. The app **fails to boot** if a required one is missing/invalid in production (`backend/src/config/env.ts`) — this is by design, not a bug to work around.
- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET`, `COOKIE_SECRET` — each ≥32 random chars (`openssl rand -hex 32`). A short/default value here is a forgeable-token / market-price-forgery hole, not just a lint warning.
- [ ] `ENABLE_DEV_ROUTES` unset or `false` — boot refuses to start if `true` in production, but don't rely on that; just don't set it.
- [ ] `PAYMENTS_MODE=live` — **only** once real Stripe + PayHere keys are in place below. Boot refuses `stub` mode in production (would let anyone mark orders PAID for free).
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — live-mode keys from the Stripe dashboard.
- [ ] `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_MODE=live` — from the PayHere merchant portal.
- [ ] `API_URL` — the real public API origin (e.g. `https://api.aranyaceylon.com`). Required when `PAYMENTS_MODE=live`; it builds the PayHere `notify_url` — wrong/unset means PayHere webhooks go nowhere and orders never confirm.
- [ ] `FRONTEND_URL` — the real storefront origin(s), comma-separated if more than one. This is the CORS allow-list, not cosmetic.
- [ ] `TRUST_PROXY` / `TRUST_CLOUDFLARE` — see the Cloudflare section below; get this wrong and rate limiting + audit-log IPs key on a proxy's IP instead of the real client.
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — admin product-image upload silently fails without these (not covered by the fail-fast boot check, since it's not security-critical — but it is functionally required for the admin console's image upload to work at all).
- [ ] `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `SUPPORT_EMAIL` — low-stock alerts and contact/wholesale form notifications depend on these.
- [ ] `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` — set a real password before running the production seed; no insecure default ships when `NODE_ENV=production`.
- [ ] `REVALIDATION_SECRET` — same value here and in the frontend's env (below). Degrades gracefully if missing (ISR just falls back to its normal revalidate interval), so not launch-blocking, but worth setting.
- [ ] `LKR_USD_RATE` / `LOW_STOCK_THRESHOLD` — keep numerically equal to the frontend's `NEXT_PUBLIC_LKR_USD_RATE` / `NEXT_PUBLIC_LOW_STOCK_THRESHOLD` so admin figures agree between the two apps.

### 3. Frontend secrets (`aranya-next`, wherever it's hosted)
- [ ] `NEXT_PUBLIC_API_URL` → real API origin.
- [ ] `NEXT_PUBLIC_SITE_URL` → real storefront origin (canonical URLs, sitemap, OG tags).
- [ ] `NEXT_PUBLIC_ENABLE_DEMO` → unset or `false`. Leaving this `true` in production lets anyone into the admin console via the offline demo session when the backend is unreachable.
- [ ] `REVALIDATION_SECRET` → same value as the backend's.
- [ ] `NEXT_PUBLIC_LKR_USD_RATE` / `NEXT_PUBLIC_LOW_STOCK_THRESHOLD` → match backend values (see above).
- [ ] Deploy frontend + API on the **same parent domain** (e.g. `aranyaceylon.com` + `api.aranyaceylon.com`) — the refresh-token cookie is `sameSite=lax` and this is required for it to flow correctly (`aranya-next/README.md`).

### 4. Cloudflare (recommended front-door, per `SECURITY.md`)
- [ ] Proxy both the storefront and API hostnames (orange-cloud DNS).
- [ ] Enable the WAF Managed Ruleset (OWASP core) on both.
- [ ] Bot Fight Mode on; add a rate-limiting rule on `/auth/*` and `/checkout/*` as a network-layer backstop to the in-app limiters.
- [ ] SSL/TLS mode = "Full (strict)".
- [ ] Lock the origin to only accept Cloudflare traffic (so `CF-Connecting-IP` can't be spoofed by hitting the origin directly), then set `TRUST_CLOUDFLARE=true` and `TRUST_PROXY=2` in the backend env (Railway hop + Cloudflare hop). Skipping the origin-lock while setting `TRUST_CLOUDFLARE=true` is worse than not setting it — it lets a direct-to-origin request spoof any client IP.

### 5. CI/CD
- [x] `deploy.yml` env var name fixed (bug #1 above) — verify a real deploy actually applies migrations via the direct connection, not just that CI goes green.
- [ ] Confirm which branch triggers `deploy.yml` (`main`) is actually the one you intend to ship from — `Develop` is the active-work branch per this repo's `CLAUDE.md`; the current flow appears to be periodic `Develop → main` merge PRs to trigger deploys (confirmed: `origin/main` currently sits at a merge of `Develop`). If that's intentional, no action needed — just confirming it's a deliberate release gate, not an accident.
- [ ] `pnpm audit --audit-level=high` is report-only in CI (`|| true`) — this is documented as intentional (transitive Prisma tooling deps), but worth a manual skim before launch in case a new high/critical advisory landed outside that known set.

### 6. Monitoring
- [ ] Wire `/health` into an uptime monitor (Better Stack, UptimeRobot, etc.).
- [ ] Ship stdout logs to a log drain with alerting on error-rate spikes — currently `console.error`-only, no retention.
- [ ] Consider Sentry or similar before launch if budget allows — not currently wired anywhere (noted as a gap in `KNOWN_ISSUES.md`'s roadmap, still true).

## What's already handled in code (verified, not re-litigated here)

Pulled from `SECURITY.md` + `backend/src/config/env.ts` — listed so this checklist doesn't duplicate work already done:
- Fail-fast env validation at boot (missing secrets, short JWT/cookie secrets, stub-mode-in-production, dev-routes-in-production, live-mode-without-keys) — `backend/src/config/env.ts`.
- Webhook signature verification (Stripe + PayHere, PayHere now constant-time as of the storefront audit), idempotent payment confirmation, atomic oversell-proof stock decrement.
- Rate limiting (global + auth/checkout/contact-specific), refresh-token rotation with reuse detection, IDOR-guarded order lookups, security headers (CSP/HSTS/etc. on both apps).
- Admin RBAC, immutable audit log.

## Not addressed here (deliberately out of scope for this pass)

- Horizontal scaling / leader election for cron jobs — only matters once running >1 backend instance; `index.ts` already has a comment flagging it for that point.
- Transactional order-confirmation emails — infrastructure (Resend) is wired for other emails, but the order-confirmation send itself isn't built yet. Separate task if wanted.
