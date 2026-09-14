# Deploy Readiness Plan — Aranya Ceylon

**Goal:** find and fix everything that would frustrate a real customer *before* launch, not after.

**Status legend:** ⬜ not started · 🟡 in progress · ✅ done · ⛔ blocked · ➖ N/A
**Owner:** `C` = Claude can do it · `U` = needs you (real device / real inbox / real gateway / prod env)

Update the status column after every task. This file is the single source of truth — a fresh
session should be able to resume from it alone.

---

## Phase 0 — Confirmed blockers (found by inspection, evidence below)

These are real, reproduced today. Fix before anything else.

| # | Status | Owner | Issue |
|---|---|---|---|
| 0.1 | ⬜ | C | **Product & journal detail pages hard-500 when the API is unreachable** |
| 0.2 | ⬜ | C | **No `error.tsx` / `global-error.tsx`** — users see Next's raw crash screen |
| 0.3 | ⬜ | U | **No geo-detection: every first-time visitor defaults to USD / International** |

### 0.1 — Detail pages 500 on API outage

**Evidence (reproduced 2026-09-14):** frontend running with backend stopped —

```
GET /                            200   ← demo fallback, fine
GET /products                    200   ← demo fallback, fine
GET /journal                     200   ← demo fallback, fine
GET /gifts                       200   ← demo fallback, fine
GET /account                     200   ← fine
GET /checkout                    200   ← fine
GET /products/ceylon-cinnamon-quills   500  (86ms, warm — deterministic)
GET /products/green-cardamom-pods      500
GET /journal/true-cinnamon             500
```

Listing pages degrade gracefully to demo data; **detail pages die.** Product detail is the page
that matters most commercially, and this is also what Google crawls.

Note `generateMetadata` succeeds (the `<title>` renders correctly) — so the failure is in the
page body render, not data resolution. Same fingerprint as the `sitemap.xml` 500 fixed earlier
(`apiFetch` → `next/headers` `cookies()` inside a `revalidate`-marked route, with the bail-out
signal swallowed by a bare `catch {}`).

**Why it matters in production:** Railway/Render hobby tiers spin down when idle; Neon cold-starts;
your broadband is intermittently flaky (already the repeated cause of `P1001`s). Any blip = every
product page 500s.

**Pass criteria:** with the backend fully stopped, every route in the sitemap returns 200 and
renders demo content. No 500s anywhere.

### 0.2 — No error boundary

Only `not-found.tsx` exists. Any server error renders Next's default production screen
("Application error: a server-side exception has occurred") — unbranded, no nav, no retry.

**Pass criteria:** branded `error.tsx` + `global-error.tsx` with a retry action and a route home.
Verify by forcing a throw in a page.

### 0.3 — Everyone lands on USD

`backend/src/middleware/market.ts` and `aranya-next/src/lib/market.ts` both default to
`INTERNATIONAL` when no `x-market` cookie is present. The backend comment says "matches
geo-detection behaviour" — **but there is no geo-detection anywhere in the codebase.**

A customer in Colombo lands on USD pricing and Stripe checkout, and must find the market switch
themselves. Many local customers can't pay with an international card at all — PayHere is the
local rail. This is a silent conversion killer.

**Decide:** (a) add geo-detection (Vercel gives `x-vercel-ip-country`; Cloudflare gives
`CF-IPCountry`) → `LK` ⇒ LOCAL, else INTERNATIONAL; or (b) deliberately keep USD default and make
the market switch far more prominent on first visit. Not a code bug — a product decision only you
can make.

---

## Phase 1 — The money path (can a customer actually buy?)

Test **all four combinations**: {LOCAL/LKR/PayHere, INTERNATIONAL/USD/Stripe} × {guest, account}.

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 1.1 | ⬜ | U | Gateway keys flipped to **live** (`PAYMENTS_MODE=live`, real Stripe + PayHere creds) | Server boots; env validation passes |
| 1.2 | ⬜ | U | **Webhook URLs registered and reachable from the public internet** | Test delivery from Stripe + PayHere dashboards returns 200 |
| 1.3 | ⬜ | U | Full purchase, INTERNATIONAL + guest | Order PAID, confirmation email, stock decremented |
| 1.4 | ⬜ | U | Full purchase, INTERNATIONAL + account | Same, plus appears in `/account` order history |
| 1.5 | ⬜ | U | Full purchase, LOCAL + guest (PayHere) | Same, LKR amounts correct |
| 1.6 | ⬜ | U | Full purchase, LOCAL + account | Same |
| 1.7 | ⬜ | U | Abandon checkout at the gateway (back button / close tab) | Order stays PENDING, stock still reserved, no email |
| 1.8 | ⬜ | U | Card declined | Order stays PENDING and is retryable — not cancelled |
| 1.9 | ⬜ | U | Coupon applied end-to-end | Discount correct at gateway; `usageCount` increments **once**, on payment |
| 1.10 | ⬜ | U | Buy the last unit of a variant | Second buyer gets a clean 409 message, not a crash |
| 1.11 | ⬜ | U | Gift box purchase | Component stock decrements, not just the box |

