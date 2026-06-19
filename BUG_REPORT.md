# Aranya Ceylon — Codebase Audit & Bug Report

**Date:** 2026-06-19
**Audited branch:** `phase1-Checkout` (commit `a9bda6e`) — the active development branch,
6 commits ahead of `main` (Phase 0–3 backend integration + Stripe Elements).
**Scope:** `backend/` (Express API), `shared/` (Zod schemas), and `aranya-next/`
(the **canonical** Next.js storefront + admin console). The retired `frontend/` and
`frontend-legacy/` directories were removed as part of this pass (see Cleanup, below).

The backend is well-engineered and has been through prior security passes (see the `#NN`
issue refs and `KNOWN_ISSUES.md`). Findings below are what remains or was introduced since.

**Severity:** Critical = exploitable / money-loss in a normal deploy · High = serious
correctness/security gap · Medium = wrong behavior or maintainability risk · Low = polish / dead code.

---

## Critical

### C1. Missing-secret fallback signs JWTs and the market cookie with the literal string `"undefined"`
- **Files:** [backend/src/lib/jwt.ts:4](backend/src/lib/jwt.ts), [backend/src/middleware/market.ts:4](backend/src/middleware/market.ts)
- **Problem:** The signing key is built as `new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)`
  (and `COOKIE_SECRET!`). The `!` is TypeScript-only; at runtime, if the var is unset,
  `TextEncoder.encode(undefined)` coerces to the **9-byte string `"undefined"`**. There is no
  startup env validation, so the server boots with a **publicly-known HMAC key**. An attacker can
  forge an access token with `role:"SUPERADMIN"` (full admin takeover via `requireRole`) and forge
  the signed `x-market` cookie. The same `process.env.X!` pattern in `stripe.service.ts:30`,
  `payhere.service.ts:3-4`, `email.service.ts`, and `cloudinary.service.ts` turns missing values
  into cryptic deep-stack errors instead of failing fast.
- **Fix:** Add a fail-fast env-validation module loaded first in `index.ts` (e.g. a Zod
  `process.env` schema) that throws on any missing/short secret. Never rely on `!` for runtime safety.

---

## High

### H1. Stub payment mode is the default and fails open — orders can be marked PAID without paying
- **Files:** [backend/src/controllers/checkout.controller.ts:15](backend/src/controllers/checkout.controller.ts) (`isStubPayments = () => process.env.PAYMENTS_MODE !== 'live'`), `stubComplete` at [:186](backend/src/controllers/checkout.controller.ts), route at [backend/src/routes/checkout.routes.ts:13](backend/src/routes/checkout.routes.ts)
- **Problem:** Stub mode is the **default** (anything other than `PAYMENTS_MODE=live`). In stub mode
  `POST /checkout/stub/complete` runs under `optionalAuth` (no authentication) and flips **any** order
  to `PAID` via `confirmOrderPaid` given only its `orderId`. Deploy without explicitly setting
  `PAYMENTS_MODE=live` and the store ships product for free; anyone with an order id can complete
  others' orders.
- **Fix:** Fail closed: when `NODE_ENV !== 'development'` and `PAYMENTS_MODE !== 'live'`, refuse to
  boot (or 404 the stub route). At minimum gate the stub route behind `ENABLE_DEV_ROUTES`, as
  `/dev/seed-catalog` already is.

### H2. Sign-up never establishes a session (frontend/backend contract mismatch)
- **Files:** [aranya-next/src/lib/api/auth.ts:27-31](aranya-next/src/lib/api/auth.ts) (`register` returns `data.user`), [aranya-next/src/components/AuthContext.tsx:86-100](aranya-next/src/components/AuthContext.tsx) (`signUp` does `setUser(u)`), backend [auth.controller.ts:35-63](backend/src/controllers/auth.controller.ts)
- **Problem:** Backend `register` intentionally returns only `{ message }` — **no `accessToken`, no
  `user`** (the design is register-then-login, plus future email verification). But the frontend
  `register()` reads `data.user` (→ `undefined`) and `AuthContext.signUp` calls `setUser(undefined)`.
  Result: registration returns 201, the UI treats it as success, yet **no session is created and
  `user` stays null** — the shopper is silently not signed in after "creating" an account.
