# Backend manual test plan

Base URL: `http://localhost:4000` (no `/api` prefix — routes are mounted directly, e.g. `/auth/login`).
Run `backend`'s dev server (`npm run dev` / `pnpm dev` from `backend/`) with `PAYMENTS_MODE=stub` so
checkout doesn't need real Stripe/PayHere keys. Use `curl`, Postman, or Insomnia — examples below use curl.

Where a test needs an access token, first `POST /auth/login` and reuse the `accessToken` from the
response as `Authorization: Bearer <token>`; the refresh token is set as an httpOnly cookie
automatically (pass `-c cookies.txt -b cookies.txt` to curl to persist it across calls).

Legend: 🆕 = roadmap/audit feature added this session, worth extra attention.

---

## 1. Auth (`/auth`)

| Method & path | Auth | What to verify |
|---|---|---|
| `POST /register` | none | Creates user, sends verification email (check server log/inbox); duplicate email → 409 |
| `GET /verify?token=...` | none | Marks account verified, redirects to frontend |
| `POST /resend-verification` | none | Neutral response whether or not the email exists (anti-enumeration) |
| `POST /login` | none | Returns `accessToken` + sets refresh cookie; wrong password → 401 |
| `POST /forgot-password` | none | Neutral response either way; sends reset email for real accounts |
| `POST /reset-password` | none | Valid token → password changes, **all refresh sessions revoked** (log in elsewhere first, confirm that session is now dead) |
| `POST /refresh` | refresh cookie | Rotates the refresh token; replaying the **old** cookie after a rotation → `TOKEN_REUSE_DETECTED`, whole family revoked |
| `POST /logout` | refresh cookie | Kills just this session |
| `POST /logout-all` | access token | Kills every session for the user |
| `GET /me` / `PATCH /me` | access token | Profile read/update (name, phone, newsletter opt-in) |
| `GET/POST /me/addresses`, `PATCH/DELETE /me/addresses/:id` | access token | CRUD; deleting/editing another user's address id → 403/404 |

---

## 2. Cart (`/cart`) — guest + authenticated

Guest carts are identified by a `guestCartToken` cookie the BFF sets; curl with `-c/-b cookies.txt`
to carry it. Authenticated carts use the Bearer token.

| Method & path | What to verify |
|---|---|
| `GET /` | Empty cart on first call, then reflects items |
| `GET /totals` | Integer-cents math (add odd prices like 19.99 × 3, confirm no float drift) |
| `POST /items` | Add `{ variantId, quantity }`; adding more than live stock → still allowed here (reservation happens at checkout, not add-to-cart) |
| `PATCH /items/:itemId` | Change quantity |
| `DELETE /items/:itemId` | Remove one line |
| `DELETE /` | Clears whole cart |
| `POST /coupon` / `DELETE /coupon` | Valid code discounts the total; expired/usage-capped code is rejected with a clear error, not a 500 |
| `POST /merge` (auth) | Add items as guest, log in, confirm guest cart items appear in the user cart |

🆕 **Abandoned-cart flag reset** — touching a logged-in user's cart (any `POST/PATCH/DELETE` above)
must clear `abandonedEmailSentAt`. No direct endpoint exposes this field; verify via Prisma Studio
(`npx prisma studio` → `Cart` table) before/after a cart touch.

---

## 3. Checkout & payments (`/checkout`)

| Method & path | What to verify |
|---|---|
| `POST /create-intent` | See scenarios below |
| `POST /stub/complete` | `{ orderId }` → marks the order PAID via the same idempotent path real webhooks use (only works when `PAYMENTS_MODE≠live`) |

**Scenarios to run against `/create-intent`:**
1. **Guest checkout, no email** → 400 (`email required`).
2. **LOCAL market, non-LK shipping country** → 400 (cross-market address rejected).
3. **Happy path, stub mode** → 200 with `{ provider: 'stub', orderId, total, currency }`. Then call
   `/checkout/stub/complete` with that `orderId` — order flips to PAID, cart clears.
4. 🆕 **Stock reservation** — check a variant's live stock, set cart quantity to more than available →
   `POST /create-intent` returns **409** with `items: [{ variantId, requested, available }]`, and the
   variant's stock is **unchanged** (nothing was actually reserved on failure).
