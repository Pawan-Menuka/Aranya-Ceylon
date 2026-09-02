# Audit Report — Aranya Ceylon — 2026-09-02

Production-readiness scan, weighted toward the admin console. Branch: `Develop`.

Status legend: `pending` | `in-progress` | `done` | `skipped (reason)`

**History note:** the original Wave 1/2 fixes in this file were implemented directly
in this worktree, but were never committed. Separately, another contributor
implemented independent fixes for the same findings and merged them to `Develop`
via PR [#117](https://github.com/Pawan-Menuka/Aranya-Ceylon/pull/117) ("fix admin
dashboard accuracy") and PR
[#118](https://github.com/Pawan-Menuka/Aranya-Ceylon/pull/118) ("fix admin orders
refunds and audit accuracy"). This worktree's `Develop` branch was then reset to
match `origin/Develop`, which discarded the uncommitted in-worktree fixes and
adopted the merged ones instead. This report re-verifies every original finding
against that merged, current codebase rather than trusting either implementation
on faith — statuses below reflect what's actually on disk now.

**Verification state:** `aranya-next` typecheck passes clean (`npx tsc --noEmit`,
exit 0). `backend`/`shared` have no `node_modules` in this worktree, so backend
changes were reviewed by hand, not compiled — run `pnpm --filter @aranya/shared
build && pnpm typecheck && npx vitest run` from the main repo before shipping.

**Headline:** every Wave 1 (critical) and Wave 2 (high) finding from the original
scan is now fixed and verified against the current code. Several were implemented
more thoroughly than the original fix approach called for — notably a full
per-variant product editor (SKU/weight/price/currency/market/stock, not just a
single stock number) and a refund flow that prevents a false "refunded" state
from ever being written (Stripe is charged before the DB commits) rather than
detecting the divergence after the fact.

---

## Wave 1 — Critical (data loss, money, fabricated data shown as real)

| # | Finding | Verified fix |
|---|---|---|
| 1 | Gift editor overwrote tagline/blurb with the product name on every save (list endpoint never loaded them). | `AdminGifts.tsx` now fetches the full record via `getAdminGift` before editing, and blocks editing entirely (with an inline message) if that fetch fails. |
| 2 | Recipe editor always sent `dek: title, intro: ""`, blanking real content on every save. | `RecipeEditor` now omits `dek`/`intro` from the PATCH entirely on existing recipes (only sent for new ones), so `recipeSchema.partial()` leaves the real values untouched. |
| 3 | Product stock/price/category were silently discarded on save — the per-weight stock input was uncontrolled and never read. | Full per-variant editor: each variant (SKU, weight, price, currency, market, stock) is individually editable and reconciled by id against the real backend variants on save. Slug editing is also now genuinely supported end-to-end (schema + service), so it's no longer a dead field. |
| 4 | `bestEffort()` swallowed every write rejection across Products/Gifts/Recipes — failures looked identical to success. | `bestEffort` is gone from `lib/api/admin.ts`. Every write in Products/Gifts/Recipes/Blog is awaited; local state is only updated from the real backend response, with an inline error banner on failure. |
| 5 | Dashboard revenue chart + all deltas (`revChange`, `conversion`, etc.) were hardcoded demo constants shown as live data. | `/admin/dashboard` now returns a real 90-day daily series (split by market) and real current-vs-previous-30-day % changes computed from actual orders. `conversionRate` is explicitly `null` (no visit/session tracking exists) rather than a fabricated number. |
| 6 | "Today's revenue"/"Orders today" were a 30-day average mislabelled "Updated live". | The endpoint now computes an exact today-only bucket (UTC calendar day) per market. |
| 7 | Order drawer showed an invented 92/8 subtotal/shipping split and hardcoded `payment: "Card"`. | Real `shippingCost`, `discount`, and item-sum subtotal are now returned and used; payment method is derived from market (LOCAL→PayHere, INTERNATIONAL→Stripe). |
| 8 | Audit log read a nonexistent `meta` field (always blank) and hardcoded every actor role to `"ADMIN"`. | Backend now selects `actor.role`; frontend reads the real `diff` field and `actor?.role ?? "JOB"`. |
| 9 | `PRODUCT_CREATE`/`UPDATE`/`ARCHIVE`/`ADMIN_LOGIN` audit events were declared but never written. | All four now call `writeAuditLog` (product controller + login, admin-role-gated). |

## Wave 2 — High (broken workflows, wrong figures, refund edge cases)

| # | Finding | Verified fix |
|---|---|---|
| 10 | Orders list capped at 20 (backend default), dead "Next" button, tab counts described only the loaded page. | `/admin/orders` returns a `groupBy`-derived `counts`/`total` across the full matching set; frontend has working cursor-forward+back pagination with a history stack. |
| 11 | Status/market/search filters applied client-side to the loaded page only. | Filters are passed to `listAdminOrders` and refetched server-side (debounced search). |
| 12 | No tracking-number input anywhere; shipping emails never fire in production. | Tracking number field added to the drawer; required before an order can move to SHIPPED (enforced both client-side and via a zod `superRefine` server-side). |
| 13 | Order timeline was entirely fabricated (invented copy, all stamped with the order-creation date). | Real `OrderEvent` rows are now embedded in the order response and rendered directly, with real event notes. |
| 14 | Orders table/drawer showed raw cuids while the audit log showed `AC-XXXXXX`. | `formatOrderNumber` used consistently in the table, drawer header, and CSV export. |
| 15 | Blog create never merged the real backend id into local state → a second save re-created a duplicate post. | `save()` awaits `createBlog`/`updateBlog` and replaces local state with the real returned record. |
| 16 | Network writes fired from inside `setRows` updaters (impure; double-fires under StrictMode). | All API calls in Blog/Products now happen before `setRows`, never inside the updater callback. |
| 17 | Blog/Product delete buttons had no `onClick`. | Blog wires to `deleteBlog`; Products archive via `archiveAdminProduct` (no hard-delete endpoint exists) — both behind a confirm step. |
| 18 | Market-split donut rendered `NaN%` when total revenue was 0. | Guarded with `total > 0 ? ... : 0` via a `shareOfTotal` helper. |
| 19 | `getAuditLogs`'s `?limit=` param could produce `NaN` → Prisma 500. | Clamped the same way `listOrders` already was (`Number.isFinite` → `Math.min(Math.max(1, trunc), 200)`). |
| 20 | `pendingFulfilment` counted only `PROCESSING`, excluding freshly-PAID orders; disagreed with `AdminOrders`' own count. | Now counts `{ status: { in: ['PAID', 'PROCESSING'] } }`. |
| 21 | PayHere (LOCAL) refunds flipped status to REFUNDED with no gateway refund, reported as unqualified success. | Backend now requires (and the UI enforces via a checkbox) an explicit `manualGatewayRefundCompleted` confirmation before a LOCAL refund is recorded — a 409 blocks it otherwise. |
| 22 | A Stripe failure *after* the DB commit left a false REFUNDED row; the frontend then rolled it back to "paid", hiding the divergence. | Redesigned so Stripe is charged **before** the DB transaction — a gateway failure now leaves the order and stock completely untouched (502 returned), so the false-state scenario can no longer occur. On any refund error the frontend re-fetches the real order from the server instead of guessing a rollback value. |

## Small fix made during this re-verification pass

- `AdminAudit.tsx`: the "warn" level check referenced a `PRODUCT_DELETE` event that
  the backend never emits (the real event is `PRODUCT_ARCHIVE`), so archived-product
  audit rows were silently missing their warn styling. Corrected to `PRODUCT_ARCHIVE`.

## Wave 3 — Medium (misleading UI, cross-page consistency, one policy question)

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 23 | Medium | `AdminOrders.tsx:222` | The order drawer's "Packing slip" button has no `onClick` — it looks functional (download icon, same styling as working buttons) and does nothing. | Wire it to generate/download a packing slip, or remove it until that capability exists. | done |
| 24 | Medium | `AdminDashboard.tsx:176` | `TopProductsCard`'s "View all" button has no `onClick` and the component never receives a navigation callback — clicking it does nothing, though every other "go to X" affordance on the dashboard (low stock, fulfillment queue, wholesale) correctly navigates. | Pass the existing `go` callback into `TopProductsCard` and wire the button to `go("products")`. | done |
| 25 | Medium | `AdminDashboard.tsx` (`LowStockCard`, backed by `analytics.admin.controller.ts`'s `lowStockVariants` query, `LOW_STOCK_THRESHOLD` env default 10) vs `AdminProducts.tsx` (`tab === "low"` / `lowCount`, hardcoded `stock < (category === "Gift Sets" ? 10 : 25)`) | The dashboard's "Low stock" panel and the Products page's "Needs restock" tab use two unrelated definitions of "low": the dashboard checks each **variant**'s stock against one global threshold (default 10), while Products checks each **product's total** stock (summed across all its variants) against a category-dependent threshold (10 or 25). The same product can show as needing restock on one screen and not the other. | Pick one definition (variant-level vs. product-aggregate) and one threshold source, and use it on both screens — or clearly label them as different metrics if both are intentionally kept. | done |
| 26 | Low | `AdminProducts.tsx:278` | The product photography section's hint text reads "Drag to reorder" but no drag-and-drop is implemented anywhere in the editor (no `draggable`/`onDragStart`/`onDrop`). | Either implement reordering or remove the claim from the hint text. | done |
| 27 | Medium | `backend/src/controllers/webhook.controller.ts:73` (increments `coupon.usageCount`); no corresponding decrement anywhere in the codebase | Refunding an order never restores the coupon's `usageCount` (or any per-order usage record) that was incremented when the order was paid. A customer who used a limited-use coupon and was later refunded has permanently consumed one use of it — a promo with `usageLimit: 100` can be exhausted partly by orders that were reversed. **Confirmed a bug, not intended policy** (user decision 2026-09-03). | Decrement `usageCount` inside the refund transaction in `order.admin.controller.ts`. | done |
| 28 | Low | `AdminAudit.tsx:21` (`eventMap`), `:48` (`ACTION_META`) | `GIFT_CREATE`/`GIFT_UPDATE`/`GIFT_DELETE`, `RECIPE_CREATE`/`RECIPE_UPDATE`/`RECIPE_DELETE`, and `BLOG_CREATE`/`BLOG_UPDATE` aren't in either map, so those audit rows fall back to the generic `{ icon: "audit", tone: "slate" }` treatment instead of a purpose-built icon/label like the events that are mapped (`product.create`, `order.refund`, etc.). Functional, just less informative at a glance than the other 60% of events. | Add the missing entries to both maps, following the existing naming convention (`gift.create`, `recipe.update`, etc.). | done |

### Wave 3 fix notes

- **Verification:** `aranya-next` typecheck passes clean after all Wave 3 edits.
- **#23:** removed — no packing-slip generation capability exists anywhere in the codebase, so wiring it up would mean building a new feature, not fixing a bug. Safer to remove the button than leave a false affordance.
- **#24:** `TopProductsCard` now takes a `go` prop and its "View all" button calls `go("products")`, matching every other navigation affordance on the dashboard.
- **#25:** added a shared `NEXT_PUBLIC_LOW_STOCK_THRESHOLD` frontend constant (`lib/inventory.ts`, default 10, mirrors the backend's `LOW_STOCK_THRESHOLD`) and a variant-level `isLowStock()` helper in `AdminProducts.tsx` — a product is now flagged the moment any ONE of its variants is at/under the shared threshold, matching the dashboard's per-variant check, instead of comparing an aggregate total against an arbitrary category-based number. `StockMeter` gained an optional `low` override prop so its color reflects the same authoritative signal rather than re-deriving it from the aggregate figure it displays.
- **#26:** hint text no longer claims drag-to-reorder; still notes the first uploaded image is the cover (true).
- **#28:** added `blog.create`/`blog.update`/`gift.create`/`gift.update`/`gift.delete`/`recipe.create`/`recipe.update`/`recipe.delete` to both `eventMap` and `ACTION_META`. Also fixed an adjacent oversight noticed while touching this code: `BLOG_DELETE` had "warn" styling in `ACTION_META` but was missing from the `level === "warn"` list, so deleted blog posts weren't actually flagged under the "Refunds & alerts" filter — added it there alongside the two new `*_DELETE` events.
- **#27:** confirmed a bug per user decision. `refundOrder` now decrements the order's coupon `usageCount` by 1 inside the same DB transaction that flips the order to REFUNDED and restores stock (only when the refund is actually claimed — the existing `claimed.count === 0` early-return already guards against double-processing, so this can't double-decrement on a retry). Also recorded in the `ORDER_REFUND` audit log diff (`couponUsageDecremented`) for traceability. **Not verified by compiling/running the backend** — this worktree has no `node_modules` for it (#40); reviewed carefully by hand against the existing transaction and the `Coupon.usageCount` field used identically elsewhere (`webhook.controller.ts`).
- **#27 — not fixed, needs your call:** left exactly as found. This is a business-policy question (should a refund un-consume a limited-use coupon?), not something to decide unilaterally in a bug-fix pass.
