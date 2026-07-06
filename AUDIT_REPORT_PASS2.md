# AUDIT_REPORT_PASS2

_Second-pass verification audit — 2026-07-06. Flag-only; no code was modified._

**Scope & method.** This pass verifies AUDIT_REPORT.md (first pass, 2026-07-04) against the current state of the repo, which includes the remediation commits `431cb7b` → `2fecd44` (Phases 0–6 plus gap fixes). Per instructions, Step 1 verifies **every** issue in the first report rather than a 10-item spot-check. Step 2 traces user journeys end-to-end; Step 3 hunts contract/env/currency/date/concurrency/empty-state classes. Verification was done by direct source inspection of the referenced files at their current state, plus lockfile/route/inventory checks. Nothing was executed against a live backend or database — items whose correctness depends on runtime state are marked **needs runtime verification**.

---

## 1. Verification of the first report (all 58 findings) + false positives / corrections

Legend: **✔ fixed** (verified in source) · **◐ partial** (fixed with residuals, listed) · **✗ not fixed** (deferred, documented) · **FP** correction to the first report.

### Bugs

| ID | Status | Verification notes |
|---|---|---|
| BUG-01 | ✔ | `toSpice` carries `productId`+`variants`; `CartContext.add` resolves variant and POSTs `/cart/items` for all entry points; gift sets backed by DRAFT products (`gift-<slug>`) with per-market variants. **Needs runtime verification:** the gift seed (`prisma/seed-gifts.ts`) must have been run for backing products to exist; `gift.controller` degrades gracefully (`productId: null`) if not. |
| BUG-02 | ✔ | `lib/market.ts` decodes the JWT payload (base64url) and reads `payload.market`; falls back to legacy bare value. Decode-only is documented as display-scoped; backend re-verifies. |
| BUG-03 | ✔ | Refresh cookie path is `/auth`; BFF (`app/api/[...path]/route.ts`) rescopes `Path=/auth` → `Path=/api/auth` so the browser returns it to both `/api/auth/refresh` and `/api/auth/logout`. Note: cookies issued **before** this fix carry the dead `/auth/refresh` path and remain orphaned until expiry (≤7 days) — affected users must log in again; not a regression (those sessions were already unreachable). |
| BUG-04 | ✔ | `register()` returns `{pending, message}`; `signUp` returns `{pending|demo}`; SignInModal + SignedOutGate show a verify-email notice and switch to sign-in. **But see FLOW-01** — the verification *link itself* dead-ends. |
| BUG-05 | ◐ | Promo validated against backend (`applyPromo` awaits `/cart/coupon`); checkout charges server-computed discount; OrderSummary renders `serverTotals`. **Residuals:** (a) the cart-drawer total shows a client *estimate* — a real DB coupon displays "discount shown at checkout" and the drawer total omits it (drawer ≠ checkout total until the checkout page); (b) the offline fallback still accepts `CEYLON10` locally — if the API later comes back and the code isn't in the DB, checkout 400s ("coupon code is not valid") with the promo stuck applied. |
| BUG-06 | ✔ | Global handler has a `ZodError → 400` branch with field errors; `lastName` required in UI + guard. **Fragility note (not a live bug):** backend declares `zod ^3.23.8`, shared `^3.25.76` — pnpm-lock currently resolves **both to a single `zod@3.25.76`**, so `instanceof ZodError` works. If a future install ever splits them into two instances, the `instanceof` check silently fails for shared-schema parses (cart/checkout — exactly the flagged endpoints) and 500s return. Fix direction: pin one zod version workspace-wide or duck-type (`err?.name === 'ZodError' && Array.isArray(err.issues)`). Cross-ref SEC-13. |
| BUG-07 | ✔ | `refund()` calls only the refund endpoint, optimistic status with rollback, error banner (`actionError`) replaces `bestEffort` swallow. Backend guard/idempotency unchanged and correct. |
| BUG-08 | ✔ | `status` added to `createProductSchema`/`updateProductSchema`, threaded through `updateProduct`; UI sends `status` on create (`visible ? "ACTIVE" : "DRAFT"`) and on toggle. **Needs runtime verification:** requires `@aranya/shared` rebuilt (`pnpm --filter @aranya/shared build`) — the stale dist otherwise strips the field at type level. |
| BUG-09 | ✔ | Editor body/excerpt are controlled state; `getAdminBlog` loads content on edit; min-length guard surfaces a save error; `toPost` maps `content` → sanitised `PostBlock[]` (headings/quotes/paragraphs, inline markdown subset), fallback prose only when content empty. |
| BUG-10 | ✔ | `sendSupportNotification` (HTML-escaped, replyTo) wired into contact + wholesale controllers; both forms show a real error state and no longer fabricate `AC-`/`WS-` references on failure. |
| BUG-11 | ◐ **REGRESSION-02** | Sort now uses the real market-appropriate minimum variant price — but it is applied **after** fetching a page ordered by `createdAt`. Sorting is page-local: with more products than one page, "Price: Low to High" is only correct within each page and page boundaries are wrong. Fix direction: aggregate min-price in SQL (raw query or denormalised column) and order the fetch itself. |
| BUG-12 | ◐ **REGRESSION-03** | ts_rank order preserved (re-applied after `id IN`), `limit+1` fetched, storefront search wired to the FTS endpoint with offline fallback (commit `2fecd44`), journal index widened to 50 posts. **Residual:** the FTS branch **ignores `cursor` entirely** — `hasNextPage` is now correctly true, but requesting page 2 returns page 1 again. Fix direction: `OFFSET`/keyset on the ranked ID query. |
| BUG-13 | ✔ | `featured` parses literal `true/false/1/0` tokens; anything else is a 400 via the enum. |
| BUG-14 | ✔ | `listAuditLogs` maps `{items}` → `{logs}`; `?q=` order search implemented server-side (order id / guest email / user email / user name, case-insensitive). |
| BUG-15 | ✔ | Revenue = Σ(quantity × unitPrice) aggregated in JS; ranked by units (currency-neutral); LKR normalised via `LKR_USD_RATE` (default 300). Env var undocumented — see GAP-02; admin FX inconsistency remains elsewhere — see GAP-03. |
| BUG-16 | ✔ | All six `revalidateFrontend` calls (controller + scheduler) now target `/journal` and `/journal/[slug]`. |
| BUG-17 | ✔ | Gifts/recipes fetchers use `NEXT_PUBLIC_API_URL` with `BACKEND_URL` as legacy fallback. |
| BUG-18 | ◐ | CANCELLED/REFUNDED statuses render correctly; timeline events map to real spine keys (`placed/packed/shipped/delivered`) so timestamps attach; real `order.total`+`currency` used; fabricated "DHL Express" replaced with neutral labels. **Residual (acknowledged):** `acOrderTotal` returns `order.total` regardless of the `market` argument while `acFmt` formats with the *global market toggle's* symbol — an LKR order viewed with the intl toggle shows an LKR number with a `$` sign. Fix direction: format per-order using `o.currency`. |
| BUG-19 | ◐ | (b) lines keyed `v:<variantId>` — one variant = one line = one `backendItemId`; (d) all API calls moved out of `setState` updaters. **Not fixed:** (a) rapid +/− still fires absolute-quantity PATCHes that can land out of order (no sequencing/abort); (c) `clear()` still resets local state only — the server cart persists on abandoned flows (it *is* cleared on successful payment via `cartId`). |
| BUG-20 | ◐ | Fixed: admin gate demo entry gated behind `NEXT_PUBLIC_ENABLE_DEMO` (SEC-08), fabricated gate stats hidden, storefront demo-login fallback gated, real reviews rendered (demo cards only in DEMO_MODE), real certifications shown / fabricated claims dropped, catalog ratings use real `ratingAvg`. **Not fixed:** `AdminApp.tsx` still passes hardcoded `pendingCount={18}` to AdminShell; the admin Orders/Products/Blog/Audit pages still *initialize* with fabricated `ADMIN.*` demo rows and keep them whenever the live fetch fails, regardless of DEMO_MODE (only reachable by a real signed-in admin now, but a transient fetch failure silently shows fake orders/products as if real); the account "Harvest Club" tier/points remain fabricated for real users. |
| BUG-21 | ✔ | `requireVerified` now checks `verified` in the DB and 403s. **Correction/note:** it is still mounted on **zero routes** (grep confirms) — enforcement is real but happens at login (SEC-04); the middleware remains routing-dead code. |
| BUG-22 | ✔ | Blog `?limit=` clamped (`Number.isFinite`, 1..50); admin orders whitelist `market`/`status` enums and clamp limit. |
| BUG-23 | ✔ | `name`/`description`/`categoryId` use `!== undefined`, consistent with `latin`/`originLabel`; schema min-lengths still prevent blanking. |
| BUG-24 | ✔ | `archiveProduct` no longer touches Cloudinary; the dead `deleteImage` import removed (also eliminated three pre-existing `publicId` type errors). |
| BUG-25 | ◐ | Fixed: webhook logs "marked PAID" only on the first transition (gated on the transaction result). **Not fixed (deferred, documented):** "Forgot password?" is still `href="#"` with schemas but no backend route (see FLOW-01 for why this now bites harder); footer social/WhatsApp/live-chat dead links; `SiteChrome.initialMarket` unused; `pay` state; `PASSWORD_RESET` TokenType and Subscription/WholesaleAccount/Newsletter/Review-write models route-less. |
| BUG-26 | ✔ | Cart lines capture real per-market unit prices at add time; `unitPrice()` prefers them; cards (`wPrice`) and BuyBox (`priceFor`) display real variant prices; weights offered derive from real variants. Derived multiplier survives only as demo/offline fallback. |
| BUG-27 | ◐ **REGRESSION-01** | All four export buttons wired to real CSV downloads. **Regression in the orders export:** `exportOrders` passes keys `["id","customer","email","market","status","total"]` but `backendOrderToAdmin` rows carry `totalUsd` (no `total` field) — the Total column is **empty for every live row**. (Products/dashboard/audit exports use correct keys.) Fix direction: map rows explicitly (`total: o.totalUsd`) as the products export does. Also see GAP-04 (CSV formula injection) affecting all four exports. |
| BUG-28 | ✗ | Deferred as documented — `products/page.tsx` still fetches `limit: 60` once; backend cursor pagination unused by the catalog UI. |
| BUG-29 | ✔ | Hydration merges server-only lines via `lineFromServerItem`; the empty-cart guard now reflects the server cart after hydration. |
| BUG-30 | ✔ | BuyBox initialises `saved` from `getWishlist()` on mount. Side effect noted in FLOW-05 (guest 401 churn). |
| BUG-31 | ✔ | Still-processing screen no longer asserts payment success; offers a support path with the order id. |

