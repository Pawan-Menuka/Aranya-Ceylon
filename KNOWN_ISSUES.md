# Aranya Ceylon — Known Issues & Fix Guide

> Generated from a full code review on 2026-06-11. Covers commit `69e5364` **plus the uncommitted
> local changes** in `backend/` (UI fields, rating aggregation, dev-seed route, CORS changes) and the
> **uncommitted frontend prototype** (~110 files in `frontend/`). None of the uncommitted backend
> changes fix any issue below — all 25 original findings still apply, and the local changes add #26–27.
>
> Issues are ordered by severity. Each entry has: what's wrong, where, why it matters, and how to fix it.
>
> Suggested order of attack: **#0 → #1 → #2 → #26 → #4 → #5 → #6 → #3 → everything else.**

---

## ✅ Resolution log

Fixed on branch `claude/silly-ptolemy-149cfc` (2026-06-11), all gated by `pnpm typecheck`, `pnpm lint`
(0 errors), and `pnpm test` (22 passing).

| # | Issue | Status |
|---|---|---|
| #0  | Frontend/backend uncommitted | ✅ Committed by user to `Develop` |
| #1  | Refresh token flow broken | ✅ Fixed — opaque-token lookup by hash; dead JWT path removed |
| #2  | Zero tests | ✅ Fixed — vitest suite (22 tests) wired into CI |
| #3  | Webhook idempotency race | ✅ Fixed — conditional `updateMany` claim inside the transaction |
| #4  | No stock validation / negative stock | ✅ Fixed — checkout pre-check + atomic guarded decrement + DB CHECK constraint |
| #6  | `Order.total` stored subtotal | ✅ Fixed — now stores the grand total charged |
| #8  | Error handler leaks stack traces | ✅ Fixed — internals only in development |
| #9  | Register enumerates emails | ✅ Fixed — identical neutral response, no token issued on signup |
| #10 | No rate limiting | ✅ Fixed — `express-rate-limit` on auth routes + `trust proxy` |
| #11 | DB TLS verification disabled | ✅ Fixed — `rejectUnauthorized: true` verifies Neon's cert |
| #12 | Auth routes miss `asyncHandler` | ✅ Fixed |
| #13 | Logout broken / over-aggressive | ✅ Fixed — cookie-based, single-session; new `/auth/logout-all` |
| #14 | `sameSite: 'strict'` breaks PayHere redirect | ✅ Fixed — now `'lax'` (see cross-domain note in #14) |
| #18 | Register TOCTOU race on duplicate email | ✅ Fixed — relies on unique constraint + P2002 catch |
| #26 | Dev CORS fails open | ✅ Fixed — fails closed; only `NODE_ENV=development` relaxes |
| #27 | `/dev/seed-catalog` fails open | ✅ Fixed — requires `ENABLE_DEV_ROUTES=true` |

