# Phase 6 — Compact catalog, SQL and hosting evidence

Date: 2026-10-02 (Asia/Colombo). **Local implementation verified; search repair, representative staging tests, hosting and release budgets remain pending.** Covers PERF-19, PERF-21, PERF-22 and PERF-27. Phase 7 and deployment have not started.

The catalog now receives eight cards initially and requests the next eight on demand. Counts, facets, filters, search and ordering apply to the whole dataset. Category pages receive counts and bounded card samples; homepage featured/bestseller reads also use compact cards. Detail, admin and legacy full-product contracts remain available through the existing routes. Successful-page design, photography, crops, hero behavior, market separation, private commerce and cache invalidation are preserved.

## Implementation and correctness

- Opt-in `view=cards` and `view=summary` contracts avoid descriptions, review bodies, complete galleries and packaging prose on card paths. Hydration is bounded to visible cards and spotlight samples, with batched ratings and primary-image selection.
- Six catalog orders use SQL with deterministic ties and query/market-bound seek cursors. Price ordering uses the displayed market/currency, preferring 100g and otherwise the smallest matching price. Rating ties include review count; all sorts have an ID tie-breaker. Legacy FTS, price, bestseller and newest queries filter before pagination and no longer sort only the first 500 hydrated products.
- URL state, same-route navigation and market changes reset the pager. Late responses are rejected, duplicate clicks share one request, repeated cursors fail safely, and failed next pages retain the visible cards for explicit retry.
- A 625-product independent fixture exercises every sort past 500 rows and rare combined facets appearing only beyond row 600. The real SQL separately traverses the current small public database; the large fixture is not a SQL load test.
- Pending route placeholders reserve the full viewport. A diagnostic identifies the footer entering the viewport below the old 70vh placeholder and disappearing when content arrives. The completed-page layout is unchanged.

The no-JavaScript catalog check verifies filtered streamed server markup. Next's inline completion scripts are needed to reveal streamed content; this does not prove a visible or interactive no-JavaScript catalog. Existing no-JavaScript home/product photography checks pass separately.

## Payload and JavaScript tradeoff

These are serialized JSON and gzip estimates from the unchanged 14-product public fixture, including the initial eight cards, featured cards, facets and total. They are not deployed API latency measurements.

| Market | Previous full catalog JSON / gzip | Initial card response JSON / gzip | Gzip reduction |
| --- | ---: | ---: | ---: |
| USD | 25,059 / 4,491 bytes | 9,595 / 1,858 bytes | 58.6% |
| LKR | 24,118 / 4,447 bytes | 9,370 / 1,839 bytes | 58.6% |

Category summaries are 9,359 / 2,041 bytes for USD and 9,138 / 2,007 bytes for LKR. The benefit grows with catalog size because list responses no longer include every product. Card variants still retain the fields required by quick-add behavior.

Catalog route gzip JavaScript increases from 134,746 to 136,812 bytes (1.5%) for pagination and its adapters. Actual cold-home JavaScript transfer is 160,351 bytes versus 160,321 in Phase 5. Home/admin/checkout manifest estimates increase by 30 bytes. These bundle measurements are distinct from API compression.

## Final verification

- 93/93 frontend regressions across 12 files; 239/239 source backend tests across 21 files, including 14 new SQL/service/controller tests.
- 58/58 controlled browser checks: six recovery, twelve hero, nine media, eight caching/streaming, twelve commerce and eleven catalog/loading cases.
- 160/160 principal browser steps, five cold/warm visits per desktop/mobile profile, with zero flow, navigation-timeout or page-error failures.
- Frontend isolated production build, type checking and lint pass with the two existing AdminProducts warnings. Backend types and production build pass; the eight changed/new backend files lint with zero errors/warnings. The existing backend-wide unused `_userId` lint failure remains Phase 8 cleanup.
- Read-only database checks capture 38 actual query plans, eighteen catalog sort/facet checks and eight legacy traversals. No migration, seed, customer mutation, backend startup job or payment was run.

CI now prepares the Prisma client and shared contracts before catalog tests, runs all six browser harnesses sequentially and uploads their evidence. Remote CI has not been executed. Stale compiled backend tests are excluded by running the source suite; generated build output is preserved.

## Timing comparison and limits

Both principal runs use the same public catalog/media fixture and throttled profiles. These are local production-frontend measurements with an in-memory API and warm server cache, not VPS/API/Neon latency or real devices. Every cold Shop transition completes within the unchanged 15-second observation window, but the final Phase 6 medians are **slower than Phase 5**. Smaller responses do not establish a universal navigation speedup.