### ⚠ The catastrophe to rule out explicitly (1.2)

If the webhook never reaches production, the failure is **silent and severe**:

1. Customer pays successfully at the gateway.
2. No webhook → order never flips to PAID → **no confirmation email**.
3. The stale-order cron then **auto-cancels the order after 24h** and releases the stock.

Net result: you took their money and the system cancelled their order. Nobody is notified.

**Do not launch until you have seen a real webhook land in production.** Verify a `WebhookEvent`
row exists (`npx prisma studio` → `WebhookEvent`) after a real payment.

---

## Phase 2 — Email deliverability

Every send in `email.service.ts` is best-effort (`.catch(console.error)`). If `RESEND_API_KEY` is
wrong in production, **every email silently vanishes** and nothing surfaces it. Customers pay and
hear nothing.

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 2.1 | ⬜ | U | Resend domain verified; SPF + DKIM + DMARC DNS records live | Resend dashboard shows verified |
| 2.2 | ⬜ | U | `EMAIL_FROM` uses the verified domain | Not the sandbox address |
| 2.3 | ⬜ | U | Deliverability check to **Gmail, Outlook, Yahoo** | Lands in inbox, **not** spam |
| 2.4 | ⬜ | U | Order confirmation | Correct total, currency, market wording |
| 2.5 | ⬜ | U | Admin new-order alert | Correct id/total/market/item count |
| 2.6 | ⬜ | U | Email verification link | Works from a real email client (fixed today — CORS) |
| 2.7 | ⬜ | U | Password reset link | Points at prod frontend, single-use, expires |
| 2.8 | ⬜ | U | Shipping notification | Tracking number correct |
| 2.9 | ⬜ | U | Contact + wholesale notifications | Correct inbox, fields escaped, Reply-To set |
| 2.10 | ⬜ | U | Low-stock + abandoned-cart jobs | See `BACKEND_MANUAL_TEST_PLAN.md` for triggers |
| 2.11 | ⬜ | C | **Make email failures visible** (don't just `console.error`) | Failures surface somewhere you'll actually look |

---

## Phase 3 — Auth & account lifecycle (over real HTTPS + real domains)

Cookie behaviour is the classic thing that works perfectly on localhost and breaks in production.
The BFF proxy re-scopes cookie paths correctly, so this *should* hold — but verify on the real
domains, especially if frontend and API end up on different registrable domains.

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 3.1 | ⬜ | U | Register → verify → login | Full round trip on prod domains |
| 3.2 | ⬜ | U | Stay logged in >15 min, keep browsing | Silent refresh works, no surprise logout |
| 3.3 | ⬜ | U | Logout, then back button | Actually logged out |
| 3.4 | ⬜ | U | Password reset end-to-end | Old password dead, other sessions revoked |
| 3.5 | ⬜ | U | Guest cart survives a refresh and a return visit | Items still there |
| 3.6 | ⬜ | U | Add to cart as guest → log in | Cart merges, nothing lost |
| 3.7 | ⬜ | U | **iOS Safari** specifically | Cart + session survive (ITP is aggressive) |
| 3.8 | ⬜ | U | Return from PayHere/Stripe redirect | Still logged in, cart state intact |

---

## Phase 4 — Images & performance (directly relevant to your image swap)

**Important finding:** nothing in the app uses `next/image` — all 22 image slots are plain `<img>`.

Good news: swapping image hosts won't break the build (no `remotePatterns` gotcha).
Bad news: **no automatic resizing, no `srcset`, no format conversion, no intrinsic sizing.**

If you drop in full-resolution photos (a 4000px camera JPEG is 4–6 MB), the site becomes unusable
on mobile data — which is most of your Sri Lankan traffic.

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 4.1 | ⬜ | U | Compress/resize every replacement image before upload | Hero ≤ 250 KB, product ≤ 150 KB, thumb ≤ 50 KB |
| 4.2 | ⬜ | U | Serve WebP/AVIF (Cloudinary can auto-convert: `f_auto,q_auto`) | Modern format served to modern browsers |
| 4.3 | ⬜ | C | Add `width`/`height` (or CSS aspect-ratio) to image slots | CLS < 0.1 — **markup only, no restyling** |
| 4.4 | ⬜ | C | `loading="lazy"` on below-the-fold images | Verified in Network tab |
| 4.5 | ⬜ | U | Total page weight on the homepage | < 2 MB on first load |
| 4.6 | ⬜ | U | Throttled 3G / mid-tier Android test | Usable, not janky |
| 4.7 | ⬜ | U | Lighthouse mobile | Perf ≥ 70, a11y ≥ 90, no CLS failures |
| 4.8 | ⬜ | U | **Every image actually loads** (no 404s / broken icons) | Zero broken images sitewide |

---

## Phase 5 — Mobile & cross-browser

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 5.1 | ⬜ | U | Real Android phone, full purchase | Completes |
| 5.2 | ⬜ | U | Real iPhone (Safari), full purchase | Completes |
| 5.3 | ⬜ | U | Checkout form on a small screen | Nothing clipped, keyboard doesn't obscure fields |
| 5.4 | ⬜ | U | Cart drawer / nav on mobile | Opens, closes, scrolls |
| 5.5 | ⬜ | U | Admin console on tablet | Usable (you'll run orders from it) |
| 5.6 | ⬜ | U | Landscape orientation | No layout break |

---

## Phase 6 — Content & trust

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 6.1 | ⬜ | U | No placeholder/lorem/demo copy left anywhere | Read every page |
| 6.2 | ⬜ | U | **Prices correct in both currencies** | Spot-check against your price list |
| 6.3 | ⬜ | U | Shipping costs + delivery estimates accurate | Match your real rates |
| 6.4 | ⬜ | U | Legal pages reviewed (privacy, terms, cookies, shipping, FAQ) | Accurate for a real SL business |
| 6.5 | ⬜ | C | No broken internal links | Crawl clean |
| 6.6 | ⬜ | U | 404 page is branded and offers a way back | Visit `/nonsense` |
| 6.7 | ⬜ | U | Contact form reaches you | Real submission |
| 6.8 | ⬜ | U | Social/OG preview | Paste a product URL into WhatsApp — card renders |

---

## Phase 7 — Production config & security

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 7.1 | ⬜ | U | **`NEXT_PUBLIC_ENABLE_DEMO` unset/false** | ⚠ If true, anyone visiting `/admin` gets an ADMIN session with any password when the backend is unreachable (SEC-08). Combined with 0.1 this is a live hole. |
| 7.2 | ⬜ | U | **`ENABLE_DEV_ROUTES` not `true`** | Otherwise an unauthenticated DB-seed endpoint is public |
| 7.3 | ⬜ | U | `NODE_ENV=production` on the API | Fail-closed CORS + Secure cookies depend on it |
| 7.4 | ⬜ | U | `NEXT_PUBLIC_API_URL` set to the real API origin | Otherwise it silently falls back to localhost and serves demo data forever (BUG-17) |
| 7.5 | ⬜ | U | `NEXT_PUBLIC_SITE_URL` set | Canonicals, sitemap, OG tags |
| 7.6 | ⬜ | U | `FRONTEND_URL` lists every real origin (www **and** apex) | CORS allowlist |
| 7.7 | ⬜ | U | `JWT_ACCESS_SECRET` + `COOKIE_SECRET` ≥ 32 random chars, never reused | Fresh secrets |
| 7.8 | ⬜ | U | Seeded admin password changed | Not the default |
| 7.9 | ⬜ | U | `ADMIN_EMAIL` / `SUPPORT_EMAIL` are monitored inboxes | You'll actually see alerts |
| 7.10 | ⬜ | U | HTTPS + valid cert, HTTP redirects to HTTPS | Padlock |
| 7.11 | ⬜ | U | `/sitemap.xml` + `/robots.txt` correct on the real domain | Absolute prod URLs |
| 7.12 | ⬜ | U | Rate limits sane for real traffic | Not locking out normal customers |
| 7.13 | ⬜ | U | DB backups enabled on Neon | Restore point exists |

---

## Phase 8 — Launch day & rollback

| # | Status | Owner | Task | Pass criteria |
|---|---|---|---|---|
| 8.1 | ⬜ | C | Post-deploy smoke script (health, sitemap, a product page, add-to-cart) | One command, runs in < 1 min |
| 8.2 | ⬜ | U | Uptime monitoring on `/health` with alerting | Alert reaches your phone |
| 8.3 | ⬜ | U | Error tracking (Sentry or equivalent) | Right now errors only hit the server console — you'd never know |
| 8.4 | ⬜ | U | Written rollback plan | You know how to revert in < 5 min |
| 8.5 | ⬜ | U | One real end-to-end purchase **on production** with a real card | Then refund it |
| 8.6 | ⬜ | U | Watch orders + inbox closely for the first 48h | Catch what testing missed |

---

## Appendix — the silent catastrophes

Failures that produce **no error anywhere** and are only noticed via angry customers:

1. **Webhook not reachable** → paid orders never confirm, then auto-cancel after 24h (§1.2)
2. **Wrong `RESEND_API_KEY`** → every email silently vanishes (§2)
3. **`NEXT_PUBLIC_API_URL` unset** → storefront serves demo data forever, looks fine (§7.4)
4. **`NEXT_PUBLIC_ENABLE_DEMO=true`** → public admin access (§7.1)
5. **No geo-detection** → local customers priced in USD and pushed to a card they may not have (§0.3)
6. **API blip** → every product page 500s (§0.1)

Each of these looks *completely healthy* from the outside. Test them deliberately.
