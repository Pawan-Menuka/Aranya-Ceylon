# Storefront Audit Report — Aranya Ceylon — 2026-09-03

Scope: customer-facing cart, checkout, payment (Stripe + PayHere), and auth — the
parts a real customer touches. Branch: `claude/storefront-audit`.

Status legend: `pending` | `in-progress` | `done` | `skipped (reason)`

**Headline:** this side of the codebase is in noticeably better shape than the
admin console was before its audit. Money math is done in integer cents
end-to-end, webhook handling is idempotent and concurrency-safe (atomic
PENDING→PAID claim, atomic stock decrement with a `stock >= qty` guard so it
can never oversell), refresh tokens rotate with reuse detection that nukes the
whole token family, order lookups are IDOR-guarded, and PayHere notifications
are cross-checked against merchant ID and the actual charged amount/currency
before being trusted. Most of the obvious failure classes from the admin audit
(fabricated data, silent failures, missing audit trail, double-submit races)
are already handled here — the code is full of `#N` / `BUG-XX` comments citing
prior fixes, so this has clearly been through this process before.

Only two findings, both genuinely minor:

| # | Severity | File:line | Finding | Fix approach | Status |
|---|---|---|---|---|---|
| 1 | Low-Medium | `backend/src/services/payhere.service.ts:104` (`verifyPayHereNotification`) | The PayHere webhook signature check uses a plain `===` string comparison (`params.md5sig === expectedHash`) instead of a constant-time comparison. This is a textbook timing-side-channel anti-pattern for any signature/HMAC check, even though the practical exploitability here is low (MD5 digest, hashed secret, and the attacker would need very precise timing measurements over the network). Cheap to fix while it's fresh. | Compare with `crypto.timingSafeEqual` on two equal-length buffers (hex-decode both sides first, or pad/guard for length mismatches since `timingSafeEqual` throws on unequal lengths). | done |
| 2 | Low | `aranya-next/src/components/CartContext.tsx` (`clearPromo`), `backend/src/routes/cart.routes.ts` (no remove-coupon route) | Once a coupon is successfully applied via `POST /cart/coupon`, there is no way for the customer to voluntarily remove it — no UI affordance exists, and there's no backend endpoint to clear `cart.couponId` short of deleting the entire cart. `clearPromo()` exists but is only ever called automatically, from the checkout error handler, when a previously-valid coupon turns out to be invalid by the time checkout runs. This isn't a money or security bug (the discount is real and was intentionally applied), just a "can't change my mind" UX gap. | Add `DELETE /cart/coupon` (clears `cart.couponId`) and a visible "remove" affordance next to the applied-promo display in `CartDrawer.tsx`, wired to `clearPromo()` plus the new endpoint. | done |

## Fix notes

- **#1:** `verifyPayHereNotification` now hex-compares via `crypto.timingSafeEqual`, first checking buffer lengths match (a garbage/short forged signature is rejected outright, not passed to `timingSafeEqual`, which throws on length mismatch). Exact same accept/reject semantics as before — the existing `payhere.service.test.ts` suite (correct signature, tampered amount, tampered status, garbage signature) covers this without changes.
- **#2:** Added `DELETE /cart/coupon` (`cartController.removeCoupon`, mirrors the shape of `clearCart`/`applyCoupon`) that clears `cart.couponId`. `CartContext.tsx`'s `clearPromo()` now calls it (best-effort, fire-and-forget, matching the existing pattern for `clear()`/`remove()`). Added a small "Remove" link next to the applied-promo confirmation in `CartDrawer.tsx`, styled consistently with the existing "+ Add a gift note" toggle in the same file. No test coverage added — there's no existing `cart.controller.test.ts` harness to extend, and standing one up for a single trivial Prisma-update endpoint would be disproportionate; the change is a straightforward mirror of `applyCoupon`'s already-covered shape.
- **Verification:** `aranya-next` typecheck passes clean. Backend reviewed by hand — this worktree still has no backend `node_modules` (#40); run `npx vitest run` from `backend/` in the main repo before merging, same as prior waves.

## Notes on what I checked but did NOT flag (verified working, not regressions to introduce)

- **Double-submit protection**: `CheckoutClient.tsx`'s `placeOrder` guards on a `placing` flag and the Stripe pay button guards on `paying` — a double-click can't fire two concurrent `createIntent`/`confirmPayment` calls.
- **Coupon usage-limit race**: acknowledged and accepted in `KNOWN_ISSUES.md` already (redemptions counted at payment time, not reserved at apply time) — a few extra redemptions could theoretically slip through under heavy concurrent use of a tightly-limited coupon. Pre-existing, documented, accepted for launch; not re-flagging.
- **Guest order polling exposure**: `GET /orders/:id` for an unauthenticated caller only returns `{id, status, total, currency}` and explicitly 403s if the order belongs to a signed-in user — the only residual exposure is an unguessable cuid, which is the intended design for guest checkout polling.
- **`adminLimiter`/`checkoutLimiter`**: both defined in `rateLimit.ts` and confirmed actually wired into their routes (I double-checked this since it's an easy thing to define-and-forget) — not a gap.

## Verification state

Backend logic reviewed by hand (money math, transaction boundaries, webhook
idempotency, token rotation) — not compiled or run against this specific
review pass. The existing Vitest suite already covers most of this surface
(`checkout.controller.test.ts`, `webhook.controller.test.ts`, `cart.service.test.ts`,
`token.service.test.ts`, `payhere.service.test.ts`) and was green as of the
last full run (78/78 passing) before this audit started.
