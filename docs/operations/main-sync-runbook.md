# Release runbook — syncing `Develop` into `main` (October 2026)

`main` is the branch `deploy.yml` ships from, and it is far behind `Develop`: **38 commits, 575 files and 9 database
migrations**. This runbook collects, in one place, everything that has to happen around that sync. The details were
scattered across the per-wave logs of the [final audit report](../audits/final-audit-report.md); this is the
order-of-operations version. It complements [`deployment-checklist.md`](deployment-checklist.md) (the standing
launch checklist) and does not replace it.

A trial merge of `Develop` into `main` is **conflict-free** (the three commits only `main` has are earlier
`Develop → main` merge commits), so the sync PR needs no manual conflict resolution.

## 1. What is in this release

| Area | What changes | Report |
|---|---|---|
| Security | Next.js 14 → **15.5** (two critical remote-code-execution advisories closed), React 19, `isomorphic-dompurify` 4 | #1, #57 |
| Payments | Order total and order lines come from one cart read; unpaid orders release stock after **60 minutes** (was 24 h) and a new checkout supersedes earlier unpaid ones; admin order transitions are validated; refunds and disputes alert the admin | #2, #3, #9–#15 |
| Sign-in and sessions | Hint cookie replaces the per-page refresh call; refresh reuse grace; emails are lower-cased; admin role re-read from the database each request; coupon and token rate limits | #6, #18–#24 |
| Customer behaviour | Shipping rates mirror the API (USD 4.99 / 12.99, LKR 350 / 650) and the free-shipping UI is off; archived products cannot be bought through old carts; currency checks at add-to-cart | #8, #29, #35 |
| Admin APIs (no UI yet) | Coupons, review moderation, SUPERADMIN user management and suspension, TOTP two-factor, product image delete / reorder | #41–#44 |
| Performance | Demo data out of browser bundles; retention job; duplicate index dropped; durable outbox, dashboard rollups and bounded jobs (all behind flags that default **off**) | #49–#54 |
| Deploy and CI | `deploy.yml` runs the full CI workflow before migrating; CI fails on critical advisories | #56, #58 |
| Removed | Dead code and endpoints nothing called (listed below) | §10.6 |

