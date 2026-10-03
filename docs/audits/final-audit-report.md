# Final Audit Report — Aranya Ceylon — 2026-10-03

Status legend: `pending` | `in-progress` | `done` | `skipped (reason)` | `decision` (needs an owner decision, not a code fix)

Audited commit: **`Develop` @ `75dcdb6`** (Merge PR #170, `codex/performance-phases-0-8`).
Mode: audit only — **no code was changed**. Fixes proceed one wave at a time after sign-off.

---

## 1. Verdict

The project is **feature-complete but not release-ready**. The architecture is sound and most of the hard
problems (webhook idempotency, atomic stock reservation, refresh rotation, SQL parameterisation, CSP,
sanitisation) are done properly. But this pass found **8 release blockers** that earlier audits missed,
mostly at the seams between the two apps and between code and configuration:

1. The storefront framework (`next@14.2.35`) has **two critical unauthenticated-RCE advisories** with no fix on the 14.x line.
2. A **race in checkout** lets an order be created with more units than were charged for.
3. Any anonymous visitor can **reserve the entire stock for 24 h** without paying.
4. A transient DB error inside a payment webhook **crashes the API process**.
5. By default **all visitors share one rate-limit bucket** (10 logins / 15 min for the whole site).
6. Every page load calls `/auth/refresh`; when that is rate-limited the **cart silently stops syncing**.
7. A required Stripe variable is **undocumented and unvalidated** — international checkout is dead without it.
8. The storefront **promises free shipping and prices the backend never honours**.

Counts: **8 blockers · 9 payment/order-integrity · 9 auth/session · 14 functional bugs · 7 missing features ·
7 performance/scale · 11 deploy/CI/docs** = 65 findings, plus a dead-code inventory (§10).

---

## 2. Scope and method

| Area | Coverage |
|---|---|
| `backend/src` (non-test, ~8.7k lines) | Read in full: every route, controller, service, middleware, job, lib, raw-SQL builder |
| `backend/prisma` | Schema read in full; migrations and seeds checked by targeted search |
| `shared/src` | Read in full |
| `aranya-next/src` (~19.5k lines) | Read in full: BFF proxy, middleware/CSP, HTTP client, auth/cart/market contexts, checkout + payment, public cache, sanitiser, admin gate/API. Presentational components checked by search and tooling, not line by line |
| CI/CD, env examples, deployment docs | Read and cross-checked against the code |
| `scripts/performance` (57 files) | Tooling scan only |

Tooling evidence (run in this worktree on a frozen-lockfile install):

| Check | Result |
|---|---|
| `pnpm typecheck` | Pass — all 3 workspaces |
| `pnpm lint` | Pass — 0 errors, 0 warnings (backend and storefront) |
| `pnpm test:unit` | **525 / 527 pass.** 2 failures in `email.service.test.ts` are a cold-import timeout plus its cascade; the file passes 10/10 in isolation (finding #61) |
| `pnpm audit --prod` | **55 vulnerabilities: 2 critical, 19 high, 27 moderate, 7 low** |
| `pnpm audit` (all deps) | 87 vulnerabilities: 2 critical, 41 high, 36 moderate, 8 low |
| `knip` (unused files / exports / deps) | 81 files, 69 exports, 18 types flagged — triaged by hand in §10 |
| Manual probe | `@node-rs/bcrypt` verify against the login dummy hash: **0 ms** vs **202 ms** for a real hash (finding #18) |

**Not verified (limits of this pass):** nothing was run against a live database, Stripe or PayHere. Integration
tests, Playwright e2e and a production `next build` were not executed here. Race findings (#2, #10, #19) are
established by reading the code paths, not by reproducing them. Advisory details in #1 are as reported by
`pnpm audit`; exploitability against this specific deployment was not tested.

**Housekeeping note:** this worktree was created from `main` (`6daa96b`), which is 8 commits behind `Develop`.
It was moved onto `origin/Develop` before auditing; the branch had no commits of its own.

---

## 3. Wave 1 — Release blockers

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 1 | Critical | `aranya-next/package.json:20` | **`next@14.2.35` carries 2 critical unauthenticated-RCE advisories** — GHSA-p293-qw3h-jr36 (Windows-hosted servers, `>=13.4.0 <15.5.24`) and GHSA-2xp9-vwfh-vxw4 (Image Optimization API with AVIF, `>=10.0.0 <15.5.24`) — plus 8 high (DoS in RSC / App Router, SSRF via server actions and rewrites, middleware bypass) and several moderate (request smuggling, XSS, cache poisoning). Patched only in `>=15.5.24`; **there is no 14.x fix**. CI cannot catch this: the audit step is `\|\| true` (#58). | Upgrade to Next `>=15.5.24` (with React 19, async `params`/`cookies()`, `serverComponentsExternalPackages` rename). This is a real migration — plan it as its own phase and re-run the browser acceptance suite. Interim: keep the origin behind the Cloudflare WAF and review whether the built-in image optimizer can be taken out of the request path until the upgrade lands. | done (Next 15.5.27 / React 19.3, see §17) |
| 2 | High | `backend/src/controllers/checkout.controller.ts:63-66, 126-127, 213-218`; `backend/src/services/cart.service.ts:268-271` | **Order lines and order total come from two different cart reads.** `createIntent` reads the cart (L63) and later builds `OrderItem`s and stock reservations from that snapshot, but the total is computed by `calculateCartTotal`, which **re-reads the cart from the DB**. Lowering a quantity (`PATCH /cart/items/:id`) between the two reads yields an order for N units charged at fewer. The webhook compares the payment to `order.total`, so it confirms. The window is 1–3 DB round trips (wider with a coupon), reachable with a simple concurrent script. | Compute totals from the same in-memory `cart.items` snapshot: split `calculateCartTotal` into a pure function over items and call it with the already-loaded lines, ideally inside the reservation transaction. Add a concurrency test alongside `checkout.concurrency.integration.test.ts`. | done |
| 3 | High | `backend/src/controllers/checkout.controller.ts:140-222`; `backend/src/jobs/scheduler.ts:125`; `aranya-next/src/components/checkout/CheckoutClient.tsx:486-549` | **Unpaid checkouts hoard stock for 24 h.** Every `POST /checkout/create-intent` creates a new `PENDING` order and decrements stock; nothing cancels or reuses the previous `PENDING` order for the same cart, and the sweep only releases after `STALE_ORDER_HOURS = 24`. (a) A guest can reserve up to 99 units per line — and open as many guest carts as they like — holding stock for a day without paying, repeatedly. (b) A genuine shopper who reloads or retries on the last unit gets `409` against their own earlier reservation — the frontend keeps the intent only in React state. | On create-intent, cancel-and-release (or reuse) any existing `PENDING` order for the same `cartId` before reserving. Cut the reservation TTL to ~30–60 min. Consider capping units reserved per guest cart. | done |
| 4 | High | `backend/src/routes/webhook.routes.ts:8-19`; `backend/src/index.ts` (no rejection handler) | **Webhook handlers are async but not wrapped in `asyncHandler`** (Express is 4.22.1, which does not catch async rejections), and the process has no `unhandledRejection` handler. Any thrown error in `stripeWebhook` / `payHereWebhook` — e.g. a transient Neon error during `confirmOrderPaid` — becomes an unhandled rejection, which **terminates the Node process** and leaves the gateway's request hanging. A DB blip during a payment burst restarts the API. | Wrap both handlers in `asyncHandler` and make the error path return `500` (Stripe) / a non-`OK` body (PayHere) so the gateway retries. Add a process-level `unhandledRejection` logger as a backstop. | done |
| 5 | High | `aranya-next/src/app/api/[...path]/route.ts:17-33, 51-61`; `backend/src/middleware/rateLimit.ts`; `backend/.env.example:29-30` | **All browser traffic shares one rate-limit bucket by default.** The BFF strips `x-forwarded-for` / `cf-connecting-ip` and only attaches a signed client IP when `BFF_CLIENT_IP_SECRET` is set (default: unset; backend `BFF_CLIENT_IP_REQUIRED=false`). Otherwise Express sees every request from the Next server's IP: **10 logins / 15 min, 50 auth calls / 15 min, 20 checkouts / 15 min, 5 contact messages / hour and 120 requests / min for the whole site.** One person can lock everyone out of login. `TRUST_CLOUDFLARE` cannot help because the BFF removes that header. Only the single-VPS template in `docs/performance/RELEASE_RUNBOOK.md:28` configures this; `docs/operations/deployment-checklist.md` does not mention it. | Treat signed BFF identity as mandatory in production: fail the boot when `NODE_ENV=production` and it is not configured, and document the ingress requirement in the deployment checklist. If a PaaS topology is intended, define how the real client IP reaches Next there. | in-progress (warning + docs; enforcement awaits hosting decision) |
| 6 | High | `aranya-next/src/components/AuthContext.tsx:62-90`; `aranya-next/src/lib/api/http.ts:58-61`; `aranya-next/src/components/CartContext.tsx:123, 158`; `backend/src/routes/auth.routes.ts:21` | **Every full page load by any visitor — including anonymous ones — calls `POST /auth/refresh`**, which sits behind `authLimiter` (50 / 15 min per IP). A `429` is not a `401`, so `refreshSession` throws, `AuthContext` sets `sessionError`, and `CartContext` treats the session as not ready: queued cart mutations wait indefinitely, so **add-to-cart stops reaching the server**. With #5 this trips at ~3 page loads per minute site-wide; even with per-IP identity it affects shared IPs (carrier-grade NAT is the norm on Sri Lankan mobile networks). | Skip the boot refresh when there is no session hint (set a non-HttpOnly `has_session` marker cookie alongside the refresh cookie), exempt/raise the limit for `/auth/refresh`, and treat `429` as "unknown session, proceed as guest" instead of a blocking error. | done |
| 7 | High | `backend/src/controllers/checkout.controller.ts:324`; `backend/src/config/env.ts:96-101`; `aranya-next/src/components/checkout/StripePaymentForm.tsx:83-86`; `aranya-next/src/components/checkout/CheckoutClient.tsx:717-721` | **`STRIPE_PUBLISHABLE_KEY` is required but undocumented and unvalidated.** It appears nowhere in `backend/.env.example`, the README or the deployment checklist, and is not in the live-mode required list. Unset, the API returns `publishableKey: ''`; the payment form gets `stripe = null` and the Pay button stays disabled forever — after the order and stock reservation were already created. Separately, the checkout page shows a developer hint about `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (a variable used nowhere else and absent from `aranya-next/.env.example`) **to every international customer**. | Add `STRIPE_PUBLISHABLE_KEY` to the `PAYMENTS_MODE=live` required keys, `.env.example` and the checklist. Remove or dev-gate the hint text (copy change — needs your sign-off). | done |
| 8 | High | `aranya-next/src/lib/cart.ts:24-25`; `aranya-next/src/components/product/BuyBox.tsx:206`; `aranya-next/src/components/marketing/ShippingClient.tsx:63, 75`; `aranya-next/src/components/cart/CartDrawer.tsx:105-108`; `aranya-next/src/components/checkout/CheckoutClient.tsx:115-116, 483`; `backend/src/services/cart.service.ts:12-21` | **Displayed shipping does not match what is charged.** The storefront advertises "Free shipping over $60" / "Free standard delivery over Rs 5,000" and the drawer estimates $8.50 / Rs 650 standard; the express option is labelled "$18.00" / "Rs 1,500". The backend charges a flat **$4.99 / $12.99** and **Rs 350 / Rs 650** and has **no free-shipping threshold at all**. A customer promised free shipping is charged for it. | Decide the real policy, then make one side authoritative: either implement the threshold and rates in `calculateCartTotal`, or change the copy and client constants. Ideally the client reads rates from an API field rather than duplicating them. | done (backend rates authoritative; verified in browser) |

---

## 4. Wave 2 — Payments and order integrity

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 9 | High | `backend/src/controllers/webhook.controller.ts:53-57, 205-242`; `backend/src/jobs/scheduler.ts:144-146` | **A payment that arrives after cancellation is silently dropped.** Cancelling an order (stale sweep, PayHere cancel, admin) never cancels the Stripe PaymentIntent, so its client secret stays payable. When the late `payment_intent.succeeded` (or PayHere status `2`) arrives, `confirmOrderPaid` finds no `PENDING` row, returns `null`, and the handler acks `200`. Result: customer charged, order `CANCELLED`, stock released, no email, no alert. | Cancel the PaymentIntent when cancelling an order. In the webhook, detect "paid but not PENDING" and raise it: write an `OrderEvent`, alert `ADMIN_EMAIL`, and either auto-refund or mark for manual review. | done (see §13–14) |
| 10 | Medium | `backend/src/controllers/admin/order.admin.controller.ts:106-176` | **Admin status updates have no transition rules.** `PATCH /admin/orders/:id` accepts any target from any state: `PENDING → SHIPPED` (unpaid order shipped), `PAID → REFUNDED` or `CANCELLED` with no gateway refund and no restock, `REFUNDED → DELIVERED`. `before` is read outside the transaction, so a webhook flipping the order to `PAID` in between is overwritten, and a double-click on cancel restocks twice. The `PENDING → CANCELLED` branch releases stock but **not the coupon reservation** (the webhook cancel path does). | Define an allowed-transition map; apply the change with a conditional `updateMany` on the expected current status; route cancellation through `cancelOrderAndReleaseStock`; keep `REFUNDED` exclusive to the refund endpoint. | done |
| 11 | Medium | `backend/prisma/schema.prisma:337-348`; `backend/src/services/cart.service.ts:38-40` | **Fixed-amount coupons are currency-blind.** `Coupon` has no market or currency, and `FIXED_AMOUNT` is applied as that many units of whatever currency the cart uses — a coupon worth Rs 500 is worth $500 in the international store (clamped to the subtotal, i.e. free goods). | Add `currency` (or `market`) to `Coupon` and reject mismatches, or restrict to percentage coupons until then. | done |
| 12 | Medium | `backend/src/services/payhere.service.ts:5`; `backend/src/config/env.ts` | **`PAYHERE_MODE` defaults to `sandbox` and is not validated.** A production deploy with `PAYMENTS_MODE=live` but `PAYHERE_MODE` unset sends real local customers to the PayHere sandbox. With sandbox merchant credentials that means orders marked `PAID` for no money. | In production require `PAYHERE_MODE` to be set explicitly; add a matching sanity check that live mode is not combined with an `sk_test_` Stripe key unless a staging flag says so. | done |
| 13 | Medium | `backend/src/services/product.service.ts:294-308` | **Saving a product in admin overwrites stock with the value the form loaded.** Variants are written with an absolute `stock`. If orders reserve units between opening the editor and saving, those reservations are erased and the product can oversell. Any edit to a live product — even a description fix — has this effect. | Send stock as a delta, or only write `stock` when the admin actually changed it and guard with the value originally loaded (optimistic concurrency). | done |
| 14 | Medium | `backend/src/controllers/webhook.controller.ts:275-336, 395-437` | **Chargebacks, disputes and gateway-side refunds are ignored.** PayHere status `-3` falls through with no action; Stripe `charge.refunded` / `charge.dispute.created` are not handled. A refund issued from the Stripe dashboard leaves the order `PAID` and the stock unreturned. | Handle these events: record an `OrderEvent`, alert the admin, and reconcile status. | done |
| 15 | Medium | `backend/src/controllers/checkout.controller.ts:258-269, 309-318` | **Failures after the order commits leave it stranded.** If `createPaymentIntent` throws (Stripe outage) or the optional `saveAddress` insert fails, the client gets a `500` but the `PENDING` order and its stock reservation remain for 24 h; a retry creates another. | Cancel-and-release on gateway failure; move `saveAddress` to best-effort (never fail the request). Largely subsumed by the fix for #3. | done |
| 16 | Low | `backend/src/controllers/webhook.controller.ts:96-119`; `backend/src/controllers/admin/order.admin.controller.ts:241-248` | Gift-set component stock is decremented at payment (best-effort, matched by product **name**) but never restored on refund; component availability is not checked at checkout, so a box can sell with a component out of stock (logged as an order note only). | Store component variant IDs on the gift set instead of names; restore them in the refund transaction. | pending (deferred — needs schema design, see §14) |
| 17 | Low | `backend/src/controllers/admin/order.admin.controller.ts:189` | Refunds are all-or-nothing and only from `PAID` / `PROCESSING` — a shipped or delivered order cannot be refunded in-system, and the customer gets no refund email. | Allow refund from later states; add a refund notification. | decision |

---

## 5. Wave 3 — Authentication and session

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 18 | Medium | `backend/src/controllers/auth.controller.ts:203` | **Login leaks which emails are registered through response time.** The "timing protection" dummy hash `'$2b$12$invalidhashfortimingprotection'` is not a valid bcrypt hash, so `verify` rejects it immediately. Measured here: **0 ms** for the dummy vs **202 ms** for a real hash. This undoes the anti-enumeration work in register / forgot-password. | Generate one real bcrypt hash at module load (`await hash(randomString, 12)`) and verify against that for unknown emails. | done |
| 19 | Medium | `backend/src/services/token.service.ts:72-95`; `aranya-next/src/lib/api/http.ts:49-68` | **Two tabs refreshing at once log the user out.** Refresh is single-flight per tab only. Tabs that boot together (browser session restore) send the same refresh cookie; the loser is treated as token reuse and the whole family is deleted, so the winning tab's session dies at its next refresh. | Add a short reuse grace window server-side (a token used within the last ~10 s returns the already-issued successor), or coordinate tabs with the Web Locks API. | done |
| 20 | Medium | `shared/src/schemas/auth.schema.ts:5, 15`; `backend/src/controllers/auth.controller.ts:200` | **Emails are case-sensitive.** No normalisation anywhere: `John@Gmail.com` and `john@gmail.com` are different accounts, and a user who types a different case at login gets "invalid email or password". Guest order emails have the same issue for later lookups. | Lower-case and trim in the shared schemas (`.trim().toLowerCase()`); one-off migration to normalise existing rows, checking for collisions first. | done |
| 21 | Low | `backend/src/middleware/authenticate.ts:15-45`; `backend/src/routes/admin.routes.ts:16` | `requireAuth` / `requireRole` trust the JWT alone. A demoted admin, a deleted account or a password reset keeps full access (including admin routes) until the 15-minute token expires. | For `/admin/*`, re-check role from the DB (one indexed lookup per request is cheap at admin volume). | done |
| 22 | Low | `backend/src/routes/cart.routes.ts:20` | `POST /cart/coupon` is only behind the global limiter (120 / min), so coupon codes can be brute-forced. | Add a tight per-IP limiter on the coupon route. | done |
| 23 | Low | `backend/src/services/token.service.ts:170-191, 224-243` | Verify / reset tokens are checked then consumed in separate steps (two concurrent requests can both succeed), and a completed password reset does not mark the account verified even though it proves mailbox ownership — an unverified user who resets still cannot sign in. | Consume with a conditional `updateMany({ usedAt: null })`; set `verified: true` on reset. | done |
| 24 | Low | `shared/src/schemas/auth.schema.ts:6-11`; `shared/src/schemas/cart.schema.ts:22-31`; `backend/src/controllers/contact.controller.ts:9-16`; `backend/src/controllers/wholesale.controller.ts:9-20` | Missing upper bounds: passwords, checkout address fields, phone, and contact / wholesale free-text fields accept anything up to the 512 KB body limit, stored or emailed verbatim. | Add `.max()` to each. | done |
| 25 | Low | `backend/prisma/schema.prisma:112`; `backend/src/jobs/scheduler.ts:183-216`; `backend/src/services/email.service.ts:145-166` | Marketing consent: `newsletterOptIn` defaults to `true`, abandoned-cart emails are sent regardless of it, and they carry no unsubscribe link. | Default to `false`, honour the flag in the job, add an unsubscribe link. | decision |
| 26 | Info | `backend/src/services/audit.service.ts:31-33`; migration `20260324140629…:30` | The comment claims audit rows "can never be deleted" thanks to `REVOKE DELETE … FROM PUBLIC`. That does not bind the table's owner role, which is what the app connects as. The log is append-only by convention, not by enforcement. | Correct the comment, or connect the app as a non-owner role with `DELETE` / `UPDATE` revoked. | done |

---

## 6. Wave 4 — Functional bugs

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 27 | Medium | `backend/src/services/email.service.ts:136, 234` | **Links in transactional emails are broken.** The order confirmation links to `${FRONTEND_URL}/account/orders` — that route does not exist (only `/account`), and it uses the raw `FRONTEND_URL`, which may be a comma-separated list. The admin new-order email links to `/admin/orders`, which also does not exist (the console is a single page with hash routes). | Use the first origin (as the other templates do) and link to `/account` and `/admin#orders`. | done |
| 28 | Medium | `aranya-next/src/components/CartContext.tsx:470-478`; `aranya-next/src/lib/cart.ts:24-25` | **A hard-coded promo code is accepted even when the backend rejects it.** `applyPromo` falls back to the local `CEYLON10` (10 %) table on *any* error, including a `400` "not valid" — it is not gated by `DEMO_MODE`. No coupon is seeded and there is no way to create one (#41), so in production the drawer shows a discount that checkout then refuses. | Only use the local table when `DEMO_MODE` is on (or on network failure in demo). | done |
| 29 | Medium | `backend/src/services/cart.service.ts:133-144`; `backend/src/controllers/checkout.controller.ts:72-103` | **Archived products can still be bought.** Neither add-to-cart nor checkout checks `product.status`; an archived (or draft) product already in a cart, or added by ID, checks out normally. Gift sets rely on `DRAFT` backing products, so the rule has to be "not `ARCHIVED`". | Reject `ARCHIVED` in `validateCartVariant` and in the checkout re-validation block. | done |
| 30 | Medium | `backend/src/controllers/admin/gift.admin.controller.ts:49-82, 198-212` | **Deleting a gift set leaves its backing product behind.** The hidden `gift-<slug>` product and its variants survive, so re-creating a gift with the same slug fails forever with "already exists", and the orphan stays purchasable by ID. Renames also do not sync the backing product's name. | Archive (not delete — it may have order history) the backing product in the same transaction, and reuse it on re-create. | done |
| 31 | Low | `shared/src/schemas/cart.schema.ts:34` | `checkoutSchema.couponCode` is not upper-cased while `applyCouponSchema.code` is, so the same code succeeds on one endpoint and fails on the other for API callers. | Apply the same transform. | done |
| 32 | Low | `aranya-next/src/components/checkout/CheckoutClient.tsx:449, 682` | The District select shows "Colombo" while its state is `''`, so the district is not submitted unless the shopper changes it. | Initialise the state to the first option when the market is local. | done |
| 33 | Low | `backend/src/controllers/product.controller.ts:104-118` | Any unique-constraint error on product create / update — including a duplicate **slug** — is reported as "A variant SKU already exists". | Inspect `err.meta.target` and return the right message. | done |
| 34 | Low | `backend/src/services/cart.service.ts:222-256` | `mergeGuestCart` is not atomic and not idempotent: two concurrent merges double the quantities and the second fails with a `500`; merged quantities can exceed the 99 cap. | Do it in one transaction with a conditional delete of the guest cart; clamp to 99. | done |
| 35 | Low | `shared/src/schemas/product.schema.ts:18-19`; `aranya-next/src/lib/cart.ts:57-72` | A variant with market `BOTH` has one currency, so it is listed and addable in the other market but always fails checkout with `409`. The schema default is `BOTH` / `LKR`. The admin UI always creates explicit per-market variants, so this is reachable via API / seeds only. | Reject `BOTH` on variants, or default to an explicit market. | done |
| 36 | Low | `aranya-next/src/app/(storefront)/products/[slug]/page.tsx:98` | Product structured data always declares `InStock`, regardless of real stock. | Derive availability from the variants. | done |
| 37 | Low | `backend/src/controllers/contact.controller.ts:42-47`; `backend/src/controllers/wholesale.controller.ts:47-51` | Contact and wholesale submissions exist only as an email. If the send fails (and the outbox is off) the user is still told "received" and the enquiry is gone. | Persist submissions, or enable the outbox by default in production. | done |
| 38 | Low | `backend/src/services/blog.service.ts:34-40`; `backend/src/controllers/admin/blog.admin.controller.ts:100-108` | `viewCount` increments on every API read (cache fills, not visits) and costs a DB write per read; un-publishing a post keeps its `publishedAt`, and `scheduledAt` cannot be cleared. | Drop or move view counting; clear the dates on status change. | in-progress (dates fixed; viewCount is an owner decision, see §16) |
| 39 | Low | `aranya-next/src/components/admin/AdminApp.tsx:113-116` | The admin gate reports every failure as "Invalid email or password", including rate limiting and "verify your email". | Surface the server message for non-401 errors. | done |
| 40 | Low | `backend/src/middleware/timeout.ts:14-22` | The timeout sends `503` but the handler keeps running; its later `res.json` throws "headers already sent" into the error handler, and the work (e.g. an order) may still complete after the client was told it failed. | Mark the request as timed out and guard writes, or accept and document. | done |

---

## 7. Wave 5 — Missing features (built halfway or not at all)

These are not bugs in existing code; they are gaps a "finished" store will hit. Each needs a build-or-cut decision.

| # | Severity | Where | Gap | Suggested direction | Status |
|---|---|---|---|---|---|
| 41 | Medium | `backend/src/routes/admin.routes.ts`; `backend/src/services/audit.service.ts:24-25` | **No coupon management.** There is no endpoint or screen to create, list or disable coupons — only raw SQL — and no coupon is seeded. The audit log already declares `COUPON_CREATE` / `COUPON_DEACTIVATE` events that nothing emits. | Add admin CRUD (with #11's currency field), or remove the promo input from the storefront. | done (API only, §7.1) |
| 42 | Medium | `backend/prisma/schema.prisma:275-292` | **Reviews cannot be written or moderated.** The `Review` model, rating sort and review display exist, but there is no endpoint to submit or approve one, so every product shows zero reviews forever. | Build submit + moderation, or remove the reviews block and rating sort. | done (API only, §7.1) |
| 43 | Medium | `backend/src/routes/admin.routes.ts`; `backend/prisma/schema.prisma:109-110` | **No user or role management.** Admins exist only via the seed script; there is no way to promote, demote or suspend a user. `twoFactorEnabled` / `twoFactorSecret` are stored but 2FA is not implemented — admin accounts are password-only. | At minimum a SUPERADMIN role screen; ideally TOTP for admin logins. | done (API; sign-in code field still to design, §7.1) |
| 44 | Low | `backend/src/routes/product.routes.ts:29-34`; `backend/src/services/cloudinary.service.ts:49` | Product images can be uploaded but never removed or reordered (`deleteImage` exists with no caller). | Add delete / reorder endpoints. | done (API, §7.1) |
| 45 | Low | `backend/src/services/email.service.ts:114-139` | Thin customer communication: the order email has no line items or address, guests have no way to view their order, and there are no cancellation or refund emails. No account deletion or data export (privacy requests must be handled by hand). | Decide what the launch needs. | decision (deferred; touches the payment transaction, §7.1) |
| 46 | Low | `backend/src/index.ts:119-132` | No error monitoring or structured logging (console only). `/health` also discloses `NODE_ENV` and the shared-package version to anyone. | Add Sentry or equivalent; trim the health payload. | partly done (`/health` trimmed; error monitoring still needs an account, §7.1) |
| 47 | Low | `backend/prisma/schema.prisma:350-361, 432-444, 529-538` | Wholesale is a contact form only (`WholesaleAccount` unused); `Newsletter` (double opt-in) and `Subscription` models have no code at all. See §10.5. | Build or drop the models. | kept (to be built later, §7.1) |

### 7.1 Wave 5 progress log (2026-10-04)

Branch `claude/wave5-admin-apis`. Owner decisions taken on 2026-10-04: coupons and reviews as **API only**; admin
users as **SUPERADMIN API plus TOTP two-factor**; schema **kept as is** (the owner wants wholesale, newsletter and
subscriptions built later). Nothing here changes the storefront or admin console UI: the screens, the review form and
the sign-in code field are the owner's to design against these endpoints.

| # | Status | What was done / what remains |
|---|---|---|
| 41 | done (API) | `/admin/coupons`: list (cursor paging, derived ACTIVE / EXPIRED / EXHAUSTED status), get, create, update, `POST …/:id/deactivate`. Validation in `@aranya/shared` (code upper-cased, percentage ≤ 100 with no currency, fixed amount needs LKR or USD, future expiry, two decimals). Only the limit and expiry can change after creation, and the limit cannot drop below current usage. Deactivating expires the coupon a moment ago (checkout already refuses expired codes), so no schema change; re-activate by setting a future expiry or `null`. Audited as `COUPON_CREATE` / `COUPON_UPDATE` / `COUPON_DEACTIVATE`. The admin screen is still to be designed. |
| 42 | done (API) | Signed-in buyers submit one review per purchase: `POST /products/:id/reviews` needs the buyer's own paid, non-refunded order containing the product, is rate-limited per account (10/hour), starts `PENDING`. Public `GET /products/:slug/reviews` lists approved reviews with a privacy-safe reviewer label ("Amara W.") and the count / average. Admin `GET /admin/reviews` (default: pending queue) and `PATCH /admin/reviews/:id` approve or reject, audited as `REVIEW_MODERATE`, and refresh the cached product / catalog / search / home pages. The review form, list and moderation screen are still to be designed; until reviews exist the stars stay at zero. |
| 43 | done (API) | **User management** (`/admin/users`, SUPERADMIN only): list with filters, change role, suspend, unsuspend. Guard rails: no self changes, the last active SUPERADMIN cannot be demoted or suspended (serializable transaction), only a verified account can be given an admin role, a role change or suspension ends the account's sessions. Suspension is enforced at sign-in, at refresh-token rotation and on the admin routes (`requireRole` re-reads the account), so a suspended admin loses the console immediately; a suspended *customer's* current access token (15 min) is not re-checked on ordinary routes. **Two-factor:** ADMIN / SUPERADMIN can turn on authenticator-app (TOTP) sign-in: `POST /auth/2fa/setup`, `/enable` (confirms a code, returns ten single-use recovery codes), `/disable` (needs the password and a code). Sign-in then needs `totpCode` or `recoveryCode`, only after the password is right, and fails closed (503) if the key is missing. RFC 6238 is implemented on `node:crypto` and checked against the RFC's published test vectors; secrets are sealed with AES-256-GCM bound to the user (`TWO_FACTOR_ENCRYPTION_KEY`); a used code cannot be replayed (atomic); recovery codes are stored as SHA-256 and spent atomically. `POST /admin/users/:id/reset-2fa` (another SUPERADMIN) recovers a lost device. **Before any admin enrols, the console's sign-in screen needs a code field**, otherwise that admin is told a code is required and cannot proceed. Admin sign-in is not *forced* to use two-factor; making it mandatory is a follow-up decision. |
| 44 | done (API) | `DELETE /admin/products/:id/images/:imageId` (database row first, then best-effort removal from Cloudinary; this finally gives `deleteImage` a caller) and `PUT /admin/products/:id/images/order` (must list exactly the product's own images). Both audited and refresh the cached pages. The existing upload route `POST /products/:id/images` now also has the admin rate limiter it lacked. |
| 45 | decision | Not changed. The order-confirmation email is built inside the payment-confirmation transaction, which is on the do-not-regress list, so adding line items and the address there is deferred. Recommendation: add them (and cancellation / refund emails, a guest order lookup, and account deletion / data export) as a post-launch task with its own tests. |
| 46 | partly done | `GET /health` now reports only status, timestamp and database (it used to disclose `NODE_ENV` and the shared-package version). Error monitoring (Sentry or similar) needs an account and DSN, so it stays on the pre-launch checklist. |
| 47 | kept | Wholesale accounts, newsletter (double opt-in) and subscriptions are to be built later; their tables stay. |

Deploy notes for Wave 5: run `prisma migrate deploy` (one new migration, `20261004000000_admin_users_and_2fa`: `User.suspendedAt`, `twoFactorRecoveryCodes`, `twoFactorLastStep`); set `TWO_FACTOR_ENCRYPTION_KEY` (`openssl rand -base64 32`) before any admin turns on two-factor (the API warns at boot in production while it is missing).

Verification: `pnpm typecheck`, `pnpm lint` and Prisma validate clean; backend unit tests 673 in total: 670 passed in the full run and the other 3 are the known cold-run timeouts in `email.service` and `scheduler-control` (#61; #182 fixes the former), which pass when run alone; about 80 of the tests are new. The PostgreSQL integration and browser suites run in CI only. Nothing here is visible in the storefront, so no browser check.

---

## 8. Wave 6 — Performance and scale

The PR #170 performance work is thorough; these are what remains.

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 48 | Medium | `backend/src/middleware/rateLimit.ts`; `backend/src/lib/simpleCache.ts`; `backend/src/jobs/scheduler.ts:229-255` | Rate limiters, the catalog cache and cron jobs are all per-process. This is documented, but it means the API is **single-instance only**: a second replica doubles every limit and (in legacy mode) every scheduled job. Limits also reset on each restart / deploy. | Keep one instance, or move limiter + cache to Redis and enable the leased scheduler before scaling out. | decision |
| 49 | Low | `aranya-next/src/components/AuthContext.tsx:72-77` | One extra `POST /auth/refresh` round trip (BFF → API → DB-free 401) on every page load for every anonymous visitor. | Fixed by the session-hint cookie in #6. | done (#6; see §18) |
| 50 | Low | `backend/prisma/schema.prisma:415-426, 547-567` | Unbounded tables: `WebhookEvent` (full gateway payloads including customer PII), delivered `OutboxMessage` rows and `AuditLog` are never pruned. | Add a retention job (e.g. 90 days for webhook payloads and delivered outbox rows). | done (§18; audit log kept — owner decision) |
| 51 | Low | `backend/src/services/catalog-query.ts:40-56`; `backend/src/services/search-query.ts:22-31`; `backend/src/services/admin-page-query.ts:12-14, 39` | Catalog sorts and search use per-row correlated `COUNT(*)` subqueries and `strpos(lower(...))` scans; admin audit search scans `diff::text` across the whole log. Fine for a small catalog; cost grows linearly with products, orders and audit rows. | No action now. Revisit with materialised counts / trigram indexes if the catalog or log grows. | skipped (acceptable at current scale) |
| 52 | Low | `aranya-next/public/hero` (384 files, 81 MB), `aranya-next/public/images` (21 MB) | ~102 MB of binary media lives in git, and the build copies it again into `public/media` (~105 MB), inflating clone time and every deploy artifact. | Move hero frames to object storage / CDN (`NEXT_PUBLIC_ASSETS_URL` already exists), or at least Git LFS. | decision |
| 53 | Low | `backend/prisma/schema.prisma:170` | `@@index([slug])` on `Product` duplicates the index already created by `@unique`. | Drop it. | done (§18) |
| 54 | Low | `aranya-next/src/lib/*-data.ts` | Demo datasets (`admin-data.ts` 446 lines, `account-data.ts`, `journal-data.ts`, `recipes-data.ts`, `gifts-data.ts`, `catalog-data.ts`) are imported by ~30 modules and ship in production bundles even though `DEMO_MODE` is off. | Load them lazily behind `DEMO_MODE` so they are tree-shaken from production. | done (§18) |

---

## 9. Wave 7 — Deploy, CI, dependencies and docs

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 55 | High | `origin/main` vs `origin/Develop` | **The production branch is stale.** `main` is 8 commits behind `Develop`, missing the whole performance pass and **5 database migrations** (`20261002*`). `deploy.yml` deploys from `main`, so none of the recent work is live. | Open the `Develop → main` sync PR once Wave 1 is resolved. | pending |
| 56 | Medium | `.github/workflows/deploy.yml:3-37` | The deploy workflow runs `prisma migrate deploy` against production on every push to `main`, independent of CI and in parallel with Railway's own auto-deploy. Migrations run even if tests fail, and new code can start before (or despite a failure of) its migration. | Gate deploy on the CI workflow (`workflow_run` / required checks) and make the platform deploy wait for the migration step. | pending |
| 57 | Medium | `backend/package.json:36` (express `4.22.1`); `aranya-next/package.json:19` | Other high-severity advisories in production dependencies: `path-to-regexp@0.1.12` ReDoS and `qs` DoS via Express 4; `undici` (cross-user information disclosure, TLS validation bypass, DoS) via `isomorphic-dompurify@3.18.0` → jsdom; `postcss` / `nanoid` via Next. | Bump Express to the latest 4.x (or plan Express 5), `isomorphic-dompurify` to 4.x; the rest clears with #1. **Correction (§17):** the postcss advisories do not clear with #1 — Next 15.5.27 still pins `postcss@8.4.31` (build-time only). | pending |
| 58 | Medium | `.github/workflows/ci.yml` ("Security audit" step) | `pnpm audit --audit-level=high --prod \|\| true` can never fail the build, which is how two criticals reached `Develop` unnoticed. | Fail on `critical`; keep `high` report-only with an explicit allow-list. | pending |
| 59 | Medium | `.github/workflows/performance.yml:3-4`; `scripts/performance/*.test.ts` | The 23 test files under `scripts/performance` (cart session, checkout polling, public cache, BFF identity, revalidation …) run **only on manual `workflow_dispatch`**. Normal CI runs backend unit tests and one Playwright spec, so storefront logic regressions are not gated. | Add `pnpm perf:test` to the CI quality job. | skipped (not a bug: the workflow also runs on pull requests touching storefront/perf paths — the audit misread its trigger) |
| 60 | Medium | `docs/operations/deployment-checklist.md`; `docs/performance/RELEASE_RUNBOOK.md`; `backend/.env.example:7` | The two deployment documents disagree: the checklist (Railway + Cloudflare) never mentions BFF client identity (#5) or `STRIPE_PUBLISHABLE_KEY` (#7), still says order-confirmation email "isn't built yet" (it is), and tells you to "set every variable from `.env.example`" — which includes `API_HOST=127.0.0.1`, making the API unreachable on a PaaS. | Merge into one authoritative runbook per topology. | pending |
| 61 | Low | `backend/src/services/email.service.test.ts:28-53` | Flaky under load: the first test in the "public BFF entry point" block does a cold dynamic import that took 5.37 s here against a 5 s timeout; the second then asserts on the first's late mock call. Passes in isolation. | Raise the timeout for that block or warm the import in `beforeAll`; reset the mock between tests. | pending |
| 62 | Low | `package.json` (`engines`), `.nvmrc` | The repo requires Node `>=22 <23`; this machine runs `v20.20.2` (pnpm warns on every command). `@types/node` is also pinned to 20. | Install Node 22 locally; bump `@types/node` to 22. | pending |
| 63 | Low | `.claude/CLAUDE.md`; `docs/operations/known-issues.md`; `shared/src/index.ts:1-2`; `.gitignore` | Stale documentation: the project `CLAUDE.md` still describes `frontend/` and `frontend-legacy/` (neither exists on `Develop`) and a legacy `api.js`; `known-issues.md` is a June document about the removed prototype; the shared index comment says "populated in Phase 2"; root `.gitignore` has a `prisma/migrations/` rule that matches nothing. | Update or archive. | pending |
| 64 | Low | `D:\GitHub\Aranya-Ceylon` (main checkout) | The main checkout is on branch `test-order-fixes` at `095f149` with **186 uncommitted changes** (92 modified, 21 deleted, 73 untracked), and there are 80 local branches and 18 worktrees. If any of that is real work it exists only on this disk. | Review, then commit or discard; prune merged branches and worktrees. Not touched by this audit. | decision |
| 65 | Low | `aranya-next/e2e/checkout.spec.ts` | End-to-end coverage is one spec in stub-payment mode. Nothing exercises the Stripe or PayHere sandbox path, sign-up / verification, or the admin console. | Add a sandbox-gateway smoke test before launch. | decision |

---

## 10. Dead-code inventory

Method: `knip` across the workspace, then every hit checked by reference count and by reading call sites.
`knip` had no project config, so it also listed test files and script entry points as "unused" — those are
excluded below. Confidence: **Confirmed** = no reference outside its own definition (and tests, where noted).

### 10.1 Dead files

| # | Path | Why it is dead | Action |
|---|---|---|---|
| D1 | `backend/src/config/cors.ts` + `cors.test.ts` | `isOriginAllowed` is imported only by its own test; CORS is implemented in `middleware/browserCors.ts`. Confirmed. | Delete both |
| D2 | `aranya-next/public/image-slot.js` (642 lines), `aranya-next/src/components/primitives/ImageSlotEditor.tsx`, the `<image-slot>` typings in `src/types/global.d.ts` | The editor only mounts when `ImageSlot` receives `editor`; **no component passes it**. This also retires the old SEC-14 note about the "omelette bridge" inside that script. Confirmed. | Delete (or move to a dev-only tool) |
| D3 | `backend/prisma/apply-gift-migration.ts`, `backend/prisma/apply-perf-indexes.ts` | One-off manual scripts superseded by real migrations `20260626140000_giftset_prices_to_decimal` and `20260704120000_add_perf_indexes`. Not referenced by any script. | Delete |
| D4 | `scripts/performance/analytics-size-diagnostic.mjs`, `layout-diagnostic.mjs`, `loading-height-diagnostic.mjs`, `phase-seven-measure.mjs`, `verify-local-phases.mjs` | Not wired to any `package.json` script or workflow. | Delete or archive |
| D5 | `backend/prisma/seed-gifts.ts`, `backend/prisma/seed-recipes.ts` | Not dead, but **unwired**: no npm script runs them (only `seed:catalog` exists), so a fresh environment has no gifts or recipes unless someone remembers the `tsx` command. | Add `seed:gifts` / `seed:recipes` scripts |

The rest of `scripts/performance/` (57 files, ~5.8k lines) is a one-time measurement harness for the PR #170
phases. It is live (workflow + `perf:*` scripts) but is a candidate for archiving once the release is out.

### 10.2 Dead backend code

| # | Symbol | Location | Notes |
|---|---|---|---|
| D6 | `requireVerified` | `middleware/authenticate.ts:53` | Never mounted on any route |
| D7 | `sendWholesaleStatusEmail` | `services/email.service.ts:280` | No caller — wholesale approval was never built |
| D8 | `deleteImage` | `services/cloudinary.service.ts:49` | No caller — no image-delete endpoint |
| D9 | `getRelatedProducts` | `services/product.service.ts:187` | No caller — the storefront uses `listProducts({ category })` |
| D10 | `addToCart` | `services/cart.service.ts:110` | Superseded by `addToShopperCart`; referenced by tests only |
| D11 | `clearDashboardCache` | `controllers/admin/analytics.admin.controller.ts:11` | Tests only |
| D12 | `paginationSchema`, `PaginationInput` | `shared/src/schemas/common.schema.ts` | Never imported — the whole file is dead |
| D13 | `twoFactorVerified` | `lib/jwt.ts:17` | Payload field never set or read |
| D14 | `AuditEvent` members `USER_ROLE_CHANGE`, `USER_SUSPEND`, `COUPON_CREATE`, `COUPON_DEACTIVATE`, `WHOLESALE_APPROVE`, `WHOLESALE_REJECT` | `services/audit.service.ts:12-27` | Never emitted (features not built — see #41, #43, #47) |
| D15 | `@types/node-cron` | `backend/package.json` devDependencies | `node-cron` v4 ships its own types |

### 10.3 Dead or duplicate API endpoints

| # | Endpoint | Location | Notes |
|---|---|---|---|
| D16 | `GET /blog/recent` | `routes/blog.routes.ts:8` → `getRecentBlogs` (controller + service) | No frontend caller |
| D17 | `GET /products/search` | `routes/product.routes.ts:12` → `searchProducts` → `searchAutocomplete` | The only caller, `searchProducts()` in `aranya-next/src/lib/api/products.ts:66`, is itself unused; search goes through `GET /search` |
| D18 | `GET /products/admin/all`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` | `routes/product.routes.ts:17-38` | Duplicates of `/admin/products/*`, which is what the console calls. These copies also skip `adminLimiter`. Keep only `POST /products/:id/images` |
| D19 | `GET /cart` (create-on-read) | `routes/cart.routes.ts:12` → `getCart` | The storefront uses `/cart/bootstrap`; frontend `getCart()` (`lib/api/cart.ts:22`) is unused |
| D20 | `GET /gifts/:slug` | `routes/gift.routes.ts:8` | Only caller `fetchGiftBySlug` (`lib/api/gifts.ts:71`) is unused |
| D21 | `POST /auth/logout-all` | `routes/auth.routes.ts:24` | No UI calls it. Worth **keeping** and wiring into the account page rather than deleting |

### 10.4 Dead frontend code

| # | Symbol | Location | Notes |
|---|---|---|---|
| D22 | `Swatch` | `components/admin/AdminPrimitives.tsx:91` | No usage |
| D23 | `CATALOG_SORTS` | `lib/catalog-data.ts:67` | No usage |
| D24 | `fetchGiftBySlug`, `searchProducts`, `getCart`, `getOrder`, `updateAddress` | `lib/api/gifts.ts:71`, `products.ts:66`, `cart.ts:22`, `orders.ts:9`, `auth.ts:107` | Client functions with no caller. `updateAddress` means saved addresses can be added and deleted but not edited |
| D25 | `canonicalMarketCookie` | `lib/market-cookie.server.ts:34` | Tests only (the cache layer has its own implementation in `public-cache.server.ts`) |
| D26 | `pay` / `setPay` state | `components/checkout/CheckoutClient.tsx:437, 470` | Only ever `"card"`; never read for behaviour |
| D27 | Unused exported types | `lib/admin-data.ts` (`DayPoint`, `OrderItem`, `TopProduct`, `MarketSeg`, `LowStockItem`, `WholesaleApp`, `ActivityItem`, `AdminUser`), `lib/account-data.ts` (`OrderEvent`, `AccountUser`), `lib/types.ts` (`VariantMarket`, `ProductImage`, `Review`, `OrderItem`, `OrderTimelineEntry`, `JournalSearchMetadata`) | Either unused or only used inside their own file — drop the `export` or the type |
| D28 | Exported but file-local | `OrderLine`, `AD_NAV`, `LegalHeader`, `RIcon`, `AC_STEPS`, `spiceForKey`, `MULT`, `num`, `variantUnitPrices`, `toCsv`, `downloadCsv`, `contentToBlocks`, `HERO_FRAME_LIMITS` | Used, but only within their own file — remove `export` |
| D29 | Undeclared dependency | `scripts/performance/browser.mjs:7` imports `playwright` | Only `@playwright/test` is declared (in `aranya-next`); resolution depends on hoisting |

### 10.5 Dead schema

| # | Item | Location | Notes |
|---|---|---|---|
| D30 | Model `Subscription`, enums `SubscriptionPlan`, `SubscriptionStatus` | `schema.prisma:67-77, 350-361` | No code reads or writes it |
| D31 | Model `WholesaleAccount`, enums `WholesaleTier`, `WholesaleStatus` | `schema.prisma:79-90, 432-444` | No code reads or writes it |
| D32 | Model `Newsletter` | `schema.prisma:529-538` | No code reads or writes it; opt-in lives on `User.newsletterOptIn` |
| D33 | `User.twoFactorEnabled`, `User.twoFactorSecret` | `schema.prisma:109-110` | Selected in `/auth/me` but 2FA is not implemented |
| D34 | `Review.helpfulCount` | `schema.prisma:286` | Never read or written |
| D35 | `Currency.EUR`, `Currency.GBP` | `schema.prisma:30-31` | Accepted by the variant schema but nothing can price or charge them — a variant in either currency is unsellable |

Dropping models needs a migration and is irreversible for any data in them; all five tables are expected to be
empty, but confirm before removing.

---

## 11. What is solid — do not regress

Verified in this pass and worth protecting during any fix wave:

- **Do-not-regress list holds:** BFF proxy (header stripping, cookie re-scoping, no SSRF surface — the upstream host is fixed), refresh-token rotation with family reuse detection, the payment-confirmation transaction (conditional `PENDING → PAID` claim), and admin route gating (`requireAuth` + `requireRole` on the router, enforced server-side regardless of the client gate).
- **Stock reservation** at checkout is atomic and rolls back as a unit; the DB `CHECK (stock >= 0)` backs it.
- **Webhook authenticity:** Stripe signature on the raw body; PayHere constant-time hash check plus merchant, amount and currency cross-checks; both bind the payment to the recorded order total.
- **Raw SQL:** every builder (`catalog-query`, `search-query`, `admin-page-query`, `analytics-query`, `page-query`) uses bound parameters; cursors are validated and scope-bound. No injection path found.
- **XSS:** rich text is sanitised server-side through a DOMPurify allow-list; JSON-LD is escaped; the CSP is nonce-based with no `unsafe-inline` for scripts, and the root layout keeps pages dynamic so the nonce applies.
- **Market isolation:** signed market cookie, local-market orders restricted to Sri Lankan addresses, public cache keyed by a canonicalised market cookie only.
- **Fail-fast configuration** for JWT / cookie secrets, stub payments and dev routes in production.
- **Uploads:** memory storage, size and count limits, MIME filter plus magic-byte verification.
- **Money maths** in integer cents end to end.

---

## 12. Suggested order of work

1. **Wave 1** in full — #2, #3, #4 and #7 are small, contained backend changes; #5 and #6 are configuration plus a small client change; #8 needs your decision on the shipping policy first; #1 (Next upgrade) is the largest item and can run as its own phase in parallel.
2. **Wave 2** — #9 and #10 next, since they are the remaining ways money and order state can diverge.
3. **Wave 3 / Wave 4** — quick, mostly one-line fixes (#18, #20, #27, #28, #29 give the most value).
4. **Wave 7** — #58 and #59 first so CI protects the fixes, then the `Develop → main` sync (#55).
5. **§10 dead code** as a final cleanup wave once behaviour is stable.
6. **Wave 5** decisions can be taken at any point; several dead-code items depend on them.

---

## 13. Wave 1 progress log (2026-10-03)

Changes are **uncommitted** in the worktree `project-final-analysis-review-28346e`. Owner decisions taken: backend shipping rates are authoritative (#8); hosting topology undecided (#5); Next.js upgrade is its own phase (#1).

| # | Status | What was done / what remains |
|---|---|---|
| 1 | pending | Deferred to a dedicated phase (Next 15.5.24+ / React 19 migration). Not started. |
| 2 | done | `calculateTotalsForLines` prices the same cart lines the order reserves; checkout no longer re-reads the cart. Tests added. |
| 3 | done | New `pending-order.service.ts`: a new checkout attempt releases earlier unpaid orders for the same cart; reservation window is `PENDING_ORDER_TTL_MINUTES` (default 60, was 24 h); sweep runs every 10 min in both schedulers. Tests added. No per-guest unit cap. |
| 4 | done | Webhook handlers wrapped in `asyncHandler`; process-level `unhandledRejection` logger added. |
| 5 | in-progress | Production boot warning added and the requirement documented in `deployment-checklist.md` / `.env.example`. **Not enforced** — needs the hosting decision. |
| 6 | done | Readable `aranya_session` hint cookie set/cleared with the refresh cookie; storefront skips boot refresh without it; `/auth/refresh` has its own limiter (300 / 15 min); a 429 no longer raises a session error. Users signed in before this change must sign in once more. Browser check: no `/api/auth/refresh` request on anonymous page loads. |
| 7 | done | `STRIPE_PUBLISHABLE_KEY` required when `PAYMENTS_MODE=live`, documented in `.env.example`, README and checklist; checkout dev hint hidden in production. **Deploys now fail to boot in live mode without this key.** |
| 8 | done | Storefront constants now mirror the API (USD 4.99 / 12.99, LKR 350 / 650). Free-shipping UI (drawer progress strip, product-page line, shipping-page footer line, FAQ entry) is switched off by `freeShip: null` in `aranya-next/src/lib/cart.ts` and returns unchanged if a threshold is set. Verified in the browser (demo mode, international market): shipping page, product page, cart drawer, checkout delivery options and FAQ. Local-market checkout labels verified on the shipping page only (switching store empties the basket). |
| 9 | in-progress (pulled forward: #3 depends on it) | Stripe PaymentIntent is closed before an unpaid order is released; a verified payment on a CANCELLED / REFUNDED order now writes a timeline entry and emails `ADMIN_EMAIL` once. Remaining: admin-cancel path (belongs to #10), no auto-refund. |
| 61 | pending | Second flaky test seen: `scripts/performance/content-search.test.ts` (rich-text sanitiser) timed out in the full run, passes 7/7 alone. |
| 66 | pending (new) | `ShippingClient.tsx` lists "Store collection · Kandy — Free" and "Remote / outlying zones — Quoted at checkout", and the FAQ says "40+ countries"; checkout offers neither option and lists 12 countries. Content decision. |

Verification at stop: backend `tsc` clean, lint clean, **546 / 546** unit tests; storefront `tsc` and lint clean, **232 / 233** storefront tests (the one failure is the flake above). Integration, e2e and production build not run.

---

## 14. Wave 2 progress log (2026-10-03)

Wave 1 shipped as PR #175 (`claude/project-final-analysis-review-28346e` → `Develop`). Wave 2 is on branch
`claude/audit-wave2-payment-integrity`, shipped as its own PR on top of the merged Wave 1.

| # | Status | What was done / what remains |
|---|---|---|
| 9 | done | Remainder closed by #10: an admin cancel now goes through `cancelPendingOrder`, so the Stripe intent is closed and the coupon use released. No auto-refund of a late payment — it is escalated to the admin. |
| 10 | done | `ADMIN_TRANSITIONS` map in `order.admin.controller.ts`: PENDING → CANCELLED only; PAID → PROCESSING / SHIPPED; PROCESSING → SHIPPED; SHIPPED → DELIVERED (or SHIPPED again to correct tracking); REFUNDED only via the refund endpoint; a paid order can't be cancelled. Writes are conditional on the validated status (409 `ORDER_CHANGED` otherwise). |
| 11 | done | `Coupon.currency` (nullable) + migration `20261003000000_coupon_currency`. A coupon with a currency works only in that store; one without works anywhere only if it is a PERCENTAGE. **Existing FIXED_AMOUNT coupons need a currency set or they stop applying.** |
| 12 | done | `PAYHERE_MODE` must be `live` or `sandbox` explicitly when `PAYMENTS_MODE=live`; boot fails otherwise. No `sk_test_` cross-check added. |
| 13 | done | Admin product form sends `stockBase` (stock as loaded); the API applies `stock − stockBase` as a guarded delta and returns 409 `STOCK_CHANGED` if a reduction no longer fits. Absolute write kept when `stockBase` is absent. Not exercised in a browser (needs a live API + admin login). |
| 14 | done | Stripe `charge.refunded` and `charge.dispute.created`, and PayHere status `-3`, write a timeline entry and email `ADMIN_EMAIL` once per gateway reference; order status and stock are deliberately not changed. **The Stripe endpoint must be subscribed to those two events.** |
| 15 | done | A Stripe failure after the order commits releases the order and returns 502 `PAYMENT_SETUP_FAILED`; saving the address is best-effort. |
| 16 | pending (deferred) | Restoring gift-set component stock on refund needs a record of which components were actually decremented at payment; today that is name-matched and best-effort, so a blind restore could over-credit. Needs a small schema design (component variant IDs on the gift set, or a decrement ledger). |
| 17 | decision | Unchanged — refund policy for shipped / delivered orders, partial refunds and a refund email are the owner's call. |

Deploy notes for Wave 2: run `prisma migrate deploy` (one new migration); set `PAYHERE_MODE` explicitly; subscribe the Stripe webhook to `charge.refunded` and `charge.dispute.created`.

Verification at stop: `pnpm typecheck` and `pnpm lint` clean; backend unit tests **576 / 576**; storefront tests 232 / 233 (the sanitiser timeout flake, #61). Integration, e2e and production build not run locally.

### Open item on PR #175 (Wave 1) — smoke workflow red

`Performance smoke` fails on #175 (the three main CI jobs pass). Cause: the #6 session-hint change. Three browser
checks assume every fresh visit calls `POST /auth/refresh`: `phase-one-browser.mjs` (stalled refresh → session-error
screen), `phase-five-browser.mjs` (asserts exactly one refresh on a fresh visit) and the bounded-admin-pages check.
An anonymous browser now makes no refresh call, so those scenarios never start. Fix (not yet applied — awaiting
go-ahead — since applied, see below): set the `aranya_session` cookie in the scenarios that test a returning session, and assert zero refresh
calls for an anonymous visit.

Correction: finding **#59** was wrong. `performance.yml` runs on `pull_request` (path-filtered) as well as
`workflow_dispatch`, so the storefront tests are gated on PRs that touch those paths.

**Update (2026-10-03):** the smoke failure was fixed in `f431bb6` (test scripts only — the returning-session
scenarios now carry the `aranya_session` cookie and the anonymous fresh visit asserts no refresh). PR #175 merged
into `Develop` with all four checks green. Wave 2 was then rebased onto that merge and re-verified: typecheck and
lint clean, storefront tests 233 / 233, backend unit tests 576 / 576 (three timing-sensitive tests timed out in the
full run and passed when re-run on their own — #61).

---

## 15. Wave 3 progress log (2026-10-03)

Branch `claude/audit-wave3-auth-session`, stacked on Wave 2 (PR #176). Committed locally, not yet pushed.

| # | Status | What was done / what remains |
|---|---|---|
| 18 | done | Unknown emails are compared against a real bcrypt hash of a random secret, generated once at cost 12, instead of the invalid placeholder. |
| 19 | done | A refresh token presented again within 10 s of being spent (or one that loses the claim race) is treated as a concurrent tab and gets its own successor in the same family. Reuse after 10 s still revokes the whole family. |
| 20 | done | `emailSchema` (trim + lower-case, max 254) used for register, sign-in, forgot-password, resend-verification and guest checkout; seed admin email lower-cased; migration `20261003010000_normalise_user_emails` lower-cases existing accounts, leaving case-only duplicates for a person to merge. |
| 21 | done | `requireRole` re-reads the role from the database on every admin request; a demoted or deleted account is refused immediately. |
| 22 | done | `couponLimiter` (30 per 15 min per IP) on `POST /cart/coupon`. While BFF client identity (#5) is not enforced this is a site-wide budget, so it is deliberately generous. |
| 23 | done | Verify and reset tokens are claimed with a conditional write before acting; a completed password reset also marks the email verified. |
| 24 | done | Upper bounds on passwords (128 for new, 1024 at sign-in), reset tokens, checkout contact/address fields, coupon code, and the contact / wholesale forms. |
| 25 | decision | Unchanged — marketing consent defaults are the owner's call. |
| 26 | done | Audit-log comment corrected: append-only by convention, not enforced by the database. |

Deploy notes for Wave 3: run `prisma migrate deploy` (one new migration); check for accounts that differ only by email case before deploying; set `SEED_ADMIN_EMAIL` in lower case.

Verification: `pnpm typecheck`, `pnpm lint` and Prisma schema validation clean; backend unit tests 588 / 588 (12 new); storefront tests 233 / 233. Integration, e2e and production build not run locally; nothing here is observable in the storefront without a running API, so no browser check.

---

## 16. Wave 4 progress log (2026-10-03)

Branch `claude/audit-wave4-functional-bugs`, stacked on Wave 3 (PR #177). Committed locally, not yet pushed.

| # | Status | What was done / what remains |
|---|---|---|
| 27 | done | Order-confirmation link goes to `/account` using the first `FRONTEND_URL` origin; admin new-order link goes to `/admin#orders`. |
| 28 | done | The local `CEYLON10` fallback is only honoured when `DEMO_MODE` is on, so a code the API rejects is no longer shown as a discount. |
| 29 | done | Add-to-cart refuses variants of ARCHIVED products (DRAFT still allowed for gift sets); checkout re-validation rejects them with 409. |
| 30 | done | Deleting a gift set archives its backing product in the same transaction; re-creating the slug revives that product. Gift renames now also update the backing product's name and description. |
| 31 | done | `checkoutSchema.couponCode` is trimmed and upper-cased like the apply-coupon endpoint. |
| 32 | done | The local District state starts at the option the select shows (Colombo). Verified in the browser: the create-intent request now carries `region: "Colombo"`. |
| 33 | done | Unique-constraint errors on product create/update report a duplicate slug or SKU accurately. |
| 34 | done | `mergeGuestCart` claims the guest cart inside one transaction, so concurrent merges apply once; merged lines are capped at 99. |
| 35 | done | Add-to-cart requires the variant's currency to match the store, so a single-currency BOTH variant can no longer be added where checkout would refuse it. The schema default (BOTH / LKR) is unchanged. |
| 36 | done | Product structured data declares OutOfStock when no variant in the visitor's market has stock. |
| 37 | done | Without the outbox, a failed contact / wholesale email now returns 503 with the support address instead of claiming the message was received. Submissions are still not stored in the database. |
| 38 | in-progress | Taking a post off the site clears `publishedAt`; `scheduledAt` can be cleared with null. Remaining: `viewCount` still increments on every API read (cache fills, not visits) — keep, drop, or move to real analytics is an owner decision. |
| 39 | done | The admin gate says "Invalid email or password" only for a 401 and shows the server's message otherwise. Not checked in a browser: demo mode bypasses this path and the real path needs the API. |
| 40 | done | The error handler only logs when the response was already sent (e.g. after the 30 s timeout) instead of throwing "headers already sent". |

Verification: `pnpm typecheck`, `pnpm lint` clean; backend unit tests 594 / 594 (11 new); storefront tests 232 / 233 in the full run — the sanitiser timeout flake (#61). Browser check in demo mode: local-store checkout sends the district; no script errors besides the expected 502s from the absent API.

---

## 17. Next.js 15 upgrade log (2026-10-03)

Branch `claude/next15-upgrade`, stacked on Wave 4 (PR #178). Finding **#1** closed.

| Area | Change |
|---|---|
| Versions | `next` 14.2.35 → **15.5.27**, `react` / `react-dom` → 19.3.0, matching `@types/react*` and `eslint-config-next`. |
| Config | `experimental.serverComponentsExternalPackages` → top-level `serverExternalPackages`; `images.qualities: [75, 90]` added (ImageSlot requests 90, Next 15.5 warns on unlisted qualities and Next 16 rejects them). |
| Async request APIs | `resolveMarket()` is now async (awaits `cookies()` / `headers()`); its 21 callers await it. `public-cache.server.ts` awaits `cookies()`. |
| Silent bug avoided | `http.ts` forwarded `cookies().toString()` to the API. On Next 15 this still type-checks (a Promise has `toString`) but would send `"[object Promise]"` instead of the visitor's cookies, breaking market and auth on every server-side API call. Now awaited. |
| Params | `[slug]` pages, `generateMetadata`, `generateStaticParams` consumers and the BFF `app/api/[...path]/route.ts` take `params` / `searchParams` as Promises. BFF behaviour unchanged. |
| React 19 types | `RefObject<T \| null>` in the dialog-focus hook and Gifts / Wholesale clients; `useRef` given an explicit initial value; the `image-slot` JSX element declared under `React.JSX` (module augmentation) so it no longer shadows the built-in elements; `Reveal` uses `React.JSX.IntrinsicElements`. |
| Tests | `public-cache.test.ts` awaits `resolveMarket()` and calls `IncrementalCache.generateCacheKey` (renamed from `fetchCacheKey` in Next 15). |
| Streaming (found by CI) | Under Next 15.5 / React 19.2 every dynamic route wrapped by a `loading.tsx` first sends the skeleton and streams the page inside a hidden container that an inline script reveals, even when the page awaits nothing (Next 14 inlined it). Content pages therefore showed "Loading page" to visitors without JavaScript and failed the `Performance smoke` job. **Fix:** removed the shared `app/loading.tsx` and `(storefront)/loading.tsx`; the ten content pages (about, account, contact, cookies, faq, privacy, shipping, terms, wholesale, 404) are plain synchronous components again (they resolved the market only to pass an unused `SiteChrome` prop) and arrive as complete HTML; home moved into the `(home)` route group so it keeps its own skeleton, and gifts, categories (inherited by `categories/[slug]`) and search got their own `loading.tsx` using the same `RouteLoading` default label. Products, journal, recipes, product detail, checkout and admin already had theirs. Cart is synchronous and needs none. No markup or styles changed; only navigation to a content page no longer flashes a skeleton. |
| Revalidation across restarts | Next 14 persisted the revalidated-tag list to `.next/cache/fetch-cache/tags-manifest.json`; Next 15.5 keeps it in memory only. If a Next server **restarts on the same `.next/cache`** (same build, persistent volume), Data Cache entries invalidated before the restart are trusted again until their TTL expires, so an archived product could reappear in a cached listing. Container platforms with an ephemeral filesystem (a restart starts from the image) are not affected; if `.next/cache` is on a persistent volume, wipe `fetch-cache` on restart. Found because the smoke phases share one build directory; each fixture now starts from an empty Data Cache. |
| Smoke tests | For a short window after a streamed page loads (up to ~300 ms, React 19.2's reveal batching) the revealed content and React's hidden holding copy both exist, so strict locators matched twice and counts doubled. Added `settled()` in `scripts/performance/browser.mjs` (waits for the holding containers and skeleton to go) and used it where phases six, seven and nine read content right after navigation; phase four's browser primary-content check uses `.first()`; phase seven's market-switch check also waits for the server refresh (`networkidle`) before paging, since a late refresh resets the loaded pages (it failed ~1 run in 3 under CPU load, 0 in 6 after). Assertions are unchanged. |

No markup or styles changed.

Verification: `pnpm typecheck`, `pnpm lint` clean; storefront production build succeeds with the same rendering modes as before (dynamic pages, SSG for product / journal / recipe detail); backend unit tests 594 / 594; storefront tests 233 / 233. Browser check (demo mode) of home, about, product page with cart drawer and checkout: layout matches Next 14, no hydration or React errors, shipping options and totals correct. `pnpm audit --prod`: **0 critical** (was 2); no advisory left against `next` itself. Remaining highs are transitive and tracked in #57 (undici / dompurify via isomorphic-dompurify, qs / path-to-regexp via Express, Next's build-time postcss, plus `deepmerge-ts` and `mysql2`, which are new to the list). Playwright e2e and the perf browser scripts were not run locally — CI's smoke job covers them.

Known dev-only warnings left alone (hand-designed layout): the hero poster `fill` image has a `sticky` parent; one product image `fill` container reports zero height. Node 20 locally vs the `>=22` engine field is a local-environment warning only.

---

## 18. Wave 6 progress log (2026-10-03)

Branch `claude/audit-wave6-performance`, stacked on the Next.js 15 upgrade (PR #179). Committed locally, not yet pushed.

| # | Status | What was done / what remains |
|---|---|---|
| 48 | decision | Unchanged — single API instance, or Redis-backed limiter / cache plus the leased scheduler before scaling out. Ties in with the hosting decision (#5). |
| 49 | done | Already closed by #6: `apiRefresh` skips the call when the `aranya_session` hint cookie is absent (browser-verified in Wave 1). |
| 50 | done | New hourly `retention` job (`45 * * * *`, both the legacy and the leased scheduler): deletes one page (200) each of `WebhookEvent` rows and DELIVERED `OutboxMessage` rows older than 90 days. DEAD outbox rows are kept for an operator. Outbox dedupe keys all encode one-time events (`paid:<order>`, `shipped:<order>:<episode>`, `cart:<id>:<updatedAt>`, random UUIDs) and order state gates any resend, so deleting spent rows cannot cause a duplicate email. **`AuditLog` is not pruned** — how long to keep the admin trail is an owner decision. Test added. |
| 51 | skipped | Unchanged (acceptable at current scale). |
| 52 | decision | Unchanged — hero frames to object storage / CDN or Git LFS. |
| 53 | done | `@@index([slug])` removed from `Product`; migration `20261003020000_drop_duplicate_product_slug_index` drops `Product_slug_idx` (`IF EXISTS`). The unique index `Product_slug_key` remains. |
| 54 | done | Cause: webpack decides which exports are used across the whole build, so admin's use of `JOURNAL` / `RECIPES` / `GIFTS` kept those datasets inside the shared modules that storefront client components import for helpers, and `AuthContext` pulled the entire demo account (fake addresses, orders, tracking numbers) into the root layout on every page. Fix: the datasets moved to `journal-demo.ts`, `recipes-demo.ts`, `gifts-demo.ts` (with `getPost`, `getRecipe`, `recipeSpices`), imported only by server pages, the sitemap and admin; `toPost` uses a five-entry curated-slot map instead of searching the demo journal; `AuthContext` imports a small `demo-user.ts`; `GiftsClient` dropped its unreachable client-side fallback (the page always passes `gifts`). No markup or styles changed. |

Bundle effect (production build, First Load JS): every storefront page −3 kB (demo account out of the root layout); `/recipes` and `/recipes/[slug]` 144 → 136 kB and 146 → 138 kB; `/journal` 142 → 137 kB; `/search` 149 → 145 kB; `/gifts` 144 → 141 kB; `/admin` 131 → 127 kB. After the change the demo strings appear only in `/account` (its demo fallback) and admin-only chunks. Still shipped: `/account` keeps the demo account for its demo-mode fallbacks, and `catalog-data` stays in the storefront because search and gift helpers read it.

Deploy notes for Wave 6: run `prisma migrate deploy` (one new migration).

Verification: `pnpm typecheck`, `pnpm lint`, Prisma validate clean; storefront production build succeeds; storefront tests 233 / 233; backend unit tests 595 / 595 (1 new; `scheduler-control` and `email.service` timed out in the cold full run and passed alone — #61). Browser check (demo mode): gifts, journal list and article (curated cover slot), recipes list and detail, and search render without route errors; the gifts grid hydrates with prices and à-la-carte comparisons.
