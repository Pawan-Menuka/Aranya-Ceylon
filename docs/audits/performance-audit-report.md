# Performance Checklist Audit — Aranya Ceylon — 2026-09-17

Status legend: pending | in-progress | done | skipped (reason)

Every item was checked against the current code (backend Express/Prisma API, `aranya-next` Next.js
14 storefront). The checklist's ✅/❌ marks are a legend, not a self-assessment: ✅ = this practice
should be present, ❌ = this anti-pattern should be absent. "Pass" below means the desired state
holds (practice present for a ✅ row, anti-pattern absent for a ❌ row) — file:line evidence included.

## Findings

| # | Item | Should | Actual state | Verdict | Evidence |
|---|---|---|---|---|---|
| 1 | Cache API responses | be present | absent | **FAIL** | No caching middleware, `Cache-Control`/`ETag`, or Redis/node-cache anywhere in `backend/src`. |
| 2 | Load balancer | be present | absent | **FAIL** | No LB/cluster config in the repo at all; `README.md` explicitly says cron jobs run in every instance and must be gated behind leader election "before scaling horizontally." Not code-fixable without a hosting decision — see note below. |
| 3 | Index the database | be present | present (minor gap) | **PASS** | Prior PERF-02 indexes all present (`schema.prisma:238-241,257-259,270,187`). `CartItem`/`WishlistItem` FK columns have no dedicated index — low risk, always queried by `cartId`/`userId` first. |
| 4 | Compress images | be present | absent | **FAIL** | `next/image` is used **nowhere** in `aranya-next/src`. Product cards render a CSS/SVG placeholder (`SpicePhoto.tsx:5-45`, labeled "Photography placeholder" — no real photos yet). The one raster `<img>` (admin thumbnail, `AdminProducts.tsx:274`) bypasses optimization. The `images.remotePatterns` config (`next.config.mjs:16-21`) is currently dead code. |
| 5 | Loading skeletons | be present | absent | **FAIL** | No skeleton/shimmer components exist anywhere (`grep Skeleton\|Shimmer\|animate-pulse` → 0 hits). Only plain text: `AdminOrders.tsx:450` (`"Loading orders…"`). |
| 6 | Cache expensive queries | be present | absent | **FAIL** | Admin dashboard (`analytics.admin.controller.ts:21-241`) re-runs a 90-day order scan + aggregation from scratch on every request. No memoization/TTL cache anywhere. |
| 7 | N+1 database queries | be absent | present | **FAIL** | Real N+1 shapes in `webhook.controller.ts:88-111` (nested loop, gift-set resolution), `webhook.controller.ts:201-206`, `checkout.controller.ts:142-146` (**hot path — every checkout**), and `scheduler.ts:128-130` (cron loop with genuinely unbounded outer cardinality). |
| 8 | Debounce input handlers | be present | present | **PASS** | `SearchClient.tsx:142-152` (220ms timer + cleanup), `AdminOrders.tsx:324-342` — both correctly debounced. |
| 9 | Split code into chunks | be present | absent | **FAIL** | `next/dynamic` is never used anywhere in `aranya-next/src`. Heavy admin panels and checkout-only libraries load in the same bundle as everything else within their route. |
| 10 | Add CDN | be present | present | **PASS** | Cloudinary configured for product images (`next.config.mjs:16-21`); Cloudflare documented as the recommended front door in the [deployment checklist](../operations/deployment-checklist.md), with geo-detection already wired (`backend/src/middleware/market.ts:36`). |
| 11 | Server-side caching | be present | present | **PASS** | Solid ISR/fetch-cache usage: route `revalidate` exports and `fetch(..., { next: { revalidate } })` across `src/app/**` and `src/lib/api/*.ts`, plus a tag-based on-demand revalidation endpoint. |
| 12 | Paginate large lists | be present | partially present | **PARTIAL** | Admin/product/order lists mostly use real cursor pagination. But `order.controller.ts:18-26` (`listMyOrders`, customer-facing) is **fully unbounded**, and several admin lists use a hard `take: 500` cap as an acknowledged workaround (existing `PERF-07` comment), not true pagination. |
| 13 | Lighthouse audit | be present | absent | **FAIL** | No Lighthouse tooling anywhere (no `.lighthouserc`, no CI step). Only an unchecked manual row in the [deployment checklist](../operations/deployment-checklist.md) ("U" = untested). |
| 14 | Compress API payloads | be present | absent | **FAIL** | `compression` is not in `backend/package.json` and not wired into the Express app. |
| 15 | Unnecessary re-renders | be absent | present | **FAIL** | `MarketContext.tsx:57` passes a new object literal as its provider `value` on every render (widely consumed — catalog, cards, checkout). `React.memo` is used **nowhere** in the codebase (0 hits), so list rows re-render regardless of parent-render frequency. `CartContext`/`AuthContext` do memoize their value correctly, by contrast. |
| 16 | Minify JS and CSS | be present | present | **PASS** | Nothing in `next.config.mjs` disables SWC minification; `build` script is a real `next build`. |
| 17 | Add lazy loading | be present | absent | **FAIL** | Same root cause as #4 — no `<Image>` usage means no lazy-loading behavior to speak of; the custom `ImageSlot` web component has no lazy/`IntersectionObserver` logic either. |
| 18 | Defer non-critical scripts | be present | present | **PASS** | `ImageSlot.tsx:22` uses `next/script` with `strategy="afterInteractive"`. No raw eager `<script src>` tags found. |
| 19 | Unused dependencies | be absent | essentially absent | **PASS** | Backend (35 deps), `aranya-next` (11 deps), and `shared` (2 deps) are all cleanly used. Only the **root** `package.json`'s `vitest` devDependency has no corresponding root test config/files — trivial. |
| 20 | Database connection pooling | be present | present | **PASS** | `PrismaNeon` adapter wired to the pooled `DATABASE_URL` (`backend/src/index.ts:56-64`); migrations correctly use the separate unpooled `DIRECT_URL` (`prisma.config.ts:12-16`). |