| Metric, median | Phase 5 | Final Phase 6 |
| --- | ---: | ---: |
| Cold Shop, desktop | 374.5 ms | 470.2 ms |
| Cold Shop, mobile | 533.7 ms | 841.9 ms |
| Warm catalog, desktop | 74.7 ms | 220.2 ms |
| Warm product, desktop | 62.1 ms | 205.6 ms |
| Warm checkout, desktop | 80.6 ms | 141.8 ms |
| Warm catalog, mobile | 281.8 ms | 516.2 ms |
| Warm product, mobile | 295.7 ms | 597.8 ms |
| Warm checkout, mobile | 198.9 ms | 321.0 ms |
| Cold home LCP, desktop | 320 ms | 1,196 ms |
| Cold home LCP, mobile | 672 ms | 664 ms |
| Cold home CLS, desktop | 0.000733 | 0.000622 |
| Cold home CLS, mobile | 0 | 0 |

Final cold Shop ranges are 452.1–484.3 ms desktop and 744–1,938.2 ms mobile. Cold mobile product ranges up to 2,579.6 ms. Cold mobile Shop loading feedback is 282.9 ms across four observed samples, and product feedback is 431.3 ms across two; many warm navigation samples have no observed placeholder. Null samples do not demonstrate the 200 ms feedback budget. A desktop cold-home LCP sample reaches 3,740 ms. PERF-05/PERF-30 budgets remain open; repeat deployed measurements and investigate the slower observations before accepting release performance.

A separate reversed-order loading-height intervention runs two desktop contexts per arm. Both 70vh arms reproduce CLS around 0.30, while both 100vh arms remain below 0.001. Cold Shop is 499.5–502.4 ms at 70vh and 469.3–472.5 ms at 100vh; warm product/checkout samples overlap. This limited experiment supports the geometry fix and shows no consistent navigation penalty from it. It does not explain the broader Phase 5-to-6 slowdown or replace principal measurements.

The large fixture originally contaminated a later comparison through Next's persistent Data Cache. That interrupted run is excluded and archived. The large harness restores its fixture and invalidates tags on exit; the principal runner now independently resets public tags before its existing warmup. The accepted final run uses the original fourteen products and normal browser networking/cache behavior. Pre-footer-fix measurements and geometry diagnostics remain separately labeled, rather than being combined with acceptance.

## Database repair and hosting still required

See [database and hosting evidence](./PHASE_6_DATABASE.md). All eighteen installed migrations and eight expected performance indexes are present/valid. The latest tiny-data plans execute in at most 2.073 ms; an earlier combined-query outlier was 71 ms. Additional indexes and maintained aggregate counters are deferred until representative plans justify their write and invalidation cost.

The FTS update trigger is absent and all fourteen active search vectors are NULL. The prepared [repair migration](../../backend/prisma/migrations/20261002000000_restore_product_search_vector/migration.sql) is **unapplied and not staging-validated**. Before release, test it on disposable/staging data, review backfill locking, verify inserts/edits/search/filter/cursors, apply through the approved release procedure and invalidate product cache tags. No historical applied migration was edited.

The user expects a VPS but has not selected a provider. Sri Lanka is in South Asia; the configured Neon database is in Singapore (`ap-southeast-1`). Singapore is an initial placement candidate to keep Next/API near that database, following [Neon's regional latency guidance](https://neon.com/demos/regional-latency). This is a proposal, not a measured fastest region for Sri Lankan visitors. Verify Sri Lanka-to-site, Next-to-API and API-to-database latency, supervised process restart behavior, CPU/memory/concurrency and the real plan's connection allowance after provider selection. No pool, capacity, replica or sleep settings were changed.

Deploy the opt-in card/summary backend before this frontend, retaining the earlier cache-secret/invalidation and read-only cart rollout requirements. Existing production no-Origin CORS rejection (PERF-32) blocks real Next-to-API SSR and must be resolved in Phase 8. Real session rotation, gateways, representative SQL/load, hosted CDN/media behavior, restart/scheduler ownership and remote CI remain release acceptance.

## Frozen evidence

Final snapshot: [Phase 6 artifacts](../../artifacts/performance/phase-6-2026-10-02/README.md). Previous phase snapshots remain unchanged.

| Input | SHA-256 |
| --- | --- |
| Final frontend | `d47ca6af8607e0090d2026f9cddc7d0ea4508a49b6aecc9c1d05360b5574b6e0` |
| Phase 5 frontend | `b499c5bad3be979b79b7399ae94aa82372af433653c112e86562fd592273d86a` |
| Unchanged principal catalog fixture | `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138` |
| Unchanged media fixture | `1619cd5028994339ff9657a8e2744c8c960c0f609ec244bce8e42da0504f8d66` |
| Fixture API | `66c506e0904b4e1e9a29a026f4239d3d7e3cc303d2b03f936ff6e3c4e95d8bd5` |
| Independent catalog oracle | `36390aafaad3659b058aa2538f1a1ad660e8a3b5e6cfc73d01758e26e031af8d` |

The final fixture/API/oracle and application sources are frozen with source manifests. The optional diagnostic-only browser hook was added after the principal run; its default path is unchanged. Artifacts contain sanitized public evidence, not deployment credentials or customer/account data. No commit, push, deployment, production database change or Phase 7 work was performed.