5. 🆕 **Concurrent checkout race** — two clients with carts for the *last unit* of the same variant,
   fired at nearly the same time: exactly one succeeds (200), the other gets 409. (Hard to do by hand;
   the automated test suite covers this — `checkout.controller.test.ts`.)
6. **Coupon at checkout** — pass `couponCode` in the body; confirm the total reflects the discount and
   `Coupon.usageCount` increments only after payment confirms (step 3/4 below), not at intent creation.

---

## 4. Orders (`/orders`)

| Method & path | Auth | What to verify |
|---|---|---|
| `GET /` | access token | Own order history only |
| `GET /:id` | access token or guest | Authenticated: 403 on someone else's order (IDOR check). Guest: only works for guest orders (`userId` null), returns minimal `{id, status, total, currency}`; a guest hitting an authenticated user's order → 403 |

---

## 5. Webhooks (`/webhooks`) — 🆕 event log

These are gateway-to-server calls, not something a browser hits — use curl or the Stripe CLI.

| Method & path | What to verify |
|---|---|
| `POST /webhooks/stripe` | Needs a valid Stripe signature — easiest via `stripe listen --forward-to localhost:4000/webhooks/stripe` + `stripe trigger payment_intent.succeeded`. Confirm: order flips PAID, confirmation + admin emails fire once, and a `WebhookEvent` row appears (`gateway: 'Stripe'`, correct `eventType`/`eventId`/`orderId`) |
| `POST /webhooks/payhere` | Form-encoded; needs a valid `md5sig` computed from `PAYHERE_MERCHANT_SECRET` (see `payhere.service.ts` for the exact hash formula) — check `status_code` 2 (paid), -1 (cancelled → stock released), -2 (failed → left PENDING) |

**Fastest way to see a `WebhookEvent` row without wiring up signatures**: temporarily add a
`console.log` in `logWebhookEvent`, hit the endpoint with an intentionally *invalid* signature first to
confirm it's correctly rejected and logs nothing, then use the Stripe CLI trigger for a real one. Or
just trust the 8 new vitest cases in `webhook.controller.test.ts` for the signature-gating behavior and
use Prisma Studio to eyeball rows after a real Stripe CLI trigger.

Check via `npx prisma studio` → `WebhookEvent` table (no admin UI exists for this yet).

---

## 6. Admin new-order email — 🆕

No dedicated endpoint — fires as a side effect of `confirmOrderPaid` (stub complete, or either webhook
above). After any of those:
- If `RESEND_API_KEY` is unset (typical in dev): check the `backend` terminal for either a successful
  send log or a caught `✉ Admin new-order notification failed for <orderId>` error — either proves the
  code path ran.
- If `RESEND_API_KEY` + `ADMIN_EMAIL` are set to real values: check that inbox for "New order #... ".
- Confirm it fires **once** even if you call `/checkout/stub/complete` twice with the same `orderId`
  (idempotent — second call is a no-op).
