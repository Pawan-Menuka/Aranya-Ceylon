# Phase 8: disposable PostgreSQL search repair validation

The prepared migration `20261002000000_restore_product_search_vector` restores the missing product search trigger and repairs missing/stale vectors. This document covers isolated integration validation. Applying the migration to a real staging or production database is a separate release action; this check does not authorize or perform that action.

## Run the isolated check

From the repository root, with installed backend dependencies and PostgreSQL binaries available:

```sh
node scripts/performance/phase-eight-search-migration.mjs
```

`PG_BIN` optionally selects the directory containing `initdb`, `pg_ctl`, and `psql`; otherwise the script uses `PATH`. For example, in PowerShell:

```powershell
$env:PG_BIN = 'C:\Users\Asus\scoop\apps\postgresql\current\bin'
node scripts/performance/phase-eight-search-migration.mjs
```

On Linux/CI, install PostgreSQL and run under an ordinary non-root account, then set `PG_BIN` if the distribution keeps binaries outside `PATH` (for example `/usr/lib/postgresql/16/bin`). PostgreSQL refuses `initdb` as root. Use PostgreSQL 14 or newer: `CREATE OR REPLACE TRIGGER` requires that version. No Docker daemon, Neon account, API server, browser, pnpm, or migration CLI is needed.

The script accepts **no command-line arguments or database URL**, never reads `.env`, and removes inherited `PG*`/standard database connection variables from child environments. Each run initializes a new cluster under `artifacts/performance/phase-eight-search-repair/<timestamp>-<uuid>/data`, chooses a checked free high port, listens on `127.0.0.1` only, and verifies server address, port, and the owned `data_directory` before executing SQL. The temporary cluster uses local trust authentication for this synthetic-only test and is stopped in `finally`. It does not reuse any existing server, start application jobs, seed real data, or delete directories. Windows sandbox restrictions may require permission to launch PostgreSQL locally.

Each run retains `checks.json`, executed migration/fixture SQL, and the PostgreSQL log. `latest.json` points to the most recent report. These generated artifacts are gitignored. A failing run exits nonzero; an unavailable PostgreSQL tool is a failure, not a skipped passing check. Confirm `status: passed` **and** `clusterStopped: true` before accepting a report. Old failed attempts are retained for diagnosis and are not historical phase evidence.

## What is exercised

- All **19 chronological migration SQL files** replay first in a separate database, `phase_eight_full_chain`, inside the newly owned cluster. Each unmodified file receives one explicit `BEGIN`/`COMMIT` wrapper and runs with `psql ON_ERROR_STOP`; the report records each file's name, SHA-256, and outcome. The harness stops at the first failure and retains its SQL and diagnostic log.
- After the full chain, a Product and Variant fixture supplies the actual required fields (`name`, `description`, `categoryId`, `updatedAt`, `sku`, and others). The resulting full schema accepts it, computes the canonical vector on insert, updates both name/description lexemes, and has the enabled narrow trigger plus valid/ready FTS and trigram GIN indexes. Product text/category/timestamp nullability and vector type are recorded.
- Missing and stale vectors are repaired across ACTIVE/DRAFT/ARCHIVED rows. An already-correct row keeps its tuple identity. The backfill preserves source text and `updatedAt`; defensive NULL/empty text produces the same weighted English expression.
- One enabled trigger computes vectors for insert, name edits, and description edits; old lexemes disappear and new lexemes become searchable. Unrelated field edits preserve the existing vector. Reapplying the migration does not update already-correct tuples.
- The **actual** pure builders in `backend/src/services/catalog-query.ts` execute against PostgreSQL: search by name and description, all catalog facet filters together, count agreement, both markets, ACTIVE-only visibility, six sorts, and stable two-item pagination with tied keys.
- Prices exercise PostgreSQL numeric ordering, LKR rounding, 100g display preference, cheapest fallback without 100g, currency selection, and tied prices. Legacy product builders combine FTS/category/price/currency filters and one-item pagination over rank ties.
- An explicitly equivalent copy of the inline autocomplete SQL checks description-only recovery plus market/status visibility. Importing `product.service.ts` would import the application entry point and start side effects, so this is not represented as an actual service invocation.
- The existing GIN index stays valid and ready. The migration intentionally does not create it; the earlier performance-index migration is a prerequisite.

The later drift/query schema is deliberately minimal and runs in the separate `postgres` database: only tables/columns/types needed by the migration and builders exist there. Product text is nullable in that fixture to test `COALESCE` defensively; the full migration schema requires non-null text. The full chain starts from an **empty** database, so it does not establish that historical data conversions or newly required columns work against arbitrary existing data. For example, the dual-market migration adds required Order currency/market columns without defaults; an already-populated pre-migration Order table needs separate staging/data assessment.