**Behaviour change to note (#9):** registration no longer logs the user in or returns a token. After
`POST /auth/register` the client should send the user to sign in. In development, accounts are
auto-verified so login works immediately; in production `verified` stays `false` until the (not-yet-built)
email-verification flow ships — login does not currently enforce `verified`, so users can still sign in.

**Still open (next up):** #5 (coupons), #7 (float money math), #15 (PayHere amount cross-check),
#16 (Stripe premature cancel), #17 (guest checkout), #19 (cart market re-validation), #20–#25 (low),
F2–F7 (frontend port), plus the feature roadmap.

---

## 🔴 CRITICAL — #0: The entire frontend (and recent backend work) is uncommitted

**Where:** `frontend/` — ~110 untracked files (`git status` shows `??` on every one). Plus 15 modified
backend/shared files and 4 new backend files, all uncommitted.

**What's wrong:** days of work — the full design system, every storefront page, complete mobile flows,
the `api.js` client, `BACKEND_INTEGRATION.md`, the new backend product fields and seed catalog — exist
**only as loose files on one disk**. No git history, no remote backup. One disk failure, accidental
`git clean`, or bad `rm` and it is unrecoverable.

**Fix (do this before anything else in this file):**
```
git add frontend/ backend/ shared/
git commit -m "Add frontend prototype + product UI fields, rating aggregation, dev seed"
git push
```
Commit messy if you have to — you can reorganize later. History you have beats cleanliness you don't.
Going forward: commit at least daily while actively building.

---

## 🔴 CRITICAL

### 1. Refresh token flow is completely broken — `/auth/refresh` fails 100% of the time

**Where:**
- `backend/src/controllers/auth.controller.ts:52` (cookie is set to the plaintext random string)
- `backend/src/services/token.service.ts:22` (plaintext is `createId() + createId()` — a random 48-char string)
- `backend/src/services/token.service.ts:57` (rotation calls `verifyRefreshToken()` on that string)
- `backend/src/lib/jwt.ts:45` (`verifyRefreshToken` = `jwtVerify()` — expects a JWT)

**What's wrong:**
Two incompatible designs are half-wired together:

- **Design A (opaque token):** random string in the cookie, SHA-256 hash stored in `Token.tokenHash`. ← the cookie uses this
- **Design B (JWT):** `signRefreshToken()` creates a signed JWT containing `tokenId`/`family`. ← the verifier expects this

The login/register flow sets the cookie to the **Design A** plaintext, but `rotateRefreshToken()` starts by JWT-verifying the cookie (**Design B**). A random string is not a JWT, so `jwtVerify` throws `Invalid Compact JWS` on every call. Every refresh attempt returns 401.

**Verified by reproduction (no DB/network needed):**
```
Cookie value set at login : qj92h4nrc4vom4knthji3idhyv96lk1zzupzmce1ch8818hd
RESULT: refresh FAILED → Invalid Compact JWS
CONTROL: verifying the discarded JWT works fine → u1
```

**Consequences:**
- Every user is silently logged out after the 15-minute access-token expiry. (This is the "intermittent auth issue" — it's the 15-minute clock, not the network.)
- `Token.tokenHash` is **dead code** — never compared against anything during rotation.
- The signed `refreshToken` JWT returned by `issueTokenPair()` is created and immediately discarded.

**Fix (recommended — keep Design A, delete Design B):**
1. In `rotateRefreshToken()`, replace the `verifyRefreshToken()` call with a DB lookup:
   ```ts
   const tokenRecord = await prisma.token.findUnique({
       where: { tokenHash: hashToken(refreshTokenCookie) },
       include: { user: true },
   });
   ```
2. Keep all the existing checks (not found / `usedAt` reuse-detection / expiry) — they're good.
3. Delete `signRefreshToken`, `verifyRefreshToken`, and `RefreshTokenPayload` from `jwt.ts`, and `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRY` from env. Remove the unused `refreshToken` from `issueTokenPair`'s return.
4. Also remove the now-unused `tokenId` plumbing if nothing else needs it (the `@unique` lookup on `tokenHash` replaces it).

**Alternative fix (keep Design B):** set the cookie to the signed `refreshToken` JWT instead of the plaintext — but then the DB hash adds nothing and you should drop `tokenHash` instead. Design A is simpler; prefer it.

---

### 2. Zero tests — and CI can't catch any of this

**Where:** entire repo; `.github/workflows/ci.yml` runs typecheck, lint, `prisma validate`, and `pnpm audit` only.

**What's wrong:** there is not a single test in the codebase. Issue #1 would have been caught by the very first auth integration test. For code handling payments, token rotation, and stock decrements, typecheck-only CI gives false confidence.

**Note:** `vitest` is already installed at the workspace root — the runner exists, it just has no tests.

**Fix:** don't aim for coverage; aim for the money/auth paths. Roughly 10 tests:
1. register → login → refresh → refresh again (rotation) → reuse old token (family nuked)
2. login with wrong password / nonexistent email (same response shape)
3. checkout intent: empty cart, cross-market address rejection, totals math
4. Stripe webhook: signature failure, `payment_intent.succeeded` marks PAID + decrements stock, **duplicate delivery doesn't double-decrement** (see #4)
5. PayHere webhook: bad `md5sig` rejected, `status_code === '2'` confirms order

Add `pnpm test` as a CI step. Use a throwaway Postgres (e.g. `services:` block in the workflow, or Testcontainers).

---

## 🟠 HIGH — money & payment correctness

### 3. Race condition: webhook order confirmation is not idempotent under concurrency

**Where:** `backend/src/controllers/webhook.controller.ts:11-18` (`confirmOrderPaid`)

**What's wrong:** the idempotency guard (`if (!order || order.status === 'PAID') return;`) runs **outside** the `$transaction`. Stripe retries webhooks and can deliver concurrently. Two deliveries can both read `status: 'PENDING'`, both pass the guard, and both decrement stock → double stock decrement, duplicate `OrderEvent` rows.

**Fix:** make the status flip conditional and atomic, inside the transaction:
```ts
await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'PAID' },
    });
    if (count === 0) return; // already processed — someone else won the race
    // ...stock decrement, OrderEvent, cart clear...
});
```

### 4. No stock validation at checkout; stock can go negative

**Where:**
- `backend/src/controllers/checkout.controller.ts` — never checks stock before creating the order
- `backend/src/controllers/webhook.controller.ts:28-29` — own comment admits decrement "goes negative"
- Stock is only checked once, at add-to-cart (`backend/src/services/cart.service.ts:70`)

**What's wrong:** a cart can sit for days; checkout happily creates an order (and takes payment!) for stock that no longer exists. The webhook then drives `Variant.stock` negative.

**Fix (both parts):
1. **Validate at intent creation:** in `createIntent`, after loading the cart, reject if any `item.quantity > item.variant.stock`.
2. **DB-level backstop:** add a CHECK constraint via a raw migration:
   ```sql
   ALTER TABLE "Variant" ADD CONSTRAINT "stock_non_negative" CHECK ("stock" >= 0);
   ```
   Then handle the constraint violation in `confirmOrderPaid` (order stays PENDING / gets flagged for manual review + refund).

### 5. Coupons are wired 0% into checkout

**Where:**
- `backend/src/services/cart.service.ts:185-204` — `validateCoupon` exists but has zero callers
- `backend/src/controllers/checkout.controller.ts` — never reads a coupon code, never sets `couponId`/`discount` on the Order
- `Coupon.usageCount` is never incremented anywhere

**Fix:** accept an optional `couponCode` in `checkoutSchema`; in `createIntent`, call `validateCoupon`, subtract the discount from the charged total, persist `couponId` + `discount` on the Order, and increment `usageCount` atomically (`{ increment: 1 }`) — ideally only on payment confirmation, and guard the usage-limit check against races (conditional `updateMany` like #3).

### 6. `Order.total` stores the subtotal, not the charged amount

**Where:** `backend/src/controllers/checkout.controller.ts:46` — `total: subtotal`, while PayHere/Stripe are charged `total` (subtotal **+ shipping**).

**Why it matters:** any revenue report summing `Order.total` will disagree with actual gateway payouts by the shipping amount on every order.

**Fix:** decide the semantic and apply it consistently. Recommended: `total` = grand total actually charged (subtotal − discount + shipping), since `shippingCost` and `discount` are already separate columns the subtotal can be derived from. Update the admin analytics queries to match.

### 7. Money math uses floats

**Where:** `backend/src/services/cart.service.ts:163-181` (`calculateCartTotal`) — `Number(item.variant.price)` converts `Decimal` → float, then sums/rounds.

**Why it matters:** classic float drift (`0.1 + 0.2 !== 0.3`). You paid for `Decimal(10,2)` in the schema and abandon it in the service layer. LKR totals are large integers so drift is small — but Stripe USD amounts hit the same path.

**Fix:** do all arithmetic in integer cents (`Math.round(price * 100)` per item, sum integers, divide by 100 only for display) or use `Prisma.Decimal` methods (`.mul()`, `.add()`) end to end.

---

## 🟠 HIGH — security

### 8. Production error handler leaks stack traces to clients

**Where:** `backend/src/index.ts:82-85`

```ts
res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
```

**Why it matters:** every 500 response discloses internal file paths, library internals, and query details to the public.

**Fix:**
```ts
const isDev = process.env.NODE_ENV !== 'production';
console.error('[ERROR]', err);
res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { details: err.message, stack: err.stack }),
});
```

### 9. Register endpoint enumerates emails despite the anti-enumeration comments

**Where:** `backend/src/controllers/auth.controller.ts:21-59`

**What's wrong:** the comment says "Return IDENTICAL response whether email exists or not," but:
- existing email → `{ message }` only
- new email → `{ message, accessToken, user }`

An attacker just checks whether `accessToken` is present. The careful timing-attack padding is undermined by the response body.

**Also:** registration logs the user in (issues tokens) before email verification, making `verified` largely decorative.

**Fix:** make register return **only** the neutral message in both branches (no tokens, no user object), and require login after email verification. If you want instant-login UX instead, accept that enumeration is possible and drop the pretense — but for an e-commerce site, verify-then-login is the safer default.

### 10. No rate limiting anywhere

**Where:** all routes; most critical on `/auth/login`, `/auth/register`, `/auth/refresh`.

**Why it matters:** unlimited brute-force on passwords; registration spam creates unbounded DB rows.

**Fix:** `pnpm add express-rate-limit`, then:
```ts
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true });
app.use('/auth', authLimiter, authRoutes);
```
Consider a tighter limiter (5/15min) specifically for `/auth/login`. If deploying behind a proxy (Render/Railway/Fly), set `app.set('trust proxy', 1)` so the limiter keys on the real client IP.

### 11. TLS certificate verification disabled for the database

**Where:** `backend/src/index.ts:29-31` — `ssl: { rejectUnauthorized: false }`

**Why it matters:** the DB connection is encrypted but unauthenticated — a man-in-the-middle can present any cert. Neon supports verified TLS.

**Fix:** remove the `ssl` override and use `sslmode=require` (or `verify-full` with the Neon CA) in `DATABASE_URL`. Neon connection strings include `sslmode=require` by default.

### 12. Auth routes don't use `asyncHandler` — rejected promises hang requests

**Where:** `backend/src/routes/auth.routes.ts` (admin/cart/blog routes wrap handlers; auth doesn't). Check `category`, `product`, `checkout`, `market` routes too.

**Why it matters:** Express 4 does not catch async rejections. Any thrown error in `register`/`login`/`refresh` (e.g. a transient DB error) never reaches the error handler — the client request hangs until timeout.

**Fix:** wrap every async controller: `router.post('/register', validate(registerSchema), asyncHandler(register));` — or upgrade to Express 5, which forwards rejections natively.

### 13. Logout is broken for expired sessions and over-aggressive when it works

**Where:** `backend/src/routes/auth.routes.ts:12` + `backend/src/controllers/auth.controller.ts:115-124`

**Two problems:**
1. `requireAuth` means a user with an **expired access token cannot log out** (the most common time someone hits logout). And since refresh is broken (#1), this is currently every user after 15 minutes.
2. When it does work, `revokeAllUserTokens` kills **every device's** session, not just the current one.

**Fix:** remove `requireAuth` from the logout route. Look up the refresh cookie's token record (by `hashToken(cookie)` after fixing #1), delete just that token's **family**, and clear the cookie. Offer "log out everywhere" as a separate authenticated endpoint.

### 14. `sameSite: 'strict'` on the refresh cookie will break the PayHere return flow

**Where:** `backend/src/controllers/auth.controller.ts:15`

**Why it matters:** PayHere redirects the customer back from `payhere.lk` to your `return_url`. With `SameSite=Strict`, cookies are not sent on cross-site navigations. Depending on how the frontend boots its session on `/checkout/success`, the user can appear logged out right after paying. Also relevant if frontend and API end up on different origins (cookies won't flow at all cross-origin with `strict`).

**Fix:** use `sameSite: 'lax'` (cookies still sent on top-level GET navigations; CSRF protection for the POST-only refresh endpoint is preserved because `lax` blocks cross-site POSTs). Revisit when frontend/API domains are finalized.

---

## 🟡 MEDIUM

### 15. PayHere webhook: no merchant-ID or amount cross-check

**Where:** `backend/src/controllers/webhook.controller.ts:102-146`

**What's wrong:** the MD5 signature is verified (good — forgery requires the merchant secret), but the handler never checks:
- `merchant_id` equals **your** `PAYHERE_MERCHANT_ID`
- `payhere_amount` / `payhere_currency` match the order's stored total/currency

**Fix:** cheap defense-in-depth before `confirmOrderPaid`:
```ts
if (merchant_id !== process.env.PAYHERE_MERCHANT_ID) return res.status(400).send('Wrong merchant');
// after loading the order:
// compare payhere_amount to (order.total + order.shippingCost).toFixed(2) and currency to order.currency
```

### 16. Stripe `payment_failed` cancels the order prematurely

**Where:** `backend/src/controllers/webhook.controller.ts:82-89`

**What's wrong:** a single `payment_intent.payment_failed` (e.g. first card declined) sets the order to `CANCELLED`, but the same PaymentIntent allows retrying with another card. The customer retries, pays successfully — against an order already marked CANCELLED. `confirmOrderPaid` only guards against `PAID`, so it will flip CANCELLED → PAID, but the intermediate state is wrong and any cancellation side effects you add later (restock emails, etc.) would fire spuriously.

**Fix:** on `payment_failed`, log an `OrderEvent` but leave status `PENDING`. Cancel via a TTL job instead (e.g. cancel PENDING orders older than 24h — fits the existing `scheduler.ts` pattern).

### 17. Guest checkout is impossible despite the schema supporting it

**Where:** `backend/src/controllers/checkout.controller.ts:9` (`req.user!.userId`), cart lookup by `userId` only. Schema has `Order.userId String?` + `guestEmail` and guest carts exist with `guestToken`.

**Fix (when you get to it):** make checkout use `optionalAuth`; resolve the cart via `userId` **or** the guest-token cookie; require `guestEmail` in the payload for guests. Until then, at least replace `req.user!` with an explicit 401 guard — the non-null assertion will throw a raw TypeError if the route middleware ever changes.

### 18. Register has a TOCTOU race on duplicate emails

**Where:** `backend/src/controllers/auth.controller.ts:26-39`

**What's wrong:** `findUnique` then `create` — two concurrent registrations with the same email both pass the check; the second `create` throws Prisma `P2002`, which (given #12) currently hangs the request.

**Fix:** wrap the `create` in try/catch for `P2002` and return the same neutral 201 message. The unique constraint is the real guard; the pre-check is just UX.

### 19. Cart total / order snapshot can include items whose market changed

**Where:** `backend/src/services/cart.service.ts:151-182`, `backend/src/controllers/checkout.controller.ts:42-60`

**What's wrong:** market is validated only when adding to cart. If an admin later switches a variant from `BOTH` to `LOCAL`, an INTERNATIONAL user's existing cart still checks out with it — and `calculateCartTotal` sums prices in whatever currency each variant carries (`Variant.currency` is per-variant, but the total assumes one currency per market). Mixed-currency carts produce a nonsense total.

**Fix:** at checkout, re-validate every cart item: variant still exists, market matches, `variant.currency` matches the market currency. Reject with a "your cart has changed" error listing offending items.

---

## 🟢 LOW / cleanup

### 20. Duplicate email libraries
`backend/package.json` depends on both `nodemailer` and `resend`. Pick one (the code comments suggest Resend) and remove the other plus its `@types`.

### 21. README is a placeholder; commit messages are noise
`README.md` is one line ("Editing this to fix the issues in the CI/CD"); the last five commits are all "Update README.md". Write a real README (stack, setup, env vars, scripts) and use descriptive commit messages going forward.

### 22. Frontend is uncommitted — promoted to issue **#0** at the top of this file
See #0 (critical) and the dedicated **Frontend** section (F1–F7) below.

### 23. `connectDB` + `startAllJobs` lifecycle nits
**Where:** `backend/src/index.ts:87-102`
- No graceful shutdown: add `SIGTERM`/`SIGINT` handlers that close the HTTP server and call `prisma.$disconnect()` / `pool.end()` — matters on any PaaS that rolling-restarts.
- Cron jobs run in every instance; if you ever scale to 2+ instances, scheduled posts publish twice and low-stock emails send twice. Fine for now; revisit before horizontal scaling.

### 24. `helmet()`/`cors()` are mounted after the webhook routes
**Where:** `backend/src/index.ts:42-47`. Intentional-looking (webhooks need raw body and aren't browser-facing), but document it with a comment so a future refactor doesn't "fix" the ordering and break Stripe signature verification — and so nobody mounts browser-facing routes above the security middleware.

### 25. Minor dead/duplicated code
- `crypto` imported but unused in `webhook.controller.ts:2`.
- `createId` imported but unused in `auth.controller.ts:3`.
- `Variant` has duplicate indexes: `@@index([productId, market])` and `@@index([productId])` — the composite covers the single-column one; drop `@@index([productId])`.
- `User.@@index([email])` is redundant — `@unique` already creates an index.

---

## 🟠 NEW — found in the uncommitted local backend changes

### 26. Dev CORS allows **any origin with credentials** — and fails open if `NODE_ENV` is unset

**Where:** `backend/src/index.ts` (uncommitted change) — the new CORS origin callback:
```ts
if (!origin || _allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    cb(null, true);
}
```

**What's wrong:** the check is `NODE_ENV !== 'production'` — a **fail-open** guard. If a deployment
forgets to set `NODE_ENV=production` (extremely common on first deploys), every origin on the internet
is allowed **with `credentials: true`**. Any malicious site could then make authenticated requests with
your users' cookies and read the responses — session/account takeover territory. The `!origin` branch
also reflects-allows null-origin requests unconditionally, even in production.

**Fix:** fail **closed** — invert the condition so the permissive branch requires explicit opt-in:
```ts
const isDev = process.env.NODE_ENV === 'development';
if (origin && (_allowedOrigins.includes(origin) || isDev)) cb(null, true);
else if (!origin && isDev) cb(null, true);   // file:// pages during local dev only
else cb(new Error('CORS: origin not allowed'));
```
Unknown/unset `NODE_ENV` should behave like production, never like development.

### 27. `/dev/seed-catalog` route — same fail-open `NODE_ENV` guard

**Where:** `backend/src/routes/dev-seed.routes.ts` (uncommitted) + mounted unconditionally at
`app.use('/dev', devSeedRoutes)` in `index.ts`.

**What's wrong:** the route registers itself when `NODE_ENV !== 'production'`. Same failure mode as #26:
unset `NODE_ENV` in a deployed environment exposes an **unauthenticated POST that writes to the catalog**.
It's idempotent-ish (skips existing slugs), so the blast radius is limited, but an open DB-write endpoint
in production is never acceptable.

**Fix:** require explicit opt-in instead: `if (process.env.ENABLE_DEV_ROUTES === 'true') { ... }`, and
only mount the router in `index.ts` under the same flag. Long-term: delete the route — `prisma db seed`
with `seed-catalog.ts` does the same job without an HTTP surface.

*(For the record, the rest of the uncommitted backend work is solid: `latin`/`originLabel`/`color` on
Product matching the frontend adapter, the `ratingAvg` enrichment via a single `groupBy`, deterministic
brand-palette color fallback, and the dual-market seed catalog with per-market packaging. Keep all of it.)*

---

## 🖥️ FRONTEND (`frontend/` — uncommitted prototype, reviewed 2026-06-11)

**Context:** the frontend is a complete React-via-CDN prototype: full design system
(`aranya.css` + `frontend/CLAUDE.md`), every storefront page, complete mobile flows, an admin shell,
and a well-engineered API client (`api.js`). The design quality is genuinely strong — locked typography
roles (Cormorant Garamond / Plus Jakarta Sans / Spectral), market-aware CTA colors, documented card
variants. **Treat it as a high-fidelity design system + spec to be ported, not as code to ship as-is.**

### F1. 🔴 Uncommitted — see #0. Nothing else in this section matters if the files are lost.

### F2. 🔴 Prototype architecture is not shippable for a real store

**What:** React + Babel via CDN `<script>` tags, JSX transpiled **in the browser at runtime**, components
exported via `window` globals, one standalone HTML file per page, no bundler/router/npm deps.

**Why it matters:**
- **SEO** — product pages render client-side after runtime Babel compilation; crawlers and link previews
  see skeleton HTML. For an e-commerce business, organic search is the cheapest acquisition channel —
  this forfeits it.
- **Performance** — babel-standalone + unminified, unsplit JSX is multi-second on mobile connections
  (most Sri Lankan traffic).
- **Maintainability** — `window` globals and per-page script-tag ordering are fragile and don't scale.

**Fix — port to Next.js (App Router), mostly mechanical:**
1. `aranya.css` tokens drop in as-is (global stylesheet or CSS-module-ized).
2. Each `*.jsx` becomes a component with real imports instead of `Object.assign(window, …)`.
3. Per-page HTML files become routes; product/blog pages become SSG/ISR for SEO.
4. `api.js` logic moves into a typed client — and can finally use the Zod schemas from
   `@aranya/shared` (see F6).
5. The `*-data.js` demo files become seed/fallback fixtures.

Follow `frontend/BACKEND_INTEGRATION.md` for the endpoint mapping — it's accurate.

### F3. Integration gaps — what's designed but not wired

- **Market switcher** — UI toggle exists, but the signed `x-market` JWT-cookie handshake with
  `resolveMarket` middleware is not wired. This is the product's signature feature; wire it first.
- **PayHere flow** — hidden-form auto-submit to the checkout URL, plus `/checkout/success` needs a
  polling "confirming your payment…" state (the order may still be PENDING when the user returns,
  because the webhook can lag the redirect). Interacts with backend #14 (`sameSite: 'strict'`).
- **Stripe Elements** — not mounted anywhere yet; `checkout.jsx` is a mock order today.
- **Server cart sync** — `cart-store.js` is local-only; needs syncing to `/cart` with the guest-token
  cookie flow, and `mergeGuestCart` on login.
- **Real photography** — everything is styled `SpicePhoto` placeholders + `image-slot` drop zones.
  The premium positioning depends on real product/estate photos more than any code change.

### F4. Access token stored in `localStorage` (XSS exposure)

**Where:** `api.js` (`tokenKey: "aranya_token"`).
**Why it matters:** any XSS anywhere on the page can exfiltrate the token. With a 15-minute expiry and
HttpOnly refresh cookie the blast radius is bounded — this is a defensible trade-off — but it makes
strict XSS hygiene mandatory: never `dangerouslySetInnerHTML` unsanitized MDX/review content, and add a
CSP header when the real frontend ships. Alternative: keep the access token in memory only and rely on
the refresh cookie across page loads (one extra refresh round-trip per full reload).

### F5. Prototype debris mixed into the working set

~110 files flat in one directory, including superseded iterations: `about-2.jsx` vs `about.jsx`,
`product-detail-2.jsx`, `navbars.jsx` vs `navbar.jsx`, `mobile-support2.jsx`, archived card options in
`cards.jsx`, design studies (`Font Study.html`, `design-canvas.jsx`, `tweaks-panel.jsx`, `heroes.jsx`).
**Fix:** during the port, separate `design-studies/` (keep for reference) from production components,
and resolve every `-2` duplicate to a single canonical file. `frontend/CLAUDE.md` documents which
variants are canonical (CardCFinal, CardB, AranyaNavbar) — follow it.

### F6. Frontend uses none of `@aranya/shared`

The monorepo's whole point was shared Zod schemas/types between front and back; the prototype (being
CDN-based) can't import them, so request/response shapes are duplicated by hand in `api.js`'s adapter.
The Next.js port should import `@aranya/shared` for every payload it sends and parse every response
through the shared schemas — that turns backend/frontend drift into compile errors.

### F7. Frontend's auto-refresh will mask backend bug #1 as "random logouts"

`api.js` implements 401 → refresh → replay correctly. But backend #1 means every refresh fails, so the
client clears the token and fires `aranya:auth-expired` — to a user this looks like being randomly
logged out ~15 minutes after signing in, and historically it has looked like a flaky network. **Fix
backend #1 before doing any auth integration testing**, or every auth symptom you debug will be a ghost.

---

## 💡 ROADMAP — missing features worth building (neither side has these)

Ordered by value-for-effort. None are bugs; all are revenue or trust levers.

**High value**
1. **Transactional emails** — order confirmation, shipping notification, password reset. Resend is
   installed; `auth.controller.ts` has the `TODO Step 4`. Right now a paying customer gets *silence*
   after checkout — closer to "must" than "nice".
2. **SEO infrastructure** — sitemap, `Product` schema.org structured data (price/rating rich snippets),
   OG images, canonical URLs. Pairs with the Next.js port (F2); near-free at that point.
3. **Abandoned-cart recovery emails** — carts already have timestamps and a cron scheduler exists
   (`jobs/scheduler.ts`); one job + one email template. Highest-ROI feature in e-commerce.
4. **i18n** — Sinhala/Tamil for LOCAL, English for INTERNATIONAL. The market split is already in the
   architecture; language is its natural twin.
5. **Stock reservation at checkout** — hold inventory ~15 min when an intent is created; properly closes
   the oversell window that #4 only patches.

**Medium value**
6. **Order-tracking integration** — local couriers (Koombiyo/Pronto) for LK, AfterShip for international,
   instead of a bare tracking-number string. The `OrderEvent` timeline UI already exists in `account.jsx`.
7. **Related products / cross-sell** — even same-category "you may also like" lifts average order value.
8. **Review photos + helpful votes** — `helpfulCount` exists in the schema with nothing using it.
9. **Wholesale portal** — `WholesaleAccount` model has tiers/credit limits, `wholesale.jsx` has the page,
   but there's no application flow, tier pricing, or bulk-order UI. Build it or cut it — half-built B2B
   is dead weight.
10. **Gift options** — notes, wrap, gift tins (the INT variants already have `gift_tin` packaging!).
    Spices are heavily gifted; cheap to add, converts well.

**Operational / invisible**
11. **Error monitoring + structured logging** — Sentry (or similar); production debugging is currently
    `console.log` with emojis.
12. **Webhook event log table** — persist raw gateway events for replay and dispute debugging. You'll
    want this the first time a payment "disappears".
13. **Admin notification on new orders** — the alert merchants actually care about (low-stock alerts
    exist; this doesn't).
14. **Currency display conversion** — charge USD internationally, *display* approximate LKR alongside.
15. **Redis/in-memory caching** — product catalog reads + a shared rate-limit store (pairs with #10).

---

## What's already good (don't break these while fixing)

- **Prisma schema design**: price snapshots on `OrderItem`, immutable `AuditLog`, proof-of-purchase reviews, guest carts with expiry, dual-market + currency stamping on orders.
- **Stripe webhook raw-body handling** mounted before the JSON parser — correct and commonly botched.
- **Token-family reuse detection** concept in `token.service.ts` — keep it through the #1 fix.
- **Monorepo with shared Zod schemas** (`@aranya/shared`) between front/back.
- **Server-side market validation** at checkout (cross-market address check).
- **Frontend design system** (`frontend/CLAUDE.md` + `aranya.css`) — locked typography roles,
  market-aware CTA colors, documented card variants, reduced-motion handling. Port it; don't redesign it.
- **`api.js`** — single network gateway, de-duplicated 401 auto-refresh with replay, graceful demo-data
  fallback, backend adapter layer. Carry this architecture into the Next.js port.
- **Uncommitted backend additions** — Product UI fields (`latin`/`originLabel`/`color`), `ratingAvg`
  enrichment via one `groupBy`, dual-market seed catalog with per-market packaging.