- **Fix:** After a successful `register`, call `login` with the same credentials (or have the backend
  issue a session on register if that's the intended UX), then `setUser` the real user. Surface the
  "verify your email" state explicitly rather than faking a logged-in session.

### H3. Stripe/PayHere webhook handlers are not wrapped — a DB error yields a hung request, no ack
- **Files:** [backend/src/routes/webhook.routes.ts:8-19](backend/src/routes/webhook.routes.ts) (handlers mounted bare — every other route uses `asyncHandler`), handlers in [webhook.controller.ts](backend/src/controllers/webhook.controller.ts) (`stripeWebhook` awaits `confirmOrderPaid` with no try/catch; same for `payHereWebhook`)
- **Problem:** These are `async` but mounted without `asyncHandler`. If an awaited Prisma call rejects
  (transient DB error during the payment-confirmation transaction), the rejection is **not** forwarded
  to Express's error handler (Express 4 doesn't catch async rejections). No HTTP response is sent — the
  gateway sees a timeout and retries, and the process logs an unhandled rejection. The transaction
  itself rolls back safely, but the gateway never gets the `200`/`OK` it requires.
- **Fix:** Wrap both in `asyncHandler`, or add an internal `try/catch` returning a `500` so the gateway
  gets a definitive (retriable) response.

---

## Medium

### M1. Checkout shows a total that differs from the amount actually charged (hardcoded client shipping)
- **Files:** [aranya-next/src/components/checkout/CheckoutClient.tsx:339,514](aranya-next/src/components/checkout/CheckoutClient.tsx) (`expressFee = market === "local" ? 1500 : 18`) vs backend rates in [backend/src/services/cart.service.ts:12-21](backend/src/services/cart.service.ts) (`EXPRESS` = 1299 ¢ = **$12.99**; `LOCAL EXPRESS` = 65000 ¢ = **Rs 650**)
- **Problem:** The client computes and displays the order total from **hardcoded** shipping fees
  (`$18` / `Rs 1,500`) that disagree with the backend's authoritative express rates (`$12.99` /
  `Rs 650`). The confirmation screen ([:574](aranya-next/src/components/checkout/CheckoutClient.tsx))
  shows the client total, so the customer sees a different figure from what the gateway charges. (The
  charge itself is correct/server-side — this is a trust/UX correctness bug, not a money leak.)
- **Fix:** Source shipping rates from the backend (return them on `create-intent` / a cart-totals
  endpoint) instead of hardcoding them in the client; render the total the server computed.

### M2. Stripe payment screen always shows "standard" shipping in the summary
- **File:** [aranya-next/src/components/checkout/CheckoutClient.tsx:395](aranya-next/src/components/checkout/CheckoutClient.tsx) — `<OrderSummary deliv="standard" .../>` is hardcoded.
- **Problem:** When the shopper picked **express** and proceeds to the Stripe Elements screen, the
  order summary reverts to standard shipping/total, contradicting what they selected a step earlier.
- **Fix:** Pass the selected `deliv` through to `StripePaymentScreen`/`OrderSummary`.

### M3. Product "sort by price" actually sorts by number of variants
- **File:** [backend/src/services/product.service.ts:165-172](backend/src/services/product.service.ts)
- **Problem:** `price_asc`/`price_desc` map to `{ variants: { _count: 'asc'|'desc' } }` — they order by
  how many variants a product has, not by price. "Price: low to high" returns an essentially random order.
- **Fix:** Order by the product's minimum (market-filtered) variant price via a raw query, or
  denormalize `minPrice` onto `Product` and sort on that.

### M4. Full-text search discards relevance ranking
- **File:** [backend/src/services/product.service.ts:147-161](backend/src/services/product.service.ts)
- **Problem:** The raw query selects ids ordered by `ts_rank(...) DESC`, then re-fetches with
  `findMany({ where: { id: { in: ids } } })`, which returns rows in the DB's default order — the
  ranking is thrown away. Search also bypasses cursor pagination.
- **Fix:** Re-order the fetched items to match the ranked `ids` array (position map), or select all
  needed columns directly in the ranked SQL.