**Removed API endpoints** (none had a caller in this repository): `GET /blog/recent`, `GET /products/search`,
`GET /cart` (create-on-read; the storefront uses `GET /cart/bootstrap`), `GET /gifts/:slug`, and the duplicate
`GET /products/admin/all`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` (the console uses
`/admin/products/*`). If anything outside this repository calls one of them, find out before the sync.

## 2. Before you open the sync PR

1. **Take a restore point.** Confirm Neon point-in-time restore is on and note the timestamp. Two migrations change
   data (see §4), so this is the one thing you cannot redo.
2. **Check for accounts that differ only by email case**, because sign-in now lower-cases what is typed and the
   migration lower-cases stored emails but leaves case-only duplicates alone (they could not then sign in until a
   person merges them):
   ```sql
   SELECT lower(trim(email)), count(*) FROM "User" GROUP BY 1 HAVING count(*) > 1;
   ```
   Resolve any rows it returns first. Also set `SEED_ADMIN_EMAIL` in lower case.
3. **Set the environment** (§3), on the backend host and the storefront host, *before* the deploy.
4. **Stripe:** add `charge.refunded` and `charge.dispute.created` to the webhook endpoint's events. Without them
   dashboard refunds and disputes never reach the order timeline or `ADMIN_EMAIL`.
5. **Railway:** Railway deploys from `main` on its own, outside GitHub Actions, so the repository cannot make it
   wait for CI. In the service's deploy settings turn on waiting for GitHub checks to pass. For strict
   migrate-then-start ordering move `prisma migrate deploy` into Railway's pre-deploy command and drop that step
   from `deploy.yml`.
6. **Node 22** on build and runtime (`engines` is `>=22 <23`). The hosts' default may be older.
7. **Decide who watches** the first run of the new deploy gate (§5). It has only ever run on pull requests.

## 3. Environment variables

**Must be set** when `PAYMENTS_MODE=live` (the API refuses to boot otherwise):

| Variable | Notes |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | Without it the card form never loads and international checkout cannot be paid. New requirement. |
| `PAYHERE_MODE` | Must be exactly `live` or `sandbox`. It no longer defaults to sandbox. |

**Should be set:**

| Variable | Where | Notes |
|---|---|---|
| `MARKET_COOKIE_SECRET` | storefront | Same value as the backend's `COOKIE_SECRET`, server-only (never `NEXT_PUBLIC_`). Without it public reads are **uncached**, which is correct but slow. |
| `TWO_FACTOR_ENCRYPTION_KEY` | backend | `openssl rand -base64 32`; back it up. Only needed once an admin turns two-factor on (see §7), but the API warns at boot in production until it is set. |
| `FRONTEND_URL`, `API_URL` | backend | As in the standing checklist. |

**Leave unset or default** (all optional and off by default): `OUTBOX_ENABLED`, `OUTBOX_WORKER_ENABLED`,
`OUTBOX_ENCRYPTION_KEYS`, `DISTRIBUTED_JOBS_ENABLED`, `DASHBOARD_ROLLUPS_ENABLED`, `BFF_CLIENT_IP_SECRET` /
`BFF_CLIENT_IP_REQUIRED`, the `PERFORMANCE_*` and `API_PERFORMANCE_*` flags, `PENDING_ORDER_TTL_MINUTES` (default
60), `SCHEDULED_JOBS_ENABLED` (default true). **Do not copy `API_HOST=127.0.0.1` from `.env.example` onto a
PaaS**: it binds the API to loopback and makes it unreachable.

## 4. Database migrations (applied by `prisma migrate deploy`)

| Migration | What it does | Data change? |
|---|---|---|
| `20261002000000_restore_product_search_vector` | Restores the search trigger and **backfills** every product's search vector | yes (derived column) |
| `20261002010000_durable_outbox` | New `OutboxMessage` and `JobLease` tables | no |
| `20261002020000_dashboard_rollups` | New rollup tables and triggers on orders / order items | no |
| `20261002030000_bounded_job_indexes` | Six indexes for the bounded jobs | no |
| `20261002040000_job_checkpoint` | New `JobCheckpoint` table | no |
| `20261003000000_coupon_currency` | Adds nullable `Coupon.currency` | no |
| `20261003010000_normalise_user_emails` | **Lower-cases stored emails** | yes, **not reversible** |
| `20261003020000_drop_duplicate_product_slug_index` | Drops the duplicate slug index (the unique index remains) | no |
| `20261004000000_admin_users_and_2fa` | Adds `User.suspendedAt`, `twoFactorRecoveryCodes`, `twoFactorLastStep` | no |

Read the two raw-SQL ones (`restore_product_search_vector`, `dashboard_rollups`) once before running them against
production, as the standing checklist asks for hand-written migrations.

**After the migrations:** give every existing `FIXED_AMOUNT` coupon a currency (`LKR` or `USD`). A fixed coupon with
no currency is refused at checkout; percentage coupons keep working with none.
```sql
SELECT code FROM "Coupon" WHERE "discountType" = 'FIXED_AMOUNT' AND currency IS NULL;
```

## 5. The deploy itself

1. Open the pull request `Develop → main` (only when you decide to). Wait for its four checks: *Quality and unit
   tests*, *PostgreSQL integration tests*, *Playwright checkout tests* and *smoke*.
2. Merge it. `deploy.yml` now runs the **whole CI workflow first** and only then applies migrations (against the
   direct, non-pooled connection) and builds. If CI fails there, nothing is migrated.
3. Deploy the backend and the storefront **together**. The storefront no longer calls the removed endpoints, and the
   backend no longer serves them, so a long gap between the two is the one way to see errors.
4. **Watch this first run.** If `deploy.yml` fails before the migration step, fix the cause and re-run it; nothing
   has changed in production yet.

## 6. What people will notice

- **Everyone who was signed in has to sign in once more** (a new session cookie).
- **Checkout:** shipping now costs USD 4.99 / 12.99 or LKR 350 / 650 and there is no free-shipping line. An unpaid
  order holds its stock for 60 minutes, not a day.
- **Admins:** an order cannot be moved to an arbitrary status (a paid order cannot be cancelled; refunds go through
  the refund action); editing stock in the product form fails with a clear message if someone else changed it
  meanwhile; a demoted account loses the console immediately.
- **Storefront pages** of the content kind (About, FAQ, Terms…) arrive as complete HTML again, and Products, Journal,
  Recipes, Gifts, Categories, Search and Home keep their loading skeletons.

## 7. After the deploy: verify

1. `GET /health` returns `{status, timestamp, database}` and nothing about the environment.
2. `prisma migrate status` against production reports all nine migrations applied.
3. Sign in as a customer and as an admin; the admin dashboard and audit log load.
4. Browse Home, a product page, Journal and Search: images load, prices are in the right currency, no skeleton stays
   on screen.
5. Place one small real order in each market and check the payment webhook arrived (Stripe and PayHere dashboards)
   and the order moved to PAID. Refund it afterwards.
6. `GET /admin/coupons` answers 200 for an admin; the Stripe webhook shows the two new event types subscribed.
7. **Do not let any admin turn on two-factor yet.** The console's sign-in screen has no field for the code, so an
   enrolled admin is told a code is required and cannot continue. Add the field first. If it happens anyway, another
   SUPERADMIN resets it with `POST /admin/users/:id/reset-2fa`.

## 8. Rolling back

- **Code:** redeploy the previous build. It runs fine against the new schema (every new column is nullable or
  defaulted, every new table is unused by old code, and the dropped index only affected speed).
- **Do not roll the database back.** Use the restore point only to repair data damage, and note that doing so also
  reverts orders placed since.
- The email lower-casing cannot be undone. The old code looked emails up **exactly as typed**, so after a code
  rollback anyone who originally registered with capital letters has to type their email in lower case to sign in
  (the forgot-password flow has the same limit). That is a reason to roll forward with a fix rather than roll back,
  if the problem is not severe.

## 9. Known limits that remain after this release

These are recorded in the audit report and are **not** release blockers:

- **Rate limits are per storefront server, not per visitor** until the hosting topology is decided and the signed
  client-IP rollout (final audit #5) is enforced. The API warns about this at boot.
- **One API instance only** (#48): limiters, the catalog cache and the cron jobs are per process.
- **No UI yet** for the coupon, review, user-management and two-factor APIs; product reviews stay at zero until the
  review form exists.
- Order emails are thin (no line items, no address; #45) and there is no error monitoring (#46).
- Remaining dependency advisories: Express 4's `path-to-regexp` / `qs` and Next's build-time `postcss` (#57, #62).
- About 100 MB of hero and image media live in git (#52); the gift-set component stock is not restored on refund
  (#16); refunds for shipped orders have no policy yet (#17).
