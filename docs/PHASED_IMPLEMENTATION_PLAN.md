# Repository Quality Improvements — Phased Implementation Plan

This plan addresses the following repository review findings:

1. Backend tests mock Prisma and do not verify concurrency against PostgreSQL.
2. The storefront has no browser-level checkout tests.
3. The monorepo mixes pnpm and npm lockfiles and CI workflows.
4. The README refers to the wrong production Prisma adapter.
5. Audit, testing, and planning documents clutter the repository root.

The work is divided into small, independently verifiable phases so the repository remains usable after every phase. Each phase should be completed and verified before moving to the next one.

## Phase overview

| Phase | Outcome | Depends on |
|---|---|---|
| 0 | Protect existing work and record the baseline | — |
| 1 | Use one package manager and lockfile | Phase 0 |
| 2 | Separate Prisma from server startup | Phase 1 |
| 3 | Add real PostgreSQL concurrency tests | Phase 2 |
| 4 | Add Playwright checkout coverage | Phase 1 |
| 5 | Reorganize CI around the new test suites | Phases 3 and 4 |
| 6 | Correct documentation and clean the repository root | Phase 5 |
| 7 | Run full final verification | All phases |

Each phase should be treated as its own commit or review checkpoint.

## Phase 0 — Baseline and worktree safety

### Goal

Ensure the implementation does not overwrite existing work and distinguish existing failures from regressions introduced by this plan.

### Current considerations

The working tree already contains modifications, including changes to:

- `backend/src/index.ts`
- `backend/src/services/audit.service.ts`
- `backend/src/services/email.service.ts`
- `aranya-next/src/components/admin/AdminDashboard.tsx`

There are also untracked planning, testing, and image-generation documents. These documents must be preserved and relocated rather than deleted.

### Tasks

1. Capture `git status` and focused diffs for files later phases will touch.
2. Run the current typecheck, lint, unit tests, and builds.
3. Record any existing failures separately.
4. Confirm that untracked documentation will be retained.
5. Avoid formatting or modifying unrelated files.

### Verification

```powershell
pnpm install --frozen-lockfile
pnpm --filter @aranya/shared build
pnpm typecheck
pnpm lint
pnpm test
pnpm -r build
```

### Exit criterion

There is a known baseline and a clear list of any pre-existing failures.

No commit is required for this phase.

## Phase 1 — Standardize the monorepo on pnpm

### Goal

Use one package manager and one dependency graph throughout the monorepo.

### Tasks

1. Add a pinned `packageManager` field to the root `package.json`.
2. Remove `aranya-next/package-lock.json`.
3. Confirm that `aranya-next` is represented correctly in `pnpm-lock.yaml`.
4. Replace the npm commands in the frontend CI job with pnpm workspace commands.
5. Remove the duplicate frontend lockfile configuration from `.github/dependabot.yml`.
6. Update `aranya-next/README.md` to use pnpm commands only.
7. Add root convenience scripts where useful:
   - `build`
   - `test:unit`
   - later, `test:integration`
   - later, `test:e2e`

### Likely files

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `aranya-next/package.json`
- `aranya-next/package-lock.json`
- `.github/workflows/ci.yml`
- `.github/dependabot.yml`
- `aranya-next/README.md`