### M5. `featured` query filter coerces `false` to `true`
- **File:** [shared/src/schemas/product.schema.ts:46](shared/src/schemas/product.schema.ts)
- **Problem:** `featured: z.coerce.boolean().optional()` runs `Boolean(value)`, and any non-empty
  string is truthy — so `?featured=false` becomes `true`. There is no way to request non-featured products.
- **Fix:** `z.enum(['true','false']).transform(v => v === 'true').optional()`.

### M6. Inline `schema.parse()` turns validation errors into HTTP 500 instead of 400
- **Files:** ~11 controllers call `.parse()` directly instead of the `validate()` middleware, e.g.
  [checkout.controller.ts:22](backend/src/controllers/checkout.controller.ts),
  [product.controller.ts](backend/src/controllers/product.controller.ts),
  [cart.controller.ts](backend/src/controllers/cart.controller.ts),
  [admin/order.admin.controller.ts](backend/src/controllers/admin/order.admin.controller.ts),
  [admin/blog.admin.controller.ts](backend/src/controllers/admin/blog.admin.controller.ts)
- **Problem:** `schema.parse()` throws `ZodError`; `asyncHandler` forwards it to the global handler
  ([index.ts:113](backend/src/index.ts)), which has no `ZodError` branch and returns a generic
  **500 "Internal server error"** with no field-level detail. Ordinary 400 validation failures look
  like server crashes.
- **Fix:** Route these through the existing `validate()` middleware, or add a `ZodError → 400` branch
  to the global error handler.

### M7. Admin generic status update can "refund"/"cancel" without refunding money or restoring stock
- **File:** [backend/src/controllers/admin/order.admin.controller.ts](backend/src/controllers/admin/order.admin.controller.ts) (`updateOrderStatus` vs `refundOrder`)
- **Problem:** `updateOrderSchema` permits `REFUNDED` and `CANCELLED`, and `updateOrderStatus` only
  writes the status + timeline event. Setting `REFUNDED` here **bypasses the Stripe refund and stock
  restoration** that live solely in `refundOrder`; cancelling an already-`PAID` order never returns stock.
- **Fix:** Disallow `REFUNDED` via `updateOrderStatus` (force `/refund`), and restore stock when a paid
  order is moved to `CANCELLED`.

### M8. Confirmation-email link breaks when `FRONTEND_URL` holds multiple origins
- **File:** [backend/src/services/email.service.ts:29](backend/src/services/email.service.ts)
- **Problem:** The email builds `href="${process.env.FRONTEND_URL}/account/orders"`, but `FRONTEND_URL`
  is used elsewhere as a **comma-separated** CORS origin list ([index.ts:64](backend/src/index.ts)). With
  more than one origin, the link becomes `https://a.com,https://b.com/account/orders` — broken.
- **Fix:** Use a dedicated single-value `PUBLIC_SITE_URL` for links, or `FRONTEND_URL.split(',')[0]`.

### M9. `aranya-next` mixes npm and pnpm
- **Files:** [aranya-next/package-lock.json](aranya-next/package-lock.json) (npm lockfile, package name `aranya-ceylon-storefront`, no `@aranya/shared` dependency) while it is a member of [pnpm-workspace.yaml](pnpm-workspace.yaml).
- **Problem:** The frontend is developed with npm (`npm install && npm run dev` per `HANDOFF.md`) yet
  declared as a pnpm workspace package. `pnpm install` at the root and `npm install` in `aranya-next`
  produce two dependency trees; root `pnpm -r` scripts won't behave consistently.
- **Fix:** Pick one. Either drop `aranya-next` from `pnpm-workspace.yaml` and keep it npm-managed, or
  convert it to pnpm and remove `package-lock.json`.

---

## Low

### L1. `requireVerified` middleware is a no-op
- **File:** [backend/src/middleware/authenticate.ts:47-54](backend/src/middleware/authenticate.ts)
- **Problem:** Despite its name, it performs no verification check (auth check + a comment only) and is
  unused. A future caller would wrongly assume it enforces email verification.
- **Fix:** Implement the DB-backed `verified` check it describes, or remove it.

