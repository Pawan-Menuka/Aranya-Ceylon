# Phase 7 analytics — PERF-26

Status: local backend change verified with synthetic data; hosted query plans and latency remain unverified.

The admin dashboard previously fetched every order from the 90-day chart window and every paid order item from the current 30-day window, then grouped both arrays in Node. Those reads grew with sales volume. The dashboard now requests daily order aggregates and the five top products through parameterized, read-only PostgreSQL queries. The exact SQL is in the pure `backend/src/services/analytics-query.ts` builders so it can be checked with synthetic `VALUES` tables without importing backend startup. The order result is bounded by 90 days × 3 markets × 4 currencies × 7 statuses (at most 7,560 groups); the product result is five rows. The existing response keys, 90-day series, UTC current/previous windows, AOV, status eligibility, LKR-to-USD conversion, and market split are retained. Equal-unit product ranks now use product ID as a stable tie break.

## Synthetic workload

The reproducible scripts/performance/analytics-size-diagnostic.mjs models the exact status/date selection and quantity/currency grouping, using deterministic generated objects with no database or network. Its accepted artifact is artifacts/performance/phase-seven-analytics-cost.json. These results supersede the preliminary 635-row / 69,052-byte estimate.

| Synthetic result | Previous selected rows | Aggregated rows |
| --- | ---: | ---: |
| Rows returned by the two reads | 210,000 | 1,265 (1,260 daily groups + five products) |
| Serialized payload | 20,712,203 bytes | 137,316 bytes (99.34% less) |
| Local JSON serialization median, five runs | 41.458 ms | 0.410 ms |

The fixture has 90,000 orders and 132,000 candidate items, of which 120,000 qualify. Node 24.19.0 measures transfer shape and serialization, not database execution or dashboard p95. Representative staging query plans and private dashboard p95 under concurrency remain required. The SQL correctness checks below access synthetic CTEs only.

## Correctness and limits

The SQL filters top-product revenue to PAID, PROCESSING, SHIPPED, and DELIVERED orders. It sums `quantity × unitPrice` from the order-item price snapshot, dividing LKR by the configured rate before summing. The daily query retains pending, cancelled, and refunded orders for order counts but excludes them from revenue in the response mapper. The 90-day chart and current/previous comparisons use the same inclusive start and exclusive next-day UTC boundaries as before. Currency values other than LKR continue to follow the prior USD-equivalent branch; this is existing behavior, not new FX conversion.

Seven focused controller tests pass, covering date boundaries, USD/LKR and local/international totals, refunded/cancelled counts, paid AOV, top-product ties, quantity-weighted revenue query, name fallbacks, empty data, and audit-log limits. Changed-file ESLint, backend types/build, and the full 251-test backend suite pass in the integrated Phase 7 check. Four synthetic PostgreSQL `VALUES` CTE checks pass: two analytics SQL checks and two product-name lookup checks, all within read-only transactions that shadow physical tables. These prove the SQL executes and returns the expected fixture results, but do not measure representative private-data plans, database load, or hosted dashboard p95.

The admin order list already uses cursor pagination (default 20, maximum 100); audit logs also have a cursor and maximum 200. Admin products, blogs, recipes, and gifts remain full-array frontend contracts with a 500-row backend cap. Changing those responses requires coordinated frontend paging and table behavior. Defer that work until a representative admin list nears 500 records, a list payload exceeds 1 MB, or its staging p95 exceeds 500 ms. Revisit dashboard query plans if its staging warm p95 exceeds 500 ms or grouped query time grows with order volume enough to dominate the request. A short private dashboard cache or rollup is a later option if these measurements justify its invalidation complexity.

Rollback is limited to the analytics controller and its tests; the API response schema is unchanged. No migration, data write, job, payment flow, deployment, or production configuration change is involved.