### Verification

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm -r build
```

### Exit criteria

- `pnpm-lock.yaml` is the only package-manager lockfile.
- CI contains no `npm ci` or `npm run` commands.
- Dependabot has one dependency configuration for the workspace.
- A fresh frozen pnpm installation succeeds.

### Suggested commit

```text
chore: standardize workspace on pnpm
```

## Phase 2 — Decouple Prisma from server startup

### Goal

Make application code importable by integration tests without starting Express, cron jobs, or a network listener.

At present, backend application modules import `prisma` from `src/index.ts`, and existing unit tests mock that module. This coupling is the main structural prerequisite for real integration testing.

### Tasks

1. Add a dedicated Prisma module, such as `backend/src/lib/prisma.ts`.
2. Move Prisma adapter and client construction out of `backend/src/index.ts`.
3. Export the shared `prisma` instance from the new module.
4. Keep Neon as the default production adapter.
5. Add explicit support for standard PostgreSQL in local and CI integration tests using `@prisma/adapter-pg`.
6. Introduce an explicit adapter setting such as:

   ```text
   DATABASE_ADAPTER=neon | pg
   ```

   The normal default should remain `neon`.

7. Update backend source imports to use the dedicated Prisma module.
8. Update existing unit-test mocks to mock the new Prisma module.
9. Leave server startup and cron execution only in `backend/src/index.ts`.
10. Preserve existing uncommitted changes in every touched file.

No schema or database migration should be required during this phase.

### Verification

```powershell
pnpm --filter @aranya/shared build
pnpm --filter @aranya/backend exec prisma generate
pnpm --filter @aranya/backend typecheck
pnpm --filter @aranya/backend lint
pnpm --filter @aranya/backend test:unit
pnpm --filter @aranya/backend build
```

### Exit criteria

- Importing a controller no longer starts the HTTP server.
- Production continues to use `PrismaNeon`.
- Existing unit tests remain fast and mocked.
- All current backend tests pass without behavior changes.

### Suggested commit

```text
refactor: separate prisma client from server bootstrap
```

## Phase 3 — Add real PostgreSQL integration tests

### Goal

Prove database-dependent checkout and payment concurrency behavior against a real PostgreSQL database.

### Phase 3A — Test infrastructure

Add or organize files similar to:

```text
backend/vitest.integration.config.ts
backend/src/test/integration/
backend/src/**/*.integration.test.ts
compose.integration.yml
```

### Tasks

1. Add `@prisma/adapter-pg` and any required PostgreSQL driver dependency.
2. Add separate backend scripts:
   - `test:unit`
   - `test:integration`
3. Ensure unit tests exclude `*.integration.test.ts`.
4. Ensure integration tests include only `*.integration.test.ts`.
5. Provide a local PostgreSQL Compose service.
6. Apply the real migrations before running integration tests.
7. Add helpers for:
   - constructing a real Prisma client;
   - seeding minimum catalog, cart, and order data;
   - cleaning only integration-test data;
   - disconnecting after the suite.
8. Use unique identifiers so retries or parallel jobs cannot collide.

### Phase 3B — Checkout concurrency test

Create 20 independent guest carts that all request one variant whose stock is `1`.

Start all checkout attempts together using `Promise.allSettled`.

Assert that:

- exactly one checkout succeeds;
- exactly nineteen checkouts receive an insufficient-stock response;
- final stock is `0`;
- exactly one order is created for the variant;
- stock never becomes negative;
- failed checkouts leave no partial orders or reservations.

Add a multi-line transaction test as well:

- line one has sufficient stock;
- line two does not have sufficient stock;
- the full transaction rolls back;
- line one's stock remains unchanged;
- no order is created.

### Phase 3C — Webhook idempotency test

Seed a pending order with the dependent records needed to observe business side effects.

Call `confirmOrderPaid` concurrently 20 times.

Assert that:

- the order becomes `PAID`;
- one payment-confirmed `OrderEvent` exists;
- coupon usage increments once;
- cart clearing occurs once effectively;
- gift-component stock, if included, decrements once;
- the confirmation email function is called once;
- all concurrent calls resolve safely.

The email provider may be mocked. Prisma and PostgreSQL must not be mocked.

It is acceptable for multiple raw `WebhookEvent` audit rows to exist because they represent separate gateway deliveries. The business transition and its side effects must happen only once.

### Verification

```powershell
docker compose -f compose.integration.yml up -d
pnpm --filter @aranya/backend exec prisma migrate deploy
pnpm --filter @aranya/backend test:integration
```

### Exit criteria

- The 20-way checkout test is deterministic.
- The 20-way payment-confirmation test is deterministic.
- Tests fail if guarded `updateMany` logic is replaced with a read-then-update sequence.
- Unit and integration suites can run independently.

### Suggested commit

```text
test: prove checkout and webhook concurrency on postgres
```

## Phase 4 — Add Playwright checkout coverage

### Goal

Cover the highest-value storefront flow through a real browser.

The Playwright suite should test the frontend independently with deterministic BFF request interception. The real database guarantees remain the responsibility of Phase 3.

### Proposed files

```text
aranya-next/playwright.config.ts
aranya-next/e2e/checkout.spec.ts
aranya-next/e2e/fixtures/
```

### Tasks

1. Add `@playwright/test` as a frontend development dependency.
2. Add `test:e2e` and optional `test:e2e:ui` scripts.
3. Configure Playwright to start the Next.js application automatically.
4. Use Chromium initially to keep CI execution time reasonable.
5. Add stable accessible labels or test IDs only where semantic locators are insufficient.
6. Seed the browser cart through `localStorage`.
7. Intercept these BFF routes:
   - `/api/cart`
   - `/api/cart/totals`
   - `/api/checkout/create-intent`
   - `/api/checkout/stub/complete`
8. Retain traces and screenshots on failure.

### Initial scenarios

#### 1. Empty cart

- Visit `/checkout`.
- Verify the empty-basket state.
- Verify the catalogue link is available.

#### 2. Client validation

- Seed a cart.
- Submit without the required guest or address fields.
- Verify validation appears.
- Verify that no checkout request was sent.

#### 3. Successful stub checkout

- Seed a cart.
- Fill guest contact and shipping information.
- Submit the checkout form.
- Assert the outgoing request payload.
- Complete the stub payment.
- Verify the confirmation and order ID.
- Verify the cart was cleared.

#### 4. Insufficient stock

- Return HTTP 409 from the checkout endpoint.
- Verify the backend message is displayed.
- Verify the cart remains populated.
- Verify the submit button becomes usable again.

### Verification

```powershell
pnpm --filter aranya-ceylon-storefront exec playwright install chromium
pnpm --filter aranya-ceylon-storefront test:e2e
```

### Exit criteria

- Tests use browser-visible behavior rather than component internals.
- Checkout request payloads are asserted.
- Success and failure paths are covered.
- Tests do not call Stripe or PayHere.

### Suggested commit

```text
test: add playwright coverage for checkout
```

## Phase 5 — Reorganize CI

### Goal

Make each quality boundary visible and independently diagnosable.

### Recommended jobs

#### `quality`

- frozen pnpm install;
- build the shared package;
- generate the Prisma client;
- typecheck;
- lint;
- run unit tests;
- run production builds;
- validate the Prisma schema;
- run the security audit.

#### `backend-integration`

- start a PostgreSQL service container;
- perform a frozen pnpm install;
- build the shared package;
- generate the Prisma client;
- apply database migrations;
- run integration tests.

Recommended PostgreSQL configuration:

- PostgreSQL 16;
- explicit database, username, and password;
- a `pg_isready` health check;
- a CI-only `DATABASE_URL`;
- `DATABASE_ADAPTER=pg`;
- stub payment mode;
- safe test-only application secrets.

#### `frontend-e2e`

- perform a frozen pnpm install;
- install Chromium and its system dependencies;
- run the Playwright suite;
- upload the Playwright report, trace, and screenshots after failure.

### Tasks

1. Remove the redundant npm-based frontend job.
2. Use pnpm caching in every Node job.
3. Add job-level timeouts.
4. Use the same Node and pnpm versions in every job.
5. Give integration and browser checks clear names in pull requests.
6. Keep deployment independent of Playwright artifacts.

### Exit criteria

- Unit-test, PostgreSQL, and browser failures appear as separate checks.
- No CI job uses npm.
- PostgreSQL migrations run before integration tests.
- Playwright failure artifacts are available from GitHub Actions.

### Suggested commit

```text
ci: add postgres integration and playwright jobs
```

## Phase 6 — Correct documentation and clean the root

### Goal

Present a clean, recruiter-friendly repository without losing historical work.

### Recommended structure

```text
docs/
  README.md
  audits/
    audit-report.md
    audit-report-pass-2.md
    storefront-audit-report.md
    remaining-surfaces-audit-report.md
  testing/
    backend-manual-test-plan.md
    backend-autonomous-execution-plan.md
    backend-test-execution-results.md
  operations/
    deployment-checklist.md
    known-issues.md
  design/
    image-generation-prompts.md