The complete raw SQL chain is locally verified. This is **not** Prisma `migrate deploy` verification: Prisma's `_prisma_migrations` bookkeeping, checksum reconciliation and advisory locking are not invoked. Schema-drift reconciliation, seed execution, Prisma/Neon adapter integration, payload hydration, representative dataset/plans, lock duration, and API/cache/browser integration remain outside this check.

Builder SQL is imported from the real TypeScript module through the existing `tsx` dependency. The harness substitutes safely escaped **synthetic scalar literals** into the generated placeholders and executes with `psql`; it does not change builder logic. This validates PostgreSQL query semantics, not the production adapter's parameter binding. NULL/stale/valid vector comparison uses the exact original A-weighted name plus B-weighted description English expression. The narrower `UPDATE OF name, description` trigger preserves that expression.

## Release prerequisites and evidence

The original `20260324140629_add_fts_and_constraints` migration introduced the same vector function and a trigger on every update. `20260324140941_first_migration` dropped the GIN index; `20260704120000_add_perf_indexes` restores that index. The full local chain successfully reproduces that index drop/recreation and ends with the trigger present. The historical files do not explain the separately observed missing live trigger; its drift origin remains unverified. The prepared repair addresses that missing trigger/vector drift without changing the index or public search query expression.

Before a real release, select an explicit staging target and obtain the authorized deployment context. Verify migration history (including unfinished migrations), Product schema, existing function/trigger definition, PostgreSQL version, and valid/ready FTS index. Establish a snapshot/backup and rollback owner. Test the complete migration chain and the application adapter in that staging environment; local fixture success cannot establish those prerequisites.

Creating/replacing a trigger takes a table-level lock; the UPDATE takes row locks and updates the GIN index for every changed vector. Estimate affected rows, current traffic/transactions, table/index size, and available resources on staging. Use an agreed maintenance/release window with bounded `lock_timeout` and `statement_timeout`; abort and investigate rather than letting a blocked backfill wait indefinitely. The harness runs the prepared migration inside an explicit transaction. Confirm the actual deployment runner's transaction behavior; do not assume fixture atomicity establishes production atomicity. A large dataset may need a separately reviewed batched rollout instead of this single UPDATE.

After an authorized deployment, read-only verification should show: no failed/unfinished migration; one enabled `product_search_vector_update` with INSERT/name/description events; zero vectors distinct from the canonical expression; valid/ready `Product_searchVector_idx`; and expected ACTIVE-market search counts with matching filtered pages. Check description-only searches because name autocomplete can mask vector failures. Perform trigger writes only against designated staging test products when explicitly authorized.

The SQL backfill does not update Prisma's `updatedAt`, and database writes do not inherently clear application response caches. Invalidate the relevant catalog/product/search responses through the existing authorized release mechanism, or wait for their documented TTL; verify the actual API response after invalidation. Reverting a trigger does not restore pre-backfill vectors. Record the previous function/trigger definitions and a recoverable snapshot before deployment; approve a specific rollback migration and cache invalidation plan instead of deleting the new trigger blindly. No real database rollback or migration has been performed here, and no hosting provider is selected by this check.

## Recorded local result

Final-source run: **59/59 passed** on Windows with **PostgreSQL 18.4**, completed **2026-10-02 01:50 UTC**. The owned server listened only on loopback and the report records `clusterStopped: true`.

Evidence: `artifacts/performance/phase-eight-search-repair/2026-10-02T01-49-45-637Z-a8ae6407-7577-476b-8f8e-c856f04c0bf2/checks.json`. The report includes SHA-256 hashes of every migration file, the harness, and the query builder. Repair migration hash: `c0ac82ee159536e37ed490880b581dabe06873074f19974673f31d69e81e71fd`.

| Check group | Result |
| --- | --- |
| Full chronological migration SQL chain | 19 passed |
| Full-schema product/variant fixture, text maintenance, trigger and indexes | 2 passed |
| Owned loopback cluster, reproduced drift, backfill, enabled trigger, no-op reapply | 5 passed |
| Actual catalog builders: 2 markets × 2 search terms × 6 sorts | 24 passed |
| Actual legacy builder and autocomplete-equivalent SQL, both markets | 4 passed |
| Insert, name edit, description edit, unrelated edit, existing GIN index | 5 passed |

The drift fixture returned one filtered LOCAL description-search match before repair and four afterward. All fifteen drift fixture products acquired the canonical vectors; stale/missing values changed while the already-correct row was not rewritten. Numeric price and tied-key pages agreed with independent expected IDs/prices. This establishes the raw chronological SQL chain and prepared repair's behavior locally; Prisma migration-runner behavior, staging rollout performance/data compatibility, adapter integration, and actual response-cache invalidation remain unverified.

An initial sandbox launch failed before server startup because Windows could not create PostgreSQL's restricted token. A subsequent development attempt exposed an inherited pipe-handle wait; its temporary server was explicitly stopped, and the harness was corrected to await `pg_ctl` process exit on Windows. Both failed attempts were retained. The final run above is the acceptance evidence; no current application database was contacted by any attempt.