### Security

| ID | Status | Verification notes |
|---|---|---|
| SEC-01 | ✔ | `env.ts` superRefine refuses boot when `NODE_ENV=production` and `PAYMENTS_MODE !== 'live'`. Controller guard unchanged (defence in depth). |
| SEC-02 | ✔ | `COOKIE_SECRET` in env schema (min 32 in prod, dev fallback); `market.ts`/`market.routes.ts` consume `env.COOKIE_SECRET`. |
| SEC-03 | ✔ | Seed admin creds from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`; password required in prod, never printed. **Needs runtime verification:** rotate any previously-deployed `Admin@123!` account — the fix does not retroactively change an existing DB row. |
| SEC-04 | ✔ | Login returns 403 `EMAIL_NOT_VERIFIED` for unverified accounts (dev auto-verifies). **But this materially amplifies FLOW-01** — see below. |
| SEC-05 | ✔ | `contactLimiter` (5/hr/IP) on `/wholesale/apply`. |
| SEC-06 | ✔ | `.env.example` ships `ENABLE_DEV_ROUTES=false`; boot guard rejects `true` in production. |
| SEC-07 | ✔ | CSP `form-action` allows both PayHere origins; `API_URL` required when `PAYMENTS_MODE=live`. |
| SEC-08 | ✔ | Demo-admin grant gated behind `NEXT_PUBLIC_ENABLE_DEMO` (default off); "any password" notice and fake stats hidden outside demo mode. Server-side page protection for `/admin` still absent (client gate only; live data still 401s server-side) — acceptable residual, unchanged from first report's scoping. |
| SEC-09 | ✔ | `escapeHtml` applied in `sendLowStockAlert` (name/sku), `sendSupportNotification`, and wholesale status email. (Note: the first remediation pass initially missed the flagged function; corrected in commit `a7c03b3`.) |
| SEC-10 | ✔ | = BUG-03. Logout now receives the cookie and `revokeTokenFamily` runs. |
| SEC-11 | ✔ | Error handler relays `err.message` only when `err.expose === true` (CORS is tagged); other status<500 errors return generic "Request rejected". |
| SEC-12 | ✗ | Deferred as documented — unauthenticated `GET /orders/:id` still returns `{status,total,currency}` on cuid2 unguessability; orderId still exposed in the PayHere return_url. |
| SEC-13 | ✗ | Deferred — CI `pnpm audit` still `|| true`; zod range skew persists in package.json (currently deduped to one instance by the lockfile — see BUG-06 fragility note). |
| SEC-14 | ◐ / **FP-01** | `Hero Text Overlay.jsx` removed. **Correction to first report:** `public/image-slot.js` was characterized as "dead attack surface / editor tooling"; it is a **live production dependency** — `ImageSlot.tsx` loads it via `next/script` and the whole placeholder-image system depends on it. Removing it would break rendering. The `window.omelette` bridge inside it remains (inert outside the editor runtime) — if hardening is wanted, strip the bridge, not the file. |
| SEC-15 | ✔ | `timingSafeEqual` with length pre-check on the revalidation secret. |

### Performance

| ID | Status | Verification notes |
|---|---|---|
| PERF-01 | ✔ (source) | Migration `20260704120000_add_perf_indexes` recreates the GIN index + adds `pg_trgm` name index; Neon apply script provided. **Needs runtime verification:** indexes don't exist until `migrate deploy` / `apply-perf-indexes.ts` is run against the live DB. |
| PERF-02 | ✔ (source) | `@@index` added for `OrderItem(orderId/productId/variantId)`, `OrderEvent.orderId`, `ProductImage.productId`, `Order.couponId` + matching SQL. Same runtime caveat. |
| PERF-03 | ✗ | Deferred — per-variant sequential queries in the update transaction unchanged. |
| PERF-04 | ✗ | Deferred — product-page fetch waterfall unchanged. |
| PERF-05 | ✗ | Deferred — checkout totals still refetch per cart tick; polling not centralized. |
| PERF-06 | ✗ | Deferred — `calculateCartTotal` still re-queries within checkout. |
| PERF-07 | ✔ | `take: 500` caps on admin products/blogs/recipes/gifts lists. (Cap, not pagination — acceptable bound per fix direction.) |
| PERF-08 | ✗ | Deferred — CartContext value rebuild unchanged. |
| PERF-09 | ✗ | Deferred — Navbar rAF re-render unchanged. |
| PERF-10 | **FP-02** | Correction: the view-count write was **already fire-and-forget** (not awaited, errors swallowed) at the time of the first report. "One UPDATE per read, no dedupe" is accurate; the implied latency/blocking impact was overstated. As-designed; no change made or needed at this severity. |
| PERF-11 | ◐ | Search page still ships the preloaded index in the RSC payload (now up to 50 journal posts, so marginally *larger*), but it is now genuinely used as the offline/in-flight fallback for the live FTS wiring. Trade-off is deliberate; deferred. |
| PERF-12 | ✗ | Deferred **deliberately** — responses vary by the `x-market` cookie; a shared/public cache would leak wrong-market pricing. First report's fix direction should carry that caveat. |

### False positives / corrections summary

- **FP-01 (SEC-14):** `public/image-slot.js` is a live dependency, not dead tooling (see above).
- **FP-02 (PERF-10):** view-count write was already non-blocking fire-and-forget.
- **FP-03 (BUG-21):** accurate as written, but worth stating precisely: after the fix, `requireVerified` is *correct* yet still mounted on zero routes; the effective enforcement point is login (SEC-04).
- Everything else in the first report checked out as described at the time it was written. No fabricated findings detected.

---

## 2. Files missed by the first audit

**Inventory diff result: no pre-existing source file was missed.** Every `page.tsx` under `aranya-next/src/app`, every backend `src/**` module, prisma files, shared schemas, and config files in the repo at audit time appear in the first report's inventory. The four files below post-date the first audit (created during remediation) and were therefore never audited; they are audited here:

| File | Finding |
|---|---|
| `aranya-next/src/lib/csv.ts` | **GAP-04 (CSV formula injection)** — see Section 4. Otherwise sound (quoting/escaping correct). |
| `aranya-next/src/lib/demo.ts` | No issues. Single env-flag export, correctly defaulting off. |
| `backend/prisma/apply-perf-indexes.ts` | No issues. Idempotent (`IF NOT EXISTS`), records itself in `_prisma_migrations` mirroring the established pattern. |
| `backend/prisma/migrations/20260704120000_add_perf_indexes/migration.sql` | No issues. Matches the apply script statement-for-statement. |

One *absence* is itself a finding: there is **no `/login` page** anywhere in the app router, yet backend code redirects to it — captured as FLOW-01 below.

---

## 3. New issues found via flow tracing

**FLOW-01 — The production signup funnel is a hard dead end (verify link → 404 → login blocked → no recovery)**
- Files: [auth.controller.ts:92-99](backend/src/controllers/auth.controller.ts) (redirects to `${FRONTEND_URL}/login?verified=1|0`), `aranya-next/src/app/**` (no `login` route exists — verified by glob), entire frontend (zero references to a `verified` query param — verified by grep), [SignedOutGate.tsx](aranya-next/src/components/account/SignedOutGate.tsx) (`Forgot password?` is `href="#"`), no resend-verification route exists.
- Severity: **High** (production-blocking for every new customer)
- Description: In production, register → account unverified → login now correctly 403s (SEC-04 fix). The verification email's link hits `GET /auth/verify`, which redirects to `/login?verified=1` — **a route that does not exist** → Next.js 404. Even if the user navigates to `/account` manually, nothing reads the `verified` flag, so there is no "you're verified, sign in now" state. If the verification email failed to send (it is fire-and-forget), there is **no resend endpoint** and no password reset — the account is permanently stranded.
- Impact: every real signup either lands on a 404 at the critical moment or gets locked out entirely. The SEC-04 fix, while correct, converted this from cosmetic to funnel-breaking.
- Fix direction: redirect to an existing route (`/account?verified=1`), surface the flag in SignedOutGate, add a resend-verification endpoint.

**FLOW-02 — Admin "paid" status button silently no-ops (contract mismatch)**
- Files: [AdminOrders.tsx:127](aranya-next/src/components/admin/AdminOrders.tsx) (`STATUS_FLOW = ["paid", "processing", "shipped", "delivered"]`, drawer buttons at :191 call `onStatus(o, s)` for each), [AdminOrders.tsx](aranya-next/src/components/admin/AdminOrders.tsx) `setStatus` sends `status.toUpperCase()` via `bestEffort`, vs [order.admin.controller.ts:8-12](backend/src/controllers/admin/order.admin.controller.ts) `updateOrderSchema` enum `['PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED']` — **no `PAID`**.
- Severity: Medium
- Description: Clicking the "paid" step in the order drawer PATCHes `{status: "PAID"}`, which Zod rejects (400). `bestEffort` swallows the rejection; the optimistic UI shows the order as paid.
- Impact: an admin can "set" an order to paid and the change never persists — same silent-failure class as BUG-07, one status value that slipped through.
- Fix direction: either remove "paid" from the clickable flow (it's a gateway-owned status) or add `PAID` to the enum; and stop using `bestEffort` for status writes (surface errors like the refund fix does).

**FLOW-03 — Scheduled blog posts can never publish (scheduledAt is never sent)**
- Files: [AdminBlog.tsx](aranya-next/src/components/admin/AdminBlog.tsx) (schedule Date/Time inputs are uncontrolled `defaultValue` and **never read**; `save()` sends `{title, slug, content, status: "SCHEDULED", tags, seoDesc}` — no `scheduledAt`), [blog.admin.controller.ts](backend/src/controllers/admin/blog.admin.controller.ts) (`scheduledAt` optional, stored null), [scheduler.ts](backend/src/jobs/scheduler.ts) (publishes where `scheduledAt <= now` — null never matches).
- Severity: Medium
- Description: The "Schedule" publishing mode creates a post with `status: SCHEDULED` and `scheduledAt: null`. The cron job's predicate can never select it. The post is stuck in SCHEDULED forever unless manually re-saved as "Publish now".
- Impact: the scheduling feature is entirely decorative end-to-end, while the UI promises "Goes live automatically on …".
- Fix direction: make the date/time inputs controlled and send ISO `scheduledAt`; consider requiring `scheduledAt` when `status === 'SCHEDULED'` in the schema.

**FLOW-04 — Market switch with a non-empty cart strands the user at checkout**
- Files: [product.service.ts:105-115](backend/src/services/product.service.ts) (`buildProductIncludes` market-filters variants, so a live product arrives with only one market's real prices), [cart.ts](aranya-next/src/lib/cart.ts) (`unitPrice` falls back to derived `base100 × multiplier` for the missing market), [checkout.controller.ts:56-67](backend/src/controllers/checkout.controller.ts) (cross-market lines → 409 "no longer available in this store").
- Severity: Medium
- Description: Add items in the intl store, switch to the LKR store. Displayed line prices silently switch to the *derived* LKR estimate (`unitLkr` is undefined because the LKR variant was never fetched), while the server cart still holds INTERNATIONAL variants. Checkout then 409s and asks the user to remove the items manually; nothing in the cart UI offers to re-add them as local-market variants or auto-clear.
- Impact: displayed prices are estimates after a market switch, and checkout is blocked with a manual-cleanup error — a confusing dead end for a legitimate action the header explicitly offers.
- Fix direction: on market switch, re-resolve each line's variant for the new market (data is one `listProducts` call away) or prompt to clear/convert the cart.
- What-if coverage: refresh mid-flow re-hydrates from the server cart (still cross-market → same 409); empty cart unaffected; unauthorized N/A.

**FLOW-05 — Every guest product-page view fires an authenticated wishlist call → 401 → refresh churn**
- Files: [BuyBox.tsx](aranya-next/src/components/product/BuyBox.tsx) (`getWishlist()` on mount whenever `product.id` exists), [http.ts:109-115](aranya-next/src/lib/api/http.ts) (401 + `auth:true` triggers a single-flight `POST /api/auth/refresh` then a replay).
- Severity: Low
- Description: For guests (no token, no refresh cookie), each PDP view produces `GET /wishlist` → 401 → `POST /auth/refresh` → 401 → replayed `GET /wishlist` → 401 → caught. Three wasted requests per view, plus backend `authLimiter` consumption on `/auth/refresh` (50/15min/IP) — a guest browsing ~50 products in 15 minutes starts getting 429s on the refresh endpoint, which would then also break a *real* login attempt's silent-refresh from that IP.
- Impact: network noise; plausible rate-limit interference for heavy anonymous browsers.
- Fix direction: skip the wishlist fetch when there is no in-memory access token (`getAccessToken()`), or don't auto-refresh on this call.

**FLOW-06 — Offline-accepted demo promo can block checkout after reconnect**
- Files: [CartContext.tsx](aranya-next/src/components/CartContext.tsx) (`applyPromo` offline fallback accepts `CONFIG` codes), [CheckoutClient.tsx:561](aranya-next/src/components/checkout/CheckoutClient.tsx) (sends `couponCode: cart.promo`), [checkout.controller.ts:85-89](backend/src/controllers/checkout.controller.ts) (unknown code → 400).
- Severity: Low
- Description: With the API briefly unreachable, `CEYLON10` is accepted locally. Once the API is back, checkout submits it as `couponCode`; if it isn't a real DB coupon, `create-intent` 400s and checkout is blocked until the user clears the promo (residual corner of BUG-05).
- Fix direction: drop (or re-validate) a locally-accepted promo before submit; on the specific 400, auto-clear the promo and retry.

**Flows verified working (no new issues):** session survives reload (refresh cookie rescoped path → `/api/auth/refresh` → `/auth/me`); sign-out revokes server-side; add→update→remove cart round-trip including rollback paths; guest checkout LKR/USD routing incl. stub mode; webhook idempotency + oversell flagging + cart clearing by `cartId`; refund concurrency (updateMany guard); checkout empty-cart guard post-hydration; wrong-password / expired-session / out-of-stock / invalid-input error paths (post-ZodError-fix all return 4xx with messages that now surface via `makeError`); admin exports for products/dashboard/audit (orders export has REGRESSION-01); order appears in account history with correct status/timeline/total.

---

## 4. New issues from Step-3 category hunting

**GAP-01 — `PATCH /auth/me` silently drops `phone` (contract mismatch)**
- Files: [auth.ts:55-58](aranya-next/src/lib/api/auth.ts) (`patchMe(input: { name?, phone? })`), [auth.controller.ts patchMe](backend/src/controllers/auth.controller.ts) (destructures only `name`), `shared` `patchMeSchema` (no `phone`).
- Severity: Medium (silent data loss in a settings form)
- Impact: any profile UI offering a phone field appears to save and discards the value.
- Fix direction: either add `phone` to the schema/User model or remove it from the client type.

**GAP-02 — Environment documentation drift (config referenced in code, absent from .env.example)**
- Files: [backend/.env.example](backend/.env.example) vs code:
  - `DIRECT_URL` — **required by [seed.ts:8](backend/prisma/seed.ts) with no fallback** (`connectionString: process.env.DIRECT_URL`); a seed run configured strictly per `.env.example` connects with `undefined` and fails. (`seed-catalog.ts` has a `DATABASE_URL` fallback; `seed.ts` does not.)
  - `ADMIN_EMAIL` / `SUPPORT_EMAIL` — low-stock alerts and the new contact/wholesale notifications silently fall back to sending to `EMAIL_FROM` (the *from* address) when unset.
  - `LKR_USD_RATE` — analytics normalisation (default 300), undocumented.
  - [aranya-next/.env.example](aranya-next/.env.example): missing `NEXT_PUBLIC_ENABLE_DEMO` (the new demo gate — a reviewer following the example can't discover how to enable demo mode).
- Severity: Medium (the `DIRECT_URL` item breaks a documented workflow; the rest are silent misrouting)
- Fix direction: add the four variables with comments; give `seed.ts` a `DATABASE_URL` fallback.

**GAP-03 — Three different LKR→USD rates across admin surfaces**
- Files: [AdminOrders.tsx:13,28](aranya-next/src/components/admin/AdminOrders.tsx) (`/ 148` hardcoded — order list totals and per-item prices), [analytics.admin.controller.ts](backend/src/controllers/admin/analytics.admin.controller.ts) (`LKR_USD_RATE` default **300**), [AdminDashboard.tsx:163](aranya-next/src/components/admin/AdminDashboard.tsx) ("Local (LKR ÷300 est.)"), [account-data.ts](aranya-next/src/lib/account-data.ts) (customer-facing `/148`, partially superseded by real totals).
- Severity: Medium
- Description: The same LKR order shows a USD figure computed at 148 in the admin orders table and at 300 in dashboard revenue/top-products. First audit flagged the hardcoded FX only in `account-data.ts` (BUG-18); the admin-side instances are companions that survived remediation.
- Impact: admin revenue and order-list numbers disagree with each other by ~2× for local orders.
- Fix direction: single conversion constant (env-driven) shared by all admin surfaces — or stop converting and display native currency per order.

**GAP-04 — CSV formula injection in all admin exports (new file, new issue)**
- Files: [csv.ts](aranya-next/src/lib/csv.ts) (`escapeCell` quotes/escapes but does not neutralize leading `=`, `+`, `-`, `@`), fed by user-influenced values: customer names/emails (orders export), product names (products export), audit `meta`/actor (audit export).
- Severity: Medium (classic CSV/formula injection — a customer named `=HYPERLINK(...)` or a crafted product name executes when the admin opens the export in Excel/Sheets)
- Fix direction: prefix cells starting with `=+-@` (or tab/CR) with `'` in `escapeCell`.

**GAP-05 — Cart-add stock check races (TOCTOU)**
- Files: [cart.service.ts:98-121](backend/src/services/cart.service.ts) (`addToCart` reads existing quantity, checks stock, then upserts `quantity: { increment } }` — check and write are not atomic).
- Severity: Low
- Description: two concurrent adds (double-click, two tabs) can both pass the stock check and push cart quantity above stock. The payment-time atomic decrement (webhook) is the real guard, and checkout re-validates — so money is safe; the user just discovers the shortfall later (409 at checkout).
- Fix direction: conditional upsert with a stock re-check in one statement, or tolerate as designed (documented backstop).

**GAP-06 — Timezone/locale: server-formatted dates baked into ISR pages**
- Files: [journal-data.ts toPost](aranya-next/src/lib/journal-data.ts) (`toLocaleDateString("en-US", …)` runs at build/revalidate time in the server's TZ), [account-data.ts](aranya-next/src/lib/account-data.ts) (`toLocaleDateString("en-GB", …)` client-side), [scheduler.ts](backend/src/jobs/scheduler.ts) (publish comparison on server clock), admin date inputs (naive local datetime).
- Severity: Low
- Description: journal dates are frozen in the build server's timezone/locale while account/admin dates render in the browser's; a post published 23:30 UTC-5 can display a different calendar date in the journal list than in the admin table. No data corruption — purely display inconsistency — but worth a convention (format everything from ISO with an explicit TZ).

**GAP-07 — `getRecentBlog` client function now unused (dead export after search rewiring)**
- Files: [blog.ts:16-18](aranya-next/src/lib/api/blog.ts) — `getRecentBlog` had one caller (search page), which now uses `listBlog`. Backend route `/blog/recent` still exists.
- Severity: Info
- Fix direction: remove or keep intentionally; noted so the next audit doesn't re-flag the route as orphaned without context.

---

## Closing inventory statement

All 58 first-report findings verified (Section 1); all six mandated flows plus gifts, wholesale/contact, journal-publish, and search journeys traced (Section 3); contract/env/currency/date/concurrency/empty-state sweeps completed (Section 4). Empty-state checks found no crashes: zero-order dashboards guard division (`totalRev > 0`), empty search shows suggestion state, empty reviews shows the new empty card, empty admin lists render header rows.

Not covered at full depth, consistent with the first report's own disclosure: assertion-level correctness of the 8 backend `*.test.ts` suites, `globals.css` responsive breakpoints, and pixel-level layout of marketing pages. Runtime-dependent verifications outstanding (need a live DB/deploy): Phase-5 indexes actually applied, gift seed run, `@aranya/shared` rebuilt, rotation of any previously-seeded `Admin@123!` credential.

**Highest-priority takeaways from this pass:** FLOW-01 (signup funnel 404/lockout — production-blocking), FLOW-03 (scheduling silently broken), REGRESSION-01 (orders CSV empty Total column), GAP-03 (2× FX discrepancy inside the admin), GAP-04 (CSV injection).

*Flag-only audit — no code was modified.*

---

# Remediation Action Plan (Pass 2)

_Added 2026-07-06. Ordered by risk and dependency — same convention as AUDIT_REPORT.md's plan. Each phase is independently shippable and testable. Effort is rough dev-time; Risk is the chance a fix destabilises something else. Items marked **needs runtime** can't be fully verified without a live DB/deploy._

## Phase A — Production blockers (do first)

The signup funnel is broken end-to-end for real customers; nothing else matters if new users can't get in.

| ID | Fix | Files | Effort | Risk |
|---|---|---|---|---|
| **FLOW-01** | (1) redirect `GET /auth/verify` to an existing route — `${FRONTEND_URL}/account?verified=1|0` instead of `/login`; (2) read `?verified=` in the account page / `SignedOutGate` and show a "verified — sign in now" / "link expired" banner; (3) add `POST /auth/resend-verification` (rate-limited, anti-enumeration neutral) and a "resend link" affordance; (4) at minimum, make "Forgot password?" honest — hide it until the reset route exists, OR wire `forgotPasswordSchema`/`resetPasswordSchema` to real `/auth/forgot-password` + `/auth/reset-password` routes (the schemas already exist). | [auth.controller.ts:92-99](backend/src/controllers/auth.controller.ts), [auth.routes.ts](backend/src/routes/auth.routes.ts), [SignedOutGate.tsx](aranya-next/src/components/account/SignedOutGate.tsx), [account/page.tsx](aranya-next/src/app/account/page.tsx), token.service | M–L | Med |

**Exit criteria:** register → click email link → land on a real page that tells you to sign in → sign in succeeds. A missing/expired link has a resend path.

> Minimum viable slice if time-boxed: steps (1)+(2) alone convert a 404 into a working "please sign in" screen and unblock the funnel. Steps (3)+(4) are the completeness follow-up.

## Phase B — Silent failures & data integrity

Each of these makes the UI *claim success* while the real outcome is wrong or lost — the most dangerous class because it hides.

| ID | Fix | Files | Effort | Risk |
|---|---|---|---|---|
| **REGRESSION-01** | Map orders-export rows explicitly (`total: o.totalUsd`, and format it), the way the products export already does — don't pass a key (`total`) the row objects don't have. | [AdminOrders.tsx](aranya-next/src/components/admin/AdminOrders.tsx) (`exportOrders`) | S | Low |
| **GAP-04** | In `escapeCell`, prefix any cell whose first char is `= + - @` (or tab/CR/LF) with a leading `'` before quoting. One-line hardening; protects all four exports. | [csv.ts](aranya-next/src/lib/csv.ts) | S | Low |
| **FLOW-02** | Remove `"paid"` from the clickable `STATUS_FLOW` (it's a gateway-owned status, not an admin action) **or** add `PAID` to `updateOrderSchema`. Also stop routing status writes through `bestEffort` — surface the error like the refund fix (`actionError`). | [AdminOrders.tsx:127,310-314](aranya-next/src/components/admin/AdminOrders.tsx), [order.admin.controller.ts:8-12](backend/src/controllers/admin/order.admin.controller.ts) | S–M | Low |
| **FLOW-03** | Make the schedule Date/Time inputs controlled state; on save with `status: "SCHEDULED"` send an ISO `scheduledAt`; in `createBlogSchema`/`updateBlogSchema` require `scheduledAt` when status is SCHEDULED (superRefine). | [AdminBlog.tsx](aranya-next/src/components/admin/AdminBlog.tsx), [blog.admin.controller.ts](backend/src/controllers/admin/blog.admin.controller.ts) | M | Low |
| **GAP-01** | Decide `phone`'s home: add it to `User` + `patchMeSchema` + `patchMe` destructure/DB write (needs a migration), **or** remove `phone` from the client `patchMe` type and any UI field. Don't leave a field that silently no-ops. | [auth.ts:55-58](aranya-next/src/lib/api/auth.ts), [auth.controller.ts patchMe](backend/src/controllers/auth.controller.ts), shared `patchMeSchema`, schema.prisma (if persisting) | S–M | Low–Med (migration) |

**Exit criteria:** exports contain correct, injection-safe data; admin status changes either persist or show an error; scheduled posts actually go live; no settings field silently discards input.

## Phase C — Correctness (regressions + currency)

Wrong numbers, but not silently claimed-successful — lower urgency than Phase B, higher than config.

| ID | Fix | Files | Effort | Risk |
|---|---|---|---|---|
| **REGRESSION-02** | Order the fetch by real min variant price at the DB level for `price_asc/desc` — raw SQL returning ranked IDs (join Variant, `MIN(price)` per product, market-filtered) then fetch+preserve order, mirroring the FTS pattern; or add a denormalised `minPrice` column maintained on variant writes. Removes the page-local sort. | [product.service.ts:172-205](backend/src/services/product.service.ts) | M–L | Med (raw SQL, **needs runtime**) |
| **REGRESSION-03** | Honour `cursor` in the FTS branch: apply keyset/`OFFSET` on the ranked ID query so page 2 differs from page 1. | [product.service.ts:154-171](backend/src/services/product.service.ts) | M | Med (**needs runtime**) |
| **GAP-03** | Single source of truth for LKR→USD: one env-driven constant (reuse `LKR_USD_RATE`) shared by `AdminOrders` (replace the `/148`), analytics, and the dashboard label — or stop converting and show native currency per order. Pick one rate and apply everywhere. | [AdminOrders.tsx:13,28](aranya-next/src/components/admin/AdminOrders.tsx), [analytics.admin.controller.ts](backend/src/controllers/admin/analytics.admin.controller.ts), [AdminDashboard.tsx:163](aranya-next/src/components/admin/AdminDashboard.tsx) | M | Low |
| **BUG-18 residual** | Format each account order in `o.currency` (not the global market toggle's symbol) so an LKR order never shows a `$` sign. | [account-data.ts](aranya-next/src/lib/account-data.ts) (`acFmt` call sites), AccountDashboard/AccountTracking | S–M | Low |

**Exit criteria:** price sort is globally correct across pages; FTS pagination advances; every admin/customer surface shows the same currency figure for the same order.

## Phase D — Config, contracts & robustness

Won't crash today, but breaks documented workflows or specific edge journeys.

| ID | Fix | Files | Effort | Risk |
|---|---|---|---|---|
| **GAP-02** | Add `DIRECT_URL`, `ADMIN_EMAIL`, `SUPPORT_EMAIL`, `LKR_USD_RATE` to `backend/.env.example` (with comments) and `NEXT_PUBLIC_ENABLE_DEMO` to `aranya-next/.env.example`; give `seed.ts` a `DATABASE_URL` fallback so the documented seed workflow doesn't connect with `undefined`. | [backend/.env.example](backend/.env.example), [aranya-next/.env.example](aranya-next/.env.example), [seed.ts:8](backend/prisma/seed.ts) | S | Low |
| **BUG-06 fragility** | Pin one zod version workspace-wide (align backend `^3.23.8` to shared `^3.25.76`), OR make the handler duck-type (`err?.name === 'ZodError' && Array.isArray(err.issues)`) so a future dual-instance install can't silently revert cart/checkout to 500s. | backend/package.json + shared/package.json (or [index.ts](backend/src/index.ts) handler) | S | Low–Med (dep bump) |
| **FLOW-04** | On market switch with a non-empty cart, re-resolve each line's variant for the new market (one `listProducts` call) and update `variantId`/prices, or prompt to clear/convert — instead of stranding the user at a 409. | [CartContext.tsx](aranya-next/src/components/CartContext.tsx), [MarketContext.tsx](aranya-next/src/components/MarketContext.tsx), [cart.ts](aranya-next/src/lib/cart.ts) | M–L | Med |
| **FLOW-05** | Skip the BuyBox `getWishlist()` fetch when there's no in-memory access token (`getAccessToken()`), so guests don't trigger 401→refresh→401 churn (and `authLimiter` pressure). | [BuyBox.tsx](aranya-next/src/components/product/BuyBox.tsx) | S | Low |
| **FLOW-06 / BUG-05 residual** | Before checkout submit, drop or re-validate a locally-accepted promo; on the specific "coupon not valid" 400, auto-clear the promo and retry so an offline-accepted `CEYLON10` can't wedge checkout. | [CartContext.tsx](aranya-next/src/components/CartContext.tsx), [CheckoutClient.tsx:561](aranya-next/src/components/checkout/CheckoutClient.tsx) | S–M | Low |

**Exit criteria:** a fresh clone configured per `.env.example` seeds and runs; validation errors can't regress to 500s; market switch and offline-promo edge journeys don't dead-end.

## Phase E — Low severity, cleanup & deferred carry-over

Batch as time allows. Includes AUDIT_REPORT.md carry-overs still open.

| ID | Fix direction | Effort |
|---|---|---|
| **BUG-19(a)** | Sequence cart quantity writes (queue/abort in-flight PATCH, or send deltas) so rapid +/− can't land out of order. | M |
| **BUG-19(c)** | Add a server cart-clear (new endpoint or `updateCartItem qty:0` loop) so `clear()` clears the server cart on abandoned flows, not just localStorage. | S–M |
| **BUG-20 residual** | Feed AdminShell a real `pendingCount` (not `18`); gate the admin list demo-row fallback behind `DEMO_MODE` so a transient live-fetch failure doesn't show fabricated orders/products; replace fabricated account tier/points or gate them. | M |
| **BUG-25 residual** | Make dead links honest — remove/disable footer social/WhatsApp/live-chat `href="#"`, remove unused `SiteChrome.initialMarket` / `pay` state; prune route-less models or add routes. | S–M |
| **GAP-05** | Make cart-add stock check atomic (conditional upsert re-checking stock in one statement), or document the payment-time decrement as the authoritative backstop. | S |
| **GAP-06** | Format all dates from ISO with an explicit timezone convention so journal (build-time, server TZ) and account/admin (client TZ) agree. | S–M |
| **GAP-07** | Remove the now-unused `getRecentBlog` client export (and decide whether `/blog/recent` stays). | S |
| **SEC-14 residual** | If hardening is wanted, strip the `window.omelette` persistence bridge from `public/image-slot.js` (keep the file — it's a live dependency), don't delete it. | S |
| **PERF-03/04/05/06/08/09/11** | Micro-optimizations carried over from AUDIT_REPORT.md — batch queries, parallelize waterfalls, debounce totals, memoize context. | Varies |
| **SEC-12 / SEC-13 / BUG-28** | Carry-overs: guest order-status hardening, CI `pnpm audit` gating, real catalog cursor pagination. | Varies |

## Cross-cutting: verification checklist

Because several fixes need a live environment, before signing off run:
1. `pnpm --filter @aranya/shared build` then `pnpm -r typecheck` — clears the stale-dist `fields.status` errors and confirms no new type breaks.
2. `prisma migrate deploy` (or `tsx prisma/apply-perf-indexes.ts`) + `prisma generate`; re-run the gift seed.
3. Manual pass of the six Section-3 flows against a running stack — especially FLOW-01 end-to-end (register → email link → sign in) and FLOW-03 (schedule a post, confirm the cron publishes it).
4. Open every CSV export in a spreadsheet app with a formula-injection test row (a customer/product named `=1+1`) to confirm GAP-04.

## Suggested sequencing

Phase A → B are the "ship before launch" set (funnel + silent-failure/data-integrity). C is "correct the numbers." D is "don't get surprised in prod." E is opportunistic. A/B/C are largely independent and can be parallelised; the currency items (GAP-03, BUG-18 residual) are best done together since they share the FX-constant decision.