.claude/
  CLAUDE.md
```

### Tasks

1. Move documents with history-preserving renames where possible.
2. Move untracked documents as well rather than dropping them.
3. Move the root `CLAUDE.md` to `.claude/CLAUDE.md`.
4. Add `docs/README.md` with short descriptions and links.
5. Keep only public entry-point documents at the root:
   - `README.md`
   - `SECURITY.md`
6. Update every cross-reference after moving files.
7. Correct the root README:
   - production uses `@prisma/adapter-neon`;
   - local and CI integration tests use `@prisma/adapter-pg`;
   - pnpm is the only supported package manager;
   - unit, integration, and E2E commands are documented.
8. Update the frontend README to remove npm and yarn alternatives and stale Node requirements.
9. Add a concise testing section that explains the three layers:
   - mocked unit tests;
   - real-PostgreSQL integration tests;
   - browser checkout tests.

### Verification

```powershell
rg -n "adapter-pg|adapter-neon|npm ci|npm run|package-lock|KNOWN_ISSUES.md|AUDIT_REPORT" README.md aranya-next/README.md docs .github
```

### Exit criteria

- The repository root is clean and easy to scan.
- All moved-document links resolve.
- The README accurately describes the database adapters and test architecture.
- No documentation instructs contributors to use npm.

### Suggested commit

```text
docs: organize project documentation and refresh setup
```

## Phase 7 — Final verification and handoff

### Goal

Prove the combined changes work from a clean installation.

### Full verification

Run the same commands that CI will run:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @aranya/shared build
pnpm --filter @aranya/backend exec prisma generate
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm --filter @aranya/backend exec prisma validate
pnpm -r build
```

Run final repository checks:

```powershell
rg --files -g "package-lock.json"
git status --short
git diff --check
```

### Final acceptance criteria

- The repository uses one package manager and one lockfile.
- Existing unit tests still pass.
- Real PostgreSQL proves that one of 20 simultaneous checkouts wins the last unit.
- Real PostgreSQL proves that concurrent webhook side effects execute once.
- Playwright covers checkout validation, success, and failure.
- CI runs the three testing layers independently.
- The README identifies the correct Neon adapter.
- Repository documentation is organized under `docs/`.
- Existing user changes are preserved.

## Implementation approach

Complete and verify one phase at a time. After each phase:

1. review the focused diff;
2. report the commands executed and their results;
3. resolve regressions before continuing;
4. keep unrelated working-tree changes untouched;
5. create a logical commit only when requested.
