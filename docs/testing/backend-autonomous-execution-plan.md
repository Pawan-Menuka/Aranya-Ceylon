# Backend Autonomous Execution Plan

## Scope

This plan covers the **57 of 66 backend checklist items** that can be executed, evaluated, and reported without the user watching or reviewing the result.

The remaining **9 email-delivery checks** are deliberately excluded from the execution phases. They are listed under [Checks requiring user review](#checks-requiring-user-review) at the end.

The checklist numbers in this document match the 66-item classification in
[`backend-manual-test-plan.md`](backend-manual-test-plan.md). Grouped CRUD routes
remain one checklist item, and `/checkout/stub/complete` remains a separate item
even though the checkout happy path also calls it.

## Execution rules

- Run the backend locally at `http://localhost:4000` with `NODE_ENV=development` and `PAYMENTS_MODE=stub` unless a phase explicitly exercises a signed webhook.
- Before making data changes, confirm the configured database is a safe development/test database. Stop rather than mutate a production database.
- Generate a unique run ID and use it in every test email, slug, SKU, coupon, and fixture name.
- Create only isolated test fixtures. Never edit or delete unrelated existing records.
- Capture HTTP status, response body, relevant headers/cookies, server logs, and before/after database values for every check.
- Use direct database queries instead of requiring Prisma Studio.
- Use separate cookie jars and access tokens for guest, customer A, customer B, admin, and concurrent-client scenarios.
- Record failures but continue with independent checks. Skip only checks whose prerequisites failed.
- Revert temporary scheduler changes and remove test fixtures at the end.
- Never expose credentials, tokens, cookie values, or connection strings in the final report.

## Evidence and completion criteria

Each checklist item is complete only when the execution report contains:

1. The checklist number and test name.
2. A `PASS`, `FAIL`, or `BLOCKED` result.
3. The expected and observed HTTP status or database transition.
4. Sanitized supporting evidence.
5. Cleanup status for data created by that check.

The overall run is complete when all 57 included items have a result, temporary changes are reverted, the backend is stopped if this run started it, and repository status contains no unintended changes.

---

## Phase 0 — Safety, readiness, and test harness

### Objective

Prepare an isolated, repeatable run without counting setup actions as product checks.

### Actions

1. Capture the initial Git status and identify pre-existing user changes.
2. Confirm Node.js, pnpm, dependencies, Prisma client, and Stripe CLI availability.
3. Inspect configuration without printing secret values.
4. Verify the database target is development/test and test connectivity.
5. Run backend typechecking and the existing automated test suite as a baseline.
6. Start the backend with `PAYMENTS_MODE=stub` and capture its logs.
7. Confirm the health endpoint or a harmless public endpoint responds on port 4000.
8. Create a unique run ID, isolated fixture registry, cookie jars, and sanitized evidence directory.
9. Prepare customer A, customer B, admin, catalog, coupon, stock, and cart prerequisites.
10. Record all created IDs so cleanup never relies on broad deletes or patterns.

### Gate

Proceed only if the server starts, the database is safe to mutate, and isolated fixtures can be created. A failing unit test is recorded as a baseline defect; it blocks only dependent manual checks.

---

## Phase 1 — Public catalog, content, and infrastructure

### Objective

Validate public read paths first, before later phases alter catalog and order state.

### Checks

- **#35 — Product listing:** verify cursor pagination and prove `featured=false` excludes featured products.
- **#36 — Featured and bestsellers:** verify both endpoints return non-empty, structurally sane data.
- **#37 — Product search:** verify normal text search and a query longer than 200 characters without a server error.
- **#43 — Categories:** verify the complete category list and response shape.
- **#44 — Blog:** verify listing, recent posts, detail lookup, cursor pagination, and graceful handling of an invalid cursor.
- **#45 — Recipes:** verify public recipe responses contain the new content-editor fields.
- **#46 — Gifts:** verify gift details include component names in `contents`.
- **#65 — Sitemap:** verify `/sitemap.xml` returns 200, valid XML, and sensible site URLs.
- **#66 — Robots:** verify `/robots.txt` returns 200 and sensible crawler directives.

### Phase gate

Record results for all 9 checks and preserve baseline catalog values needed for later visibility and stock comparisons.

---

## Phase 2 — Authentication, sessions, profiles, and authorization

### Objective

Establish authenticated actors and validate security-sensitive token and ownership behavior.

### Checks

- **#2 — Email verification token:** issue a test verification token through the backend token service, call `/auth/verify`, and confirm the user becomes verified and the token cannot be reused.
- **#3 — Resend-verification privacy:** verify the endpoint returns the same neutral response for existing and nonexistent addresses. Email delivery is not part of this check.
- **#4 — Login:** verify a valid login returns an access token and refresh cookie; verify a wrong password returns 401.
- **#6 — Password reset security:** establish multiple refresh sessions, reset the password with an internally issued test token, and prove all old sessions are revoked.
- **#7 — Refresh-token rotation:** rotate a refresh token, replay the old cookie, verify `TOKEN_REUSE_DETECTED`, and prove the token family is revoked.
- **#8 — Logout:** create two sessions, log out one, and prove only that session dies.
- **#9 — Logout all:** create multiple sessions, call `/auth/logout-all`, and prove every refresh session for that user dies.
- **#10 — Profile:** verify `GET /auth/me` and update name, phone, and newsletter preference with `PATCH /auth/me`.
- **#11 — Addresses:** verify create, list, update, and delete; prove customer A cannot edit or delete customer B's address.

### Phase gate

All 9 checks have results, and fresh customer/admin sessions are created for subsequent phases.

---

## Phase 3 — Guest and authenticated carts

### Objective

Validate cart state, money arithmetic, coupon handling, ownership, and cart recovery metadata.

### Checks

- **#12 — Empty and populated cart:** prove the first cart read is empty and later reads reflect added items.
- **#13 — Integer-cents totals:** use an odd-priced fixture such as 19.99 × 3 and verify exact subtotal and total calculations.
- **#14 — Add item:** add a variant and prove cart addition allows a quantity above live stock.
- **#15 — Update item:** change quantity and verify line and total recalculation.
- **#16 — Remove item:** delete one line without affecting unrelated lines.
- **#17 — Clear cart:** delete the entire cart and confirm it is empty.
- **#18 — Coupons:** apply and remove a valid coupon; verify expired and usage-capped coupons produce clear client errors rather than 500 responses.
- **#19 — Guest merge:** build a guest cart, log in, merge it, and confirm its lines appear in the authenticated cart.
- **#20 — Abandoned flag reset:** set `abandonedEmailSentAt`, perform representative cart mutations, and verify the field is cleared in the database.

### Phase gate

All 9 checks have results. Prepare clean guest and authenticated carts for checkout scenarios.

---

## Phase 4 — Checkout, stock reservation, coupons, and order access

### Objective

Exercise checkout validation, transactional stock behavior, payment completion, and order authorization.

### Checks

- **#21 — Guest email requirement:** verify guest checkout without an email returns 400.
- **#22 — Cross-market address:** verify a LOCAL checkout with a non-LK shipping country returns 400.
- **#23 — Stub happy path:** create a stub intent, validate provider/order/total/currency, complete it, and verify the order becomes PAID and the source cart clears.
- **#24 — Insufficient stock:** request more than available, verify a 409 with `variantId`, `requested`, and `available`, and prove stock is unchanged.
- **#25 — Concurrent final-unit race:** prepare two clients for the same last unit, fire both requests concurrently, and verify exactly one 200 and one 409 with no oversell.
- **#26 — Checkout coupon lifecycle:** verify the discounted total, prove usage does not increment at intent creation, then prove it increments exactly once after payment.
- **#27 — Stub completion endpoint:** exercise `/checkout/stub/complete` independently and verify it uses the idempotent payment-confirmation path.
- **#28 — Authenticated order history:** create orders for both customers and prove each sees only their own history.
- **#29 — Order detail authorization:** prove another user's order returns 403, a guest order returns only minimal allowed fields, and an authenticated user's order is forbidden to guests.

### Phase gate

All 9 checks have results. Retain specifically labelled PENDING and PAID orders for admin, refund, cancellation, webhook, and scheduler phases.

---

## Phase 5 — Admin catalog and content management

### Objective

Validate privileged product and editorial operations, persistence, visibility, and auditability.

### Checks

- **#38 — Reserved product slugs:** as admin, attempt to create `featured`, `bestsellers`, and `search` slugs and verify rejection.
- **#39 — Admin product listing:** verify `/products/admin/all` includes DRAFT and ARCHIVED records omitted from public listings.
- **#40 — Product creation:** create a product with a flavour array and verify all fields persist.
- **#41 — Product update and visibility:** change DRAFT to ACTIVE, edit flavours, and verify public list/detail visibility changes.
- **#42 — Upload and soft deletion:** upload renamed non-image bytes with a `.jpg` extension and verify rejection; archive a product and prove it disappears publicly while remaining in the database.
- **#54 — Audit logs:** perform controlled admin mutations and verify corresponding actor, action, entity, and timestamp entries.
- **#57 — Admin blogs:** exercise list, read, create, update, and delete with isolated records.
- **#58 — Admin recipes:** exercise full CRUD and verify the new content fields persist round-trip.
- **#59 — Admin gifts:** exercise full CRUD, verify creation of the backing DRAFT product and variants, rename the gift slug, and prove the backing product slug changes with it.
- **#60 — Admin products:** exercise the complete admin-scoped product CRUD surface.

### Phase gate

All 10 checks have results. Preserve one gift fixture and its component-stock baseline for Phase 7; remove other temporary editorial fixtures where safe.

---

## Phase 6 — Customer utility endpoints and rate limiting

### Objective

Validate wishlist isolation, wholesale throttling, and market-cookie behavior.

### Checks

- **#47 — Wishlist ownership:** add different items for both customers and prove each sees only their own wishlist.
- **#48 — Wishlist idempotency:** add the same product twice and prove only one row exists.
- **#49 — Wishlist removal:** remove a product and verify the correct user's row is deleted.
- **#50 — Wholesale rate limit:** submit six valid applications from the controlled test client and verify the sixth request in the window returns 429.
- **#52 — Market override:** verify local and international values produce a signed `x-market` cookie with an approximately 30-day lifetime; verify an invalid value returns 400.

### Phase gate

All 5 checks have results and rate-limit evidence includes request sequence, statuses, and sanitized response bodies.

---

## Phase 7 — Admin orders, analytics, refunds, and gift stock

### Objective

Validate administrative order transitions and their effects on inventory and reporting.

### Checks

- **#53 — Dashboard metrics:** calculate expected current/previous-period values directly from test data and compare them with `/admin/dashboard`.
- **#55 — Order transitions and cancellation:** record variant stock, cancel a PENDING order, verify the transition, and prove reserved stock is returned exactly once.
- **#56 — Refund:** refund an eligible PAID/PROCESSING order and prove its stock is restored without double-restocking.
- **#61 — Gift-box component stock:** purchase and complete a gift box, then prove each matched component variant decreases by the box quantity rather than only changing the synthetic gift variant.

### Phase gate

All 4 checks have results, with explicit before/after order status and stock values.

---

## Phase 8 — PayHere webhook verification

### Objective

Exercise PayHere's signed server-to-server payment states without requiring a browser or PayHere dashboard.

### Checks

- **#31 — PayHere webhook:** generate form-encoded notifications using the configured merchant secret and verify:
  - an invalid signature is rejected and creates no event;
  - paid status (`2`) confirms the order and creates the expected webhook event;
  - cancelled status (`-1`) cancels the order and releases reserved stock;
  - failed status (`-2`) leaves the order PENDING;
  - merchant, amount, currency, event ID, and idempotency protections behave correctly.

### Phase gate

The check has a result, and every order/database transition is supported by before/after evidence.

---

## Phase 9 — Stale-order scheduled job

### Objective

Validate the fully autonomous scheduled-job check without waiting for the hourly schedule.

### Checks

- **#63 — Stale-order cancellation:** create an eligible PENDING order older than 24 hours and a non-eligible control order, temporarily run the job every minute or invoke its exported testable function, and verify only the stale order is cancelled and its stock is restored.

### Safety procedure

1. Record the exact scheduler file content before any temporary change.
2. Apply only the minimal cron-expression change if direct invocation is unavailable.
3. Restart the backend, observe one controlled run, and capture evidence.
4. Restore the original expression immediately.
5. Re-run typechecking and confirm Git shows no scheduler diff.

### Phase gate

The check has a result and no temporary scheduler modification remains.

---

## Phase 10 — Cleanup and final autonomous report

### Actions

1. Remove only records registered under the unique run ID, respecting foreign-key order.
2. Restore stock values only when cleanup cannot safely delete an isolated fixture.
3. Remove cookie jars and sanitized temporary evidence that is not part of the requested report.
4. Stop background processes started by the run.
5. Run typechecking and the automated test suite again.
6. Compare final Git status with the Phase 0 snapshot.
7. Produce a 57-row result table with totals for passed, failed, and blocked checks.
8. Include defect summaries, reproduction details, and links to relevant logs or files without exposing secrets.

### Completion gate

The autonomous portion is finished when all **57 checks** have a recorded outcome and cleanup is verified.

---

## Checks requiring user review

These 9 checks are outside the autonomous execution phases because successful API execution does not independently prove that a message arrived and rendered correctly in a human-controlled inbox. The backend/API/database portions can still be run automatically; the user reviews only the final email evidence.

### Authentication emails

1. **#1 — Registration verification email**
   - Automated portion: create the account and verify duplicate handling and the email-provider request.
   - User review: confirm the verification email arrived, identifies the expected test user, and contains a usable verification link.

2. **#5 — Password-reset email**
   - Automated portion: verify neutral responses and the reset-email provider request for a real account.
   - User review: confirm the reset message arrived and contains the expected reset link.

### Stripe and admin order emails

3. **#30 — Stripe webhook emails**
   - Automated portion: send a valid signed Stripe event and verify the order, idempotency, and `WebhookEvent` row.
   - User review: confirm the expected customer-confirmation and admin-notification emails arrived.

4. **#32 — Admin new-order email**
   - Automated portion: complete an order and prove the notification code path/provider request ran.
   - User review: confirm the admin inbox received the correct order notification.

5. **#33 — Admin email idempotency**
   - Automated portion: complete the same order twice and prove only the first request claims the transition.
   - User review: confirm only one admin notification exists for that order.

6. **#34 — Guest-order admin email**
   - Automated portion: complete a guest order without a customer email and prove the admin-notification request ran.
   - User review: confirm the admin inbox received the notification despite the absent customer recipient.

### Support and scheduled-job emails

7. **#51 — Contact support notification**
   - Automated portion: submit the contact form and verify persistence/logging and the provider request.
   - User review: confirm the support inbox received correctly rendered submitted fields.

8. **#62 — Low-stock alert**
   - Automated portion: create a low-stock fixture, force the scheduled job, and verify the provider request and job log.
   - User review: confirm the admin inbox received the correct variants and stock values.

9. **#64 — Abandoned-cart recovery email**
   - Automated portion: create an eligible cart, force the job, and verify `abandonedEmailSentAt` plus the provider request.
   - User review: confirm the customer inbox received a correctly rendered recovery email with the expected cart items.

## Final totals

| Category | Count |
|---|---:|
| Fully autonomous checks in Phases 1–9 | **57** |
| Checks requiring user inbox review | **9** |
| Total checklist items | **66** |
