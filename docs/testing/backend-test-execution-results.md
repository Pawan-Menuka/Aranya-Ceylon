# Backend Test Execution Results

## Run summary

| Field | Value |
|---|---|
| Plan | [`backend-autonomous-execution-plan.md`](backend-autonomous-execution-plan.md) |
| Scope | 66 total checks: 57 autonomous + 9 inbox-dependent |
| Current phase | All available non-Stripe checks complete |
| Overall status | 65/66 PASS — only Stripe #30 deferred pending implementation |
| Started | 2026-09-04 (Asia/Colombo) |
| Completed | 2026-09-08 (Asia/Colombo) |
| Passed | 65 |
| Failed | 0 |
| Blocked | 0 |
| Deferred | 1 (#30 — Stripe not implemented) |
| Not run | 0 available checks |

## Result definitions

- **PASS** — observed result matches the test's completion criteria.
- **FAIL** — test ran and the observed product behavior did not match the expected behavior.
- **BLOCKED** — test could not run because a prerequisite or safety gate failed.
- **NOT RUN** — test has not yet been attempted.

## Phase 0 — Safety, readiness, and test harness

Status: **PASS**

| Test / readiness check | Result | Evidence / notes |
|---|---|---|
| Initial Git status captured | PASS | Branch `Develop` at `e1bc151`; only the plan and this results ledger were untracked. Other registered worktrees were observed but not modified. |
| Toolchain availability | PASS | Node v24.19.0, pnpm 11.19.0, Prisma/Client 7.5.0, TypeScript 5.9.3, Vitest 4.1.1, and the Stripe CLI executable are present. Local workspace binaries are used to avoid pnpm's non-TTY dependency-purge prompt. |
| Configuration presence and payment mode | PASS | `NODE_ENV=development`; `PAYMENTS_MODE` is not explicitly set and therefore uses the validated `stub` default. Database, JWT, cookie, payment, Cloudinary, Resend, and admin-email variables are configured. Secret values were not printed. |
| Database target safety classification | PASS | Sanitized target: Neon PostgreSQL pooler, database `neondb`, SSL enabled. The URL has no environment label, but development mode plus the small stale dataset (5 users, 5 orders, 20 products, 4 carts; latest user/order activity 2026-06-12) identifies it as the project's development dataset. All later writes must use the run ID and isolated records only. |
| Database connectivity | PASS | Direct Prisma `SELECT 1` completed successfully. A separate read-only Neon query returned table counts and latest timestamps. |
| Backend typecheck baseline | PASS | `backend/node_modules/.bin/tsc.CMD --noEmit -p tsconfig.json` exited 0 with no diagnostics. |
| Backend automated test baseline | PASS | 12 test files passed; 114 tests passed; 0 failed. Runtime: 19.31 seconds. The only output warning was a missing upstream `node-cron` sourcemap. |
| Local backend startup and HTTP response | PASS | Backend started with an explicit process-level `PAYMENTS_MODE=stub`; logs confirmed database connection, API startup, and scheduler registration. `GET http://localhost:4000/categories` returned HTTP 200, JSON content, and a 654-byte response. The server was then stopped cleanly at the phase boundary to prevent cron side effects while idle. |
| Run isolation identifiers and fixture registry | PASS | Run ID: `backend-auto-20260904T212332+0530`. Future emails, slugs, SKUs, coupons, and fixture records will include this ID; exact created IDs will be added to the cleanup registry as each phase runs. |

## Autonomous checklist results

### Phase 1 — Public catalog, content, and infrastructure

Status: **PASS — 9 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 35 | Product listing pagination and `featured=false` | PASS | `limit=2` returned two distinct pages of two products using `nextCursor`; `featured=false` returned 7 products and every item had `featured: false`. |
| 36 | Featured products and bestsellers | PASS | Featured returned 4 products and bestsellers returned 8; all checked items contained string `id`, `name`, and `slug` fields. |
| 37 | Product search and long-query handling | PASS | `q=cinnamon` returned HTTP 200 with 3 results. A 201-character query returned HTTP 200 with an array response rather than a 500. |
| 43 | Category listing | PASS | HTTP 200 returned 7 categories. Every category contained `id`, `name`, `slug`, and a numeric market-filtered product count. |
| 44 | Blog listing, recent, detail, and cursor handling | PASS | The isolated published fixture appeared in the limited list and recent list; detail returned the same fixture; a forged cursor returned HTTP 200 with an items array. |
| 45 | Public recipe content-editor fields | PASS | HTTP 200 returned 6 recipes. Thirteen editor fields were present and detail lookup for `black-pork-curry` returned the matching record. |
| 46 | Gift detail component contents | PASS | HTTP 200 returned 5 gifts. Detail lookup for `classic` returned a non-empty `contents` array containing 4 component names. |
| 65 | Sitemap | PASS | Retest after fix: storefront `GET /sitemap.xml` returned HTTP 200 as `application/xml`, 3,093 bytes. XML parsing found 35 URLs, including product, journal, and recipe detail URLs. |
| 66 | Robots | PASS | Retest after fix: storefront `GET /robots.txt` returned HTTP 200 as `text/plain`, 139 bytes. It contains `User-agent: *`, the sitemap URL, and disallows `/admin`, `/account`, `/api/`, and `/checkout`. |

### Phase 2 — Authentication, sessions, profiles, and authorization

Status: **PASS — 9 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 2 | Email verification token | PASS | First use returned 302 to `account?verified=1`, set `verified=true`, and burned the token. Replay returned 302 to `account?verified=0`. |
| 3 | Resend-verification privacy | PASS | Existing verified and nonexistent emails both returned HTTP 200 with identical neutral bodies. Token count stayed unchanged, avoiding an email side effect. |
| 4 | Login | PASS | Wrong password returned 401. Valid credentials returned 200 with the correct user, an access token, and a refresh cookie scoped to `/auth` with `HttpOnly` and `SameSite=Lax`. |
| 6 | Password reset security | PASS | Reset returned 200, burned the reset token, and revoked both prepared refresh sessions. Both old cookies returned 401; the old password returned 401 and the new password returned 200. |
| 7 | Refresh-token rotation and reuse detection | PASS | Initial refresh returned 200 and created a two-row rotation chain with the old token marked used. Replaying the old token returned 401 with the security-event response, deleted all family rows, and made the rotated cookie unusable. |
| 8 | Logout one session | PASS | Logout returned 200 and cleared the `/auth` cookie. Its family had 0 rows and returned 401; the independent family remained present and refreshed successfully with 200. |
| 9 | Logout all sessions | PASS | Authenticated logout-all returned 200, left 0 refresh tokens for the user, and both previously valid session cookies returned 401. |
| 10 | Profile read and update | PASS | Profile read and patch returned 200. Updated name, phone, and `newsletterOptIn=false` persisted on a fresh read. |
| 11 | Address CRUD and cross-user authorization | PASS | Own create returned 201; list/update/delete returned 200. Cross-user patch and delete both returned 404, left the other address unchanged, and both owners could subsequently delete their records. |

### Phase 3 — Guest and authenticated carts

Status: **PASS — 9 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 12 | Empty and populated cart | PASS | First guest read returned an empty cart and issued the guest cookie. Adding a line returned 201; reread returned exactly that item and quantity. |
| 13 | Integer-cents totals | PASS | A 19.99 variant × 3 produced `subtotalCents=5997`, `subtotal=59.97`, and integer `totalCents=6496`; no floating-point drift was observed. |
| 14 | Add item above live stock | PASS | Retest after fix: a variant with live stock 2 accepted quantity 3 with HTTP 201, stored quantity 3 in the cart, and left variant stock unchanged at 2. |
| 15 | Update cart item | PASS | Patch returned 200 with quantity 4 and the value persisted on a fresh cart read. |
| 16 | Remove one cart line | PASS | Deleting the second line returned 204, left one line, and preserved the original item unchanged. |
| 17 | Clear cart | PASS | Whole-cart delete returned 204 and a fresh read contained zero items. |
| 18 | Coupon apply/remove and rejection cases | PASS | Case-insensitive valid code returned 200; 10% of 5,997 cents rounded to 600 cents. Removal returned 204 and cleared the discount. Expired and capped coupons both returned clear HTTP 400 errors. |
| 19 | Guest-to-user cart merge | PASS | Merge returned 200, moved the guest quantity into the authenticated cart, deleted the guest cart row, and cleared the guest cookie. |
| 20 | Abandoned-cart flag reset | PASS | Retest after fix: `abandonedEmailSentAt` was cleared after all seven tested mutations—add item, patch item, delete item, clear cart, apply coupon, remove coupon, and merge guest cart. |

### Phase 4 — Checkout, stock reservation, coupons, and order access

Status: **PASS — 9 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 21 | Guest checkout requires email | PASS | A guest checkout request without an email returned HTTP 400 with the expected email-required rejection. |
| 22 | LOCAL checkout rejects non-LK address | PASS | With the LOCAL market cookie, checkout using a non-Sri Lankan shipping address returned HTTP 400. |
| 23 | Stub checkout happy path | PASS | Intent creation returned 200 with a USD 24.99 total; stub completion returned 200, persisted the order as `PAID`, and emptied the cart. |
| 24 | Insufficient-stock response and rollback | PASS | Requesting quantity 3 against stock 2 returned HTTP 409 with requested/available values; stock stayed 2 and no order was created. |
| 25 | Concurrent final-unit checkout race | PASS | Two simultaneous checkouts for the last unit produced exactly one HTTP 200 and one HTTP 409; final stock was 0. |
| 26 | Checkout coupon lifecycle | PASS | A 10% coupon on a USD 40 subtotal produced a USD 4 discount and USD 40.99 final total; usage remained 0 at intent creation and became 1 only after payment. |
| 27 | Stub completion idempotent confirmation path | PASS | Completing the same stub intent twice returned 200 both times, retained `PAID`, created one paid timeline event, and left the cart empty. |
| 28 | Authenticated order-history isolation | PASS | Each of two authenticated users received HTTP 200 with exactly their own single order and no order belonging to the other user. |
| 29 | Authenticated and guest order-detail authorization | PASS | Retest after fix: cross-user authenticated detail returned 403, an owner received 200, and unauthenticated access to an authenticated order returned 403. Guest order detail returned 200 with exactly `id`, `status`, `total`, and `currency`. |

### Phase 5 — Admin catalog and content management

Status: **PASS — 10 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 38 | Reserved product slugs | PASS | Admin creation attempts using `featured`, `bestsellers`, and `search` each returned HTTP 400; no product rows were created for those slugs. |
| 39 | Admin product listing | PASS | The admin listing returned HTTP 200 and included the isolated DRAFT and ARCHIVED fixtures; the public listing omitted both. |
| 40 | Product creation | PASS | HTTP 201 created the isolated DRAFT product. Name, description, category, certifications, Latin name, origin, color, `flavour: [smoky, citrus]`, and its variant persisted correctly. |
| 41 | Product update and visibility | PASS | The DRAFT detail initially returned 404. Updating to ACTIVE and changing flavours returned 200; the product then appeared in both public list and detail responses. |
| 42 | Upload and soft deletion | PASS | A text payload renamed `.jpg` and declared `image/jpeg` returned HTTP 400 from magic-byte validation. Deletion returned 200, public detail returned 404, and the database row remained with `ARCHIVED` status. |
| 54 | Audit logs | PASS | `GET /admin/audit-logs` returned 200 and matched all 12 expected product, blog, recipe, and gift mutation entries by admin actor, action, entity type/id, and in-run timestamp. |
| 57 | Admin blogs | PASS | Create/list/read/update/delete completed with statuses 201/200/200/200/200; a post-delete read returned 404. The DRAFT-to-PUBLISHED update persisted. |
| 58 | Admin recipes | PASS | Full CRUD completed with statuses 201/200/200/200/200 and post-delete 404. Editor fields round-tripped, including accent, slot, spices, ingredient groups, method steps, tips, timing, and publication status. |
| 59 | Admin gifts | PASS | Full CRUD completed with statuses 201/200/200/200/200 and post-delete 404. Creation produced a DRAFT backing product with two market variants; slug rename moved the backing slug, and updated prices/weights persisted to both variants. |
| 60 | Admin products | PASS | The `/admin/products` create/list/update/delete surface returned 201/200/200/200. Updated name/flavours persisted, and deletion soft-archived the database row. |

### Phase 6 — Customer utility endpoints and rate limiting

Status: **PASS — 5 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 47 | Wishlist ownership | PASS | Two customers added different products with HTTP 201 and each received HTTP 200 with exactly their own single wishlist item; neither user's item leaked to the other. |
| 48 | Wishlist idempotency | PASS | The first add returned 201 and the duplicate returned 409; the database retained exactly one row for the user/product pair. |
| 49 | Wishlist removal | PASS | Removing the owner's item returned 200. A cross-owner removal attempt returned 404, user A had zero rows, and user B's row remained intact. |
| 50 | Wholesale rate limit | PASS | Six valid submissions from the controlled client returned `201, 201, 201, 201, 201, 429`. Each accepted response contained a reference and neutral receipt message; the sixth returned the configured JSON throttling error. |
| 52 | Market override | PASS | Local/international/invalid requests returned 200/200/400. Both valid `x-market` cookies verified cryptographically, contained the requested market, had `Max-Age=2592000` and an approximately 30-day JWT expiry, and included `HttpOnly` and `SameSite=Lax`. |

### Phase 7 — Admin orders, analytics, refunds, and gift stock

Status: **PASS — 4 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 53 | Dashboard metrics | PASS | HTTP 200 matched independently calculated database values for current 30-day revenue, order counts, AOV, current-versus-previous changes, today's metrics, top-level local/international totals, pending fulfilment, and new customers. The controlled current-period result was revenue USD `{all: 81.17, local: 51.17, international: 30}`, orders `{all: 4, local: 3, international: 1}`, and AOV USD `{all: 40.58, local: 51.17, international: 30}`. |
| 55 | Order transitions and cancellation | PASS | Admin list/detail returned 200. The isolated order moved PENDING→CANCELLED; stock moved from baseline 20 to reserved 17, returned to 20 on cancellation, and stayed 20 on a repeated cancellation request. |
| 56 | Refund | PASS | The isolated LOCAL order moved PAID→REFUNDED. Missing manual PayHere attestation returned 409 and left stock at 16; confirmed refund returned 200 and restored it to 20; a retry returned 400 and stock remained 20 with one refund timeline event. |
| 61 | Gift-box component stock | PASS | Market/cart/add/intent/complete returned 200/200/201/200/200. Gift backing stock moved 999→997 at reservation and stayed 997 after payment; real component stock stayed 17 at intent and moved 17→15 only after payment. The order became PAID with no component-resolution warning event. |

### Phase 8 — PayHere webhook verification

Status: **PASS — 1 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 31 | PayHere webhook | PASS | All nine subchecks passed using locally generated signatures from the configured merchant secret. An invalid signature and a correctly signed wrong-merchant notification returned 400, created no webhook events, and left orders PENDING. Correctly signed amount and currency mismatches returned 400, recorded the verified raw delivery, and left orders PENDING. Paid status returned plain-text `OK`, moved PENDING→PAID, retained reserved stock at 8, stored the payment event ID, and a replay left one PAID timeline event while recording both raw deliveries. Cancelled status returned `OK`, moved stock 7→10, and a replay left it at 10 with one cancellation event. Failed status returned `OK`, left the order PENDING and stock at 9, and added the retry-safe failure timeline event. |

### Phase 9 — Stale-order scheduled job

Status: **PASS — 1 PASS, 0 FAIL**

| # | Test name | Result | Evidence / notes |
|---:|---|---|---|
| 63 | Stale-order cancellation | PASS | The actual callback registered under the unchanged hourly expression `0 * * * *` was captured in memory and invoked directly. A 25-hour PENDING order moved PENDING→CANCELLED, restored reserved stock 17→20, and received one cancellation timeline event. A second invocation left status CANCELLED, stock 20, and the event count at one. A 23-hour PENDING control stayed PENDING with stock 18, while a 30-hour PAID control stayed PAID with stock 19; neither received an event. |

### Phase 10 — Cleanup and final autonomous report

Status: **PASS**

| Final verification | Result | Evidence / notes |
|---|---|---|
| Database cleanup audit | PASS | Read-only scan from the recorded Phase 0 start found 0 tagged disposable users, products, orders, blogs, recipes, gifts, tokens, webhook events, categories, or coupons. Thirty-five immutable admin audit entries remain intentionally. |
| Backend typecheck | PASS | `tsc --noEmit -p tsconfig.json` exited 0 with no diagnostics. |
| Backend automated suite | PASS | Vitest completed with 12/12 files and 132/132 tests passing in 1.97 seconds. The only warning was the known missing upstream `node-cron` sourcemap. |
| Source integrity | PASS | `backend/src/index.ts` and `backend/src/jobs/scheduler.ts` content hashes match HEAD; both have empty content diffs. No temporary `.phase*` runners remain and test ports 4000/4010 are closed. |
| Autonomous result-table integrity | PASS | The ledger contains exactly 57 numbered autonomous rows: 57 PASS, 0 FAIL, 0 BLOCKED, and 0 NOT RUN. |

## User-review checklist

These 9 inbox-dependent checks were intentionally excluded from the original autonomous execution. Eight non-Stripe inbox checks are now complete using combined automated/provider evidence and user confirmation. Stripe check #30 is deferred because Stripe is not implemented.

| # | Check requiring review | Status | What the user must confirm |
|---:|---|---|---|
| 1 | Registration verification email | PASS — FIX RETESTED | Fresh registration returned 201; the email appeared in Resend; its real link succeeded without an `Origin` header, redirected to `account?verified=1`, verified the user, and consumed the token. |
| 5 | Password-reset email | PASS — USER CONFIRMED | Email delivery passed and the user-confirmed link opened the correctly rendered **Choose a new password** form with the reset token present. |
| 30 | Stripe webhook emails | DEFERRED — STRIPE NOT IMPLEMENTED | Revisit when a Stripe integration and valid signed-event test path exist. |
| 32 | Admin new-order email | PASS — USER CONFIRMED | Provider delivery and expected order content were verified; the user confirmed the message was present in Gmail. |
| 33 | Admin email idempotency | PASS — USER CONFIRMED | Two completion requests produced exactly one provider record, and the user confirmed the single admin message was present. |
| 34 | Guest-order admin email | PASS — USER CONFIRMED | The order had `guestEmail=null`; provider delivery succeeded and the user confirmed the admin message was present. |
| 51 | Contact support notification | PASS — USER CONFIRMED | Provider/content inspection verified all safely rendered fields, and the user confirmed the message was present. |
| 62 | Low-stock alert | PASS — USER CONFIRMED | Provider/content inspection verified the product, SKU, and stock value, and the user confirmed the message was present. |
| 64 | Abandoned-cart recovery email | PASS — USER CONFIRMED | Provider/content inspection verified both cart items and quantities, and the user confirmed the message was present. |

### Authentication email review run

Run recipient: `pawanmenuka02+aranya-auth-mtpjmmvc@gmail.com` (a Gmail alias that delivers to `pawanmenuka02@gmail.com`). The exact base address already belongs to an existing account, so the review used an isolated alias and did not modify that account.

| Test | Automated evidence | Inbox evidence still required |
|---|---|---|
| #1 Registration verification | First registration returned 201; duplicate registration returned the identical neutral 201 response; exactly one unverified user and one `EMAIL_VERIFY` token were created. A direct provider diagnostic subsequently proved Resend rejected the send with `API key is invalid`. | Replace the invalid `RESEND_API_KEY`, rerun, then confirm receipt/rendering and open **Verify my email**. |
| #5 Password reset | Existing and nonexistent addresses both returned the identical neutral 200 response; exactly one `PASSWORD_RESET` token was created for the review user and no user was created for the nonexistent address. A direct provider diagnostic subsequently proved Resend rejected the send with `API key is invalid`. | Replace the invalid `RESEND_API_KEY`, rerun, then confirm receipt/rendering and inspect **Reset my password**. |

No message was accepted by the provider. The isolated user and its two tokens were therefore scheduled for immediate cleanup rather than being preserved for inbox review.

### Authentication email retest after API-key replacement

Retest recipient: `pawanmenuka02+aranya-auth-mtrhgd8j@gmail.com` (delivers to the base Gmail inbox). Resend accepted the new API key, and the configured `aranyaceylon.com` sender domain reports `verified`.

| Test | Automated and provider evidence | Inbox evidence still required |
|---|---|---|
| #1 Registration verification | Registration and duplicate-registration privacy checks passed; exactly one user and one verification token exist. Resend's outbound log reports **Verify your Aranya Ceylon email** as `delivered`. | **FAIL:** user screenshot shows the emailed `GET /auth/verify?token=…` navigation returned `{"error":"CORS: origin not allowed"}`. |
| #5 Password reset | Existing/missing-account privacy checks passed; exactly one reset token exists. Resend's outbound log reports **Reset your Aranya Ceylon password** as `delivered`. | **PASS:** user screenshot confirms the link opened the correctly rendered account reset form with **Choose a new password**, password input, submission button, and reset token in the URL. |

The original screenshot fixture was preserved for the #1 verification-link retest and cleaned up during the successful fix retest described below.

### #1 verification-link CORS fix retest

- Fix source: commit `da9e36c` in worktree `claude/cors-allow-no-origin`.
- Branch integration verified after refreshing remote refs: `origin/Develop` contains the fix via PR #139 (`c846931`), and `origin/main` contains it via PR #140 (`abd8772`).
- Unit regression coverage: **5/5 passed**, including missing origin in production, allowed origin, rejected unlisted origin, and development behavior.
- Fresh registration: **201**.
- Provider record: verification email found with last event `sent`.
- Exact delivered-email link requested without `Origin`: **302**.
- Redirect: `http://localhost:3000/account?verified=1`.
- Database result: user `verified=true`; verification token `usedAt` populated.
- Cleanup: previous fixture (one user/two tokens) and fresh retest fixture (one user/one token) deleted.

Final result for #1: **PASS**.

### Non-Stripe email review run

Run ID: `20260908ns1`. The job-selection and triggering behavior for #62/#64 was already covered by the autonomous phases; this run exercised their real notification templates and provider delivery without waiting for cron. All inspected HTML contained the expected values and escaped user-controlled markup correctly.

| Tests | Recipient alias | Subject | Provider/content evidence |
|---|---|---|---|
| #32, #33, #34 | `pawanmenuka02+aranya-admin-20260908ns1@gmail.com` | **New order #SLSLSMSH — $123.45** | `delivered`; guest order had no customer email; two completion requests produced exactly one notification; HTML contained order suffix, `INTERNATIONAL`, `$123.45`, and one item. |
| #51 | `pawanmenuka02+aranya-support-20260908ns1@gmail.com` | **Contact enquiry: Review fields 20260908ns1 (AC-MTSNFM4X)** | `delivered`; HTML contained all submitted fields, escaped `<tags>`/`&`, and the correct reply-to address. |
| #62 | `pawanmenuka02+aranya-admin-20260908ns1@gmail.com` | **Low stock alert — 1 variant(s) need restocking** | `delivered`; HTML contained `Review Cinnamon <20260908ns1>`, SKU `LOW-20260908NS1`, and stock `3`. |
| #64 | `pawanmenuka02+aranya-cart-20260908ns1@gmail.com` | **You left something in your cart** | `delivered`; HTML contained `Review Pepper <20260908ns1>` ×2 and `Review Cloves & Nutmeg 20260908ns1` ×1. |

The user confirmed all four messages were present in Gmail. Combined with the provider/content evidence above, final results for #32, #33, #34, #51, #62, and #64 are **PASS**. The disposable order, order item/event, product, variant, and category were deleted after provider/content verification. The backend was stopped and the temporary runner was removed.

## Defects and blockers

Resolved inbox-review defect:

1. **Registration verification link (#1):** the global CORS callback previously rejected requests with no `Origin` header whenever the server was not in development mode. Commit `da9e36c` in worktree `claude/cors-allow-no-origin` extracted the policy into `isOriginAllowed` and permits missing-origin navigation while continuing to reject an unlisted present origin outside development. All five policy unit tests passed. A fresh delivered email's exact link was then requested without `Origin`: it returned 302 to `http://localhost:3000/account?verified=1`, marked the user verified, and marked the token used.

Resolved Phase 1 defects:

1. **Sitemap (#65):** initially returned 404. After the user supplied the Next.js metadata route, the storefront retest passed with valid XML and 35 content-bearing URLs.
2. **Robots (#66):** initially returned 404. After the user supplied the Next.js metadata route, the storefront retest passed with the expected crawler and sitemap directives.

No active Phase 1 defects or blockers remain.

Phase 2 had no product defects or blockers.

Resolved Phase 3 defects:

1. **Cart stock enforcement (#14):** initially rejected cart quantity above live stock. After the fix, quantity 3 was accepted against stock 2 without changing stock; checkout remains the authoritative enforcement point.
2. **Abandoned-cart reset (#20):** initially failed for whole-cart clear and guest merge. After the fix, all seven mutation paths cleared the flag.

No active Phase 3 defects or blockers remain.

Resolved Phase 4 defect:

1. **Order-detail authorization contract (#29):** initially returned 404 for cross-user authenticated access and exposed `userId` in the guest response. After the fix, the retest returned the required 403 and the guest response contained exactly the four permitted fields.

No active Phase 4 defects or blockers remain.

Phase 5 had no product defects or blockers.

Phase 6 had no product defects or blockers.

Phase 7 had no product defects or blockers.

Phase 8 had no product defects or blockers.

Phase 9 had no product defects or blockers.

Phase 0 had no product defects or blockers.

Non-blocking environment notes:

- The generic `pnpm exec prisma` wrapper attempted a non-interactive modules refresh and aborted. The checked-in workspace-local Prisma binary works and reported version 7.5.0.
- The Stripe CLI executable is installed, but its user-level configuration file is outside the workspace sandbox. Stripe is needed only for review check #30, not for the 57-check autonomous run.
- Git emitted a permission warning for the user's global ignore file. Repository status was still captured successfully.

## Cleanup record

Phase 0 created no database fixtures. During Phase 1, one uniquely identified published blog fixture was created so detail testing would not increment an existing post's view count; it was deleted after the checks. The Phase 1 runner was removed, the temporary scheduled-job guard was reverted, and the backend was stopped. During the #65/#66 retest, the backend and Next.js storefront were started together and then stopped; the temporary scheduled-job guard was again reverted. No temporary source changes remain.

Phase 2 created 7 uniquely identified users plus their test tokens and addresses. All addresses, tokens, related rows, and users were deleted after the checks. No real email-triggering path was used. The runner was removed, the backend was stopped, and the temporary scheduled-job guard was reverted with the backend source content restored to its original hash.

Phase 3 created one user, one category, two products, three variants, three coupons, and isolated guest/authenticated carts. All associated cart items and fixtures were deleted after the run. The runner was removed, the backend was stopped, and the temporary scheduled-job guard was reverted with the backend source content restored to its original hash.

The Phase 3 retest created a fresh isolated user, product, two variants, coupon, and guest/authenticated carts. All retest fixtures were deleted, the server was stopped, the retest runner was removed, and temporary source content was restored.

Phase 4 created two users, one category, two products, five variants, one coupon, and isolated carts and orders. All associated events, order items, orders, cart items, carts, addresses, tokens, coupon, variants, products, category, and users were deleted after the run. A non-delivering Resend key prevented real email delivery. The backend was stopped, the runner was removed, and the temporary scheduled-job guard was reverted with `backend/src/index.ts` restored to its HEAD content hash.

The Phase 4 #29 retest created two isolated users and three isolated orders. It verified all authenticated and guest detail paths, then deleted every retest order and user. The server was stopped, the retest runner was removed, and the temporary scheduled-job guard was reverted.

Phase 5 used uniquely tagged catalog and editorial fixtures. All disposable products, variants, gifts, blogs, recipes, and the first run's preserved fixture were removed. Audit entries intentionally remain because audit logs are immutable evidence. The final run preserved only the fixtures required by Phase 7:

- Run ID: `phase5-1788679707211`
- Gift: `cmtphq8o1001eoctxg1i7pawk`, slug `phase5-1788679707211-phase7-gift`
- Gift backing product: `cmtphq98j001foctxlk097ens`; LOCAL variant `cmtphq9c0001goctxm93mhcl5`
- Component product: `cmtphpssm000uoctxxg511b77`, name `phase5-1788679707211 Component Spice`
- Component variant: `cmtphpsw9000voctx92r8tcuo`, LOCAL 50g; Phase 7 stock baseline: **17**

An initial complete Phase 5 pass exceeded the command-output capture window; its preserved fixture was explicitly deleted before the fully captured rerun. Its audit entries remain by design. The backend was stopped after the captured run.

Phase 6 created two users, two products with variants, one category, and two wishlist rows. All wishlist rows, products, variants, category, and users were deleted after the run. Wholesale applications are notification-only and created no database rows; a non-production Resend key was used. The server was stopped and the Phase 6 runner was removed.

Phase 7 created one temporary product/variant/category, four controlled orders, their items/events, and one guest cart. All were deleted after the run; order audit entries remain as immutable evidence. The Phase 5 gift, backing product, component product/variant, and component category preserved specifically for Phase 7 were also deleted after the gift-stock check completed. A non-production Resend key prevented reliance on real email delivery. The server was stopped and the Phase 7 runner was removed.

Phase 8 created one product with five variants, one category, seven isolated orders, their order events/items, and verified raw webhook-delivery records. All Phase 8 fixtures and webhook records were deleted after the checks. Merchant secrets and signatures were never printed or written to the ledger. A non-production Resend key prevented reliance on real email delivery. The server was stopped and the Phase 8 runner was removed.

Phase 9 created one product with three variants, one category, and three isolated orders with items. All events, items, orders, product/variants, and category were deleted after each attempt. Two preliminary harness attempts could not capture the cron callback because of the package's separate export wrappers; neither invoked the job, and both completed fixture cleanup. The final attempt invoked the real callback successfully without changing `scheduler.ts`. Its in-process test server exited, and the Phase 9 runner was removed.

Phase 10's read-only cleanup audit found zero disposable records from the autonomous run. No deletion was necessary. The audit helper was removed after use; only the requested plan and results Markdown files remain as run artifacts, plus the intentionally immutable audit-log evidence in the development database.

The authentication inbox-review attempt created one isolated Gmail-alias user and two tokens. Resend rejected both test messages because the configured API key is invalid, so the two tokens and user were deleted immediately. The diagnostic and cleanup helpers were removed, and the local backend was stopped.

The API-key replacement retest created a fresh isolated Gmail-alias user and two tokens. Both messages are recorded as delivered by Resend. This fixture remains temporarily preserved pending the user's inbox and link confirmation.

The #1 CORS-fix retest removed that preserved fixture (one user and two tokens), created a fresh isolated verification user, and followed the exact link extracted from the provider-recorded email without an `Origin` header. After confirming the redirect, verified-user state, and consumed token, it deleted the fresh user and its one token. The fixed-source server was stopped and the temporary retest helper was removed.