**Score: 8 pass, 11 fail, 1 partial.** 10 of the 15 "should be present" items are missing; both
"should be absent" anti-patterns (N+1 queries, unnecessary re-renders) are confirmed present; the
third ("unused dependencies") is essentially clean.

## Wave 1 — Hot-path / broad-impact fixes

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 1 | High | `backend/src/controllers/checkout.controller.ts:142-146`, `webhook.controller.ts:88-111,201-206`, `jobs/scheduler.ts:128-130` | N+1 query loops — one on the checkout hot path, one cron loop with unbounded outer cardinality | Converted the three independent-per-item loops (checkout stock reservation, webhook stock release, webhook gift-set resolution) to `Promise.all`, matching the concurrent-tx pattern the refund flow already used — same correctness, concurrent round-trips instead of serial. The stale-order cron loop stays serial (each order is its own transaction/connection; the existing code comment already explains why it can't be a bulk update) but is now capped at 200 orders/run so a backlog can't open unbounded connections in one tick. | done |
| 2 | High | `backend/src/index.ts` (Express app setup) | No response compression on any API payload | Added the `compression` package + `@types/compression`, wired as `app.use(compression())` right after `helmet()`. | done |
| 3 | Medium-High | `backend/src/controllers/product.controller.ts`, `category.controller.ts` | No caching on public GET endpoints (products, categories) | HTTP-layer `Cache-Control` was deliberately **not** used — responses vary per visitor by market (signed cookie / `CF-IPCountry`, see `middleware/market.ts`), so a shared/CDN cache could leak one visitor's market+currency to another. Instead added an in-memory TTL cache (new `lib/simpleCache.ts`), keyed explicitly by market, applied to `getFeatured`/`getBestsellers`/`listCategories` — the three lowest-cardinality, highest-traffic public reads. | done |
| 4 | Medium | `backend/src/controllers/admin/analytics.admin.controller.ts:21-241` | Admin dashboard aggregation recomputed from scratch on every request | Wrapped in the same `withCache` helper, 60s TTL, single global key (response has no per-admin personalization). TTL-only expiry, no active invalidation — same staleness tolerance the storefront's own ISR pages already accept. | done |

## Wave 2 — Frontend perf gaps

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 5 | Medium | `aranya-next/src/components/MarketContext.tsx:57` | Context provider `value` is a new object literal every render | Wrapped in `React.useMemo([market, setMarket, pending])`, matching `CartContext`/`AuthContext`'s existing pattern. Verified live: the market switcher (Sri Lanka/LKR ↔ International/USD) still works correctly. | done |
| 6 | Medium | `aranya-next` — no `next/dynamic` usage anywhere | Heavy/rarely-used client pieces (admin panels, checkout-only libs) aren't code-split within their route | `AdminApp.tsx`'s hash router statically imported all 7 admin sections (Dashboard/Orders/Products/Blog/Recipes/Gifts/Audit) even though only one renders at a time — converted all 7 to `next/dynamic`. No custom loading fallback added (renders nothing while the chunk loads), to avoid introducing new placeholder UI. Verified live in the browser: all 7 sections load correctly on route switch. | done |
| 7 | Low-Medium | `aranya-next/src/components/admin/AdminOrders.tsx`, `account/AccountDashboard.tsx` | No skeleton/shimmer loading UI, just plain text | Added a single generic pulsing-bar primitive (`.skeleton-pulse` in `globals.css`, no new colors — every caller supplies its own background via the `--line`/`--ad-line-2` tokens already in scope). Applied to: `AdminOrders`' table (skeleton rows on true first load only, not on background refetches with cached rows already showing), and `AccountDashboard`'s addresses/wishlist/orders loading states, each shaped to match its own real content's existing card/row shell exactly. Verified structurally in the browser via DOM inspection (element count, computed size/radius/animation) for all three shapes — screenshots don't settle on an infinitely-pulsing element, so this was more reliable than a visual capture. | done |
| 8 | Info | `SpicePhoto.tsx`, `next.config.mjs:16-21`, `AdminProducts.tsx:274` | `next/image` unused; real product photography isn't wired in yet (still CSS/SVG placeholders), so "compress images"/"lazy load images" have nothing to act on except the one admin `<img>` | **Postponed per user decision (2026-09-17): real product/site photography is coming later.** Revisit once real images exist — route them through `next/image`, then re-check lazy-loading/`priority` usage. This is `/ui-drop` territory, not a plain bug fix. | postponed (blocked on real images) |

## Wave 3 — Low-risk cleanup

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 9 | Low | `backend/src/controllers/order.controller.ts:18-26` | Customer's own order list (`listMyOrders`) has no pagination at all | Didn't add full cursor pagination — the frontend (`AccountDashboard.tsx`) renders the whole array with no "load more" UI, so that would've meant new UI, not a plain bug fix. Instead added `take: 200`, the same interim-cap pattern already used elsewhere in this codebase (`PERF-07`, e.g. `product.service.ts`, `blog.admin.controller.ts`) — closes the true-unbounded risk without touching the frontend. | done |
| 10 | Low | root `package.json` | `vitest` devDependency with no root-level test config/files | Removed; confirmed no root `vitest.config.*` exists and `pnpm install` cleanly dropped it from the lockfile. | done |
| 11 | Low | `backend/prisma/schema.prisma` (`CartItem`, `WishlistItem`) | FK columns without a dedicated index | Added `@@index([productId])` + `@@index([variantId])` to `CartItem` — turned out not to be purely theoretical: `product.service.ts` has a real `tx.cartItem.count({ where: { variantId } })` query (checking a variant isn't in any live cart before archiving it) that had no usable index at all. New raw-SQL migration `20260918120000_add_cartitem_perf_indexes` (same `IF NOT EXISTS` style as the existing `add_perf_indexes` migration). Left `WishlistItem.productId` alone — no actual reverse-lookup query exists for it anywhere in the codebase, so it stays genuinely low-risk/optional. Deployed by the user via `prisma migrate deploy` against the real database (2026-09-18). | done |
| 12 | Low | repo-wide | No Lighthouse CI automation, only a manual unchecked checklist row | Added `aranya-next/lighthouserc.json` + a report-only `Lighthouse CI` step to `.github/workflows/ci.yml`'s `quality` job. Thresholds mirror the existing manual target in the [deployment readiness plan](../operations/deploy-readiness-plan.md), item 4.7 (Perf ≥ 70, a11y ≥ 90, no CLS failures), rather than inventing new numbers. | done |

## Not fixable in this repo (informational only)

- **#2 Load balancer** — this is a hosting/deployment decision (currently deploys to Railway per
  `.github/workflows/deploy.yml`), not something to codify without knowing the target scaling model.
  The existing README warning (cron jobs run per-instance, need leader election before multi-instance)
  already documents the prerequisite — nothing new to add here unless you're actually about to scale
  horizontally.