- Confirm it fires for a **guest** order with no email at all (admin still gets notified even though
  there's no customer confirmation email to send).

---

## 7. Products (`/products`)

| Method & path | Auth | What to verify |
|---|---|---|
| `GET /` | none | Cursor pagination (`?cursor=...&limit=...`), `?featured=false` actually excludes featured (not "any truthy string") |
| `GET /featured`, `/bestsellers` | none | Non-empty, sane data |
| `GET /search?q=...` | none | Text search; overly long `q` (>200 chars) is capped, not 500 |
| `GET /:slug` | none | A product slugged `featured`/`bestsellers`/`search` is rejected at creation (can't test via GET, but confirm `POST /` refuses those slugs — see below) |
| `GET /admin/all` | admin | Full unfiltered list incl. DRAFT/ARCHIVED |
| `POST /` | admin | 🆕 Create with a `flavour: ["smoky", "citrus"]` array; try slug `"featured"` → 400 (reserved) |
| `PATCH /:id` | admin | Flip `status: DRAFT → ACTIVE` → product now appears in public `GET /` and `GET /:slug`; edit `flavour` |
| `POST /:id/images` | admin | Multipart upload; upload a renamed `.txt` as `.jpg` → rejected by magic-byte check, not just extension |
| `DELETE /:id` | admin | Archives (soft-delete) — confirm it drops out of public listings but the record still exists |

---

## 8. Categories, Blog, Recipes, Gifts, Wishlist, Wholesale, Contact, Market

| Method & path | Auth | What to verify |
|---|---|---|
| `GET /categories` | none | Full list |
| `GET /blog`, `/blog/recent`, `/blog/:slug` | none | Cursor pagination; an invalid cursor is handled gracefully, not a 500 |
| `GET /recipes`, `/recipes/:slug` | none | 🆕 New content-editor fields (from admin) show up here |
| `GET /gifts`, `/gifts/:slug` | none | Gift set detail includes `contents` (component names) |
| `GET /wishlist` (auth) | access token | Own wishlist only |
| `POST /wishlist` `{ productId }` | access token | Add; duplicate add is idempotent, not a duplicate row |
| `DELETE /wishlist/:productId` | access token | Remove |
| `POST /wholesale/apply` | none, rate-limited (5/hr/IP) | 6th request in an hour → 429 |
| `POST /contact` | none, rate-limited | Submits, triggers `sendSupportNotification` (check log/inbox) |
| `POST /market/override` `{ market: 'local' \| 'international' }` | none | Sets the `x-market` cookie for 30 days; invalid value → 400 |

---

## 9. Admin console API (`/admin/*`) — all require `ADMIN`/`SUPERADMIN` role

| Method & path | What to verify |
|---|---|
| `GET /admin/dashboard` | Today/previous-period metrics look real, not placeholder zeros |
| `GET /admin/audit-logs` | Entries appear after admin actions below (product edit, order status change, etc.) |
| `GET/PATCH /admin/orders`, `/admin/orders/:id` | Status transitions; 🆕 **cancelling a PENDING order releases its reserved stock** — note a variant's stock, cancel its order, confirm stock went back up by the ordered quantity |
| `POST /admin/orders/:id/refund` | PAID/PROCESSING → REFUNDED; confirm stock is restocked (pre-existing behavior, shouldn't have changed) |
| `GET/POST/PATCH/DELETE /admin/blogs` | Standard CRUD |
| `GET/POST/PATCH/DELETE /admin/recipes` | 🆕 New content fields persist round-trip |
| `GET/POST/PATCH/DELETE /admin/gifts` | 🆕 Creating a gift set also creates a backing DRAFT Product + Variants (check `GET /admin/products` for a matching draft product); **renaming a gift's slug** correctly renames the backing product's slug too (this was the bug fixed in Wave 1 — a regression here would be notable) |
| `GET/POST/PATCH/DELETE /admin/products` | Same as public product routes, admin-scoped |

**Gift-box component stock (🆕, exercised via checkout, not an admin endpoint):** buy a gift box through
stub checkout, confirm via `/checkout/stub/complete`, then check the *component* product's variant
stock (matched by name + jar weight + market) decremented by the box quantity — not just the gift box's
own synthetic variant.

---

## 10. Scheduled jobs — can't be triggered on demand

These run on cron (`backend/src/jobs/scheduler.ts`) and have no manual-trigger endpoint. Either wait for
the schedule or trust the automated tests (`scheduler.test.ts`):

| Job | Schedule | What it does |
|---|---|---|
| Low-stock alert | daily 08:00 | Emails `ADMIN_EMAIL` for variants below threshold |
| Stale-order cancellation | hourly | Cancels PENDING orders older than 24h, releases their reserved stock |
| 🆕 Abandoned-cart recovery | hourly at :30 | Emails signed-in users with an untouched cart (3h+), sets `abandonedEmailSentAt` |

To force one to fire for a manual check without waiting: temporarily change its cron expression to
`* * * * *` (every minute) in `scheduler.ts`, restart the server, observe, then revert — don't ship that
change.

---

## Quick smoke-test order (covers the highest-value paths in ~15 minutes)

1. Register → verify email → login.
2. Add 2+ items to cart, apply a coupon.
3. Checkout (stub mode) → `/checkout/stub/complete` → confirm order PAID, cart cleared, coupon usage
   incremented once, admin-notification code path fired (log check).
4. As admin: view the order, cancel it — but first place a *second* fresh PENDING order (don't cancel
   the one you just paid) so you can confirm cancellation releases stock without touching the paid one.
5. As admin: create a gift set, confirm its backing product appears, buy the gift box via stub
   checkout, confirm the listed component's stock dropped.
6. Hit `/sitemap.xml` and `/robots.txt` directly — confirm 200 and sane content.