### L2. Offline demo grants admin-console access on any unexpected error
- **Files:** [aranya-next/src/components/AuthContext.tsx:32-35](aranya-next/src/components/AuthContext.tsx) (`isOffline` treats `status === undefined` as offline), [aranya-next/src/components/admin/AdminApp.tsx:66-83](aranya-next/src/components/admin/AdminApp.tsx)
- **Problem:** When the backend is unreachable (or any thrown error lacks a `status`), sign-in falls
  back to a local **demo admin** session that any email/password opens. This is by design for offline
  review and exposes only demo data (real admin data is backend `requireRole`-gated), but the
  `status === undefined` catch-all is broad — an unexpected client error can drop a user into the demo
  console.
- **Fix:** Narrow `isOffline` to genuine network/502 conditions; don't treat arbitrary `undefined`-status
  errors as "offline".

### L3. Stubbed features silently drop submissions
- **Files:** [backend/src/controllers/contact.controller.ts:23](backend/src/controllers/contact.controller.ts), [backend/src/controllers/wholesale.controller.ts:26](backend/src/controllers/wholesale.controller.ts), register email verification [auth.controller.ts:53](backend/src/controllers/auth.controller.ts)
- **Problem:** Contact and wholesale submissions are only `console.info`'d (no persistence, no email)
  yet return a "we'll be in touch" success — enquiries are lost. Registration's verification email is a
  `TODO`, so outside `NODE_ENV=development` accounts are created `verified:false` with no way to verify.
- **Fix:** Persist/notify on submission; ship the verification-email flow before relying on `verified`.

### L4. `.env.example` duplicate / missing keys
- **File:** [backend/.env.example](backend/.env.example)
- **Problem:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_URL` each appear twice
  (first empty, then with a placeholder) — order-dependent and confusing. `STRIPE_PUBLISHABLE_KEY`
  (read in [checkout.controller.ts:179](backend/src/controllers/checkout.controller.ts)) isn't documented.
- **Fix:** De-duplicate and document every referenced variable.

### L5. ISR revalidation secret travels in the URL query string
- **Files:** [backend/src/controllers/admin/blog.admin.controller.ts](backend/src/controllers/admin/blog.admin.controller.ts) (`fetch(...?secret=…&path=…)`)
- **Problem:** Secrets in query strings are written to access logs/proxies; `path` is also not URL-encoded.
- **Fix:** Send the secret in a header and `encodeURIComponent` the path.

---

## Cleanup performed in this pass
At your direction (`aranya-next` confirmed as the canonical frontend), this branch now also:
- **Removes `frontend/`** (the older `@aranya/frontend` port whose "restore design" work was reverted)
  and **`frontend-legacy/`** (the static HTML/JSX prototype) — 673 files. Both were dead code; nothing
  in `aranya-next/`, `backend/`, or `shared/` imported from them.
- **Fixes `README.md`** — it described `frontend/` as the storefront; now points at `aranya-next/`.
- **Removes the stale `pnpm.workspacePackages` block** from root `package.json` (it listed `frontend`
  and disagreed with the authoritative `pnpm-workspace.yaml`).
- **Fixes `.claude/launch.json`** — it ran `pnpm --filter @aranya/frontend dev` (a package that was
  never even a workspace member); now launches `aranya-next` via `npm run dev`.

> Note: `frontend/` and `frontend-legacy/` both declared the **same** package name `@aranya/frontend`,
> which would have broken a pnpm install had either been a real workspace member.

## Areas reviewed and found sound
- Token rotation / reuse detection ([token.service.ts](backend/src/services/token.service.ts)) — hashed
  opaque refresh tokens, family revocation, race-safe rotation.
- Payment confirmation ([webhook.controller.ts](backend/src/controllers/webhook.controller.ts)) —
  idempotent `PENDING→PAID` claim, atomic stock decrement, post-commit email (aside from **H3**).
- Money math is integer-cents end-to-end ([cart.service.ts](backend/src/services/cart.service.ts)).
- The BFF proxy + in-memory access token + HttpOnly refresh cookie design in `aranya-next`
  ([http.ts](aranya-next/src/lib/api/http.ts), [api/[...path]/route.ts](aranya-next/src/app/api/[...path]/route.ts))
  keeps tokens off the client and is sound; the new checkout `provider` contract (stub/stripe/payhere)
  matches the backend.
- IDOR protection on cart items, customer orders, and wishlist is correctly scoped by id + `userId`.
