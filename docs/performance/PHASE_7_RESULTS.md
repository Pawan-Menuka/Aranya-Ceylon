# Phase 7 — measured refinements

Date: 2026-10-02, Asia/Colombo. Audit coverage: PERF-17, PERF-18, PERF-20, PERF-26 and PERF-28.

Status: done locally, with measurement-led deferrals. The isolated production build, 100 frontend tests, 251 backend tests, all 67 controlled browser checks, four synthetic PostgreSQL checks and all 160 principal browser steps pass. This phase makes local implementation and measurement decisions; release budgets and representative staging remain open.

## Changes and demonstrated benefits

Admin CSS now loads through the admin layout. Unused Cormorant 700 and Spectral 300 declarations are removed; brand families, used weights, italic faces, styles and media remain intact. A token audit confirms all 268 uses of moved variables remain within admin components. In separate desktop/mobile cold waterfalls, initial CSS transfer falls from 8,832 bytes/two requests to 5,488 bytes/one request. Font transfer remains 150,142 bytes/six requests: reducing configured weight/style combinations from 19 to 15 did not reduce observed font bytes. [Font evidence](./PHASE_7_FONTS.md).

Article paragraphs and product stories are sanitized on the server using the existing allowlist and URI policy. Client components receive clean strings instead of importing DOMPurify. An exact-content LRU cache holds at most 128 entries and 524,288 combined input/output UTF-16 units; edited content gets a new result, and oversized entries are not cached. Script/event-handler/unsafe-URL fixtures are removed while strong, emphasis and safe links survive. Gzip bundle estimates fall 11,097 bytes for articles and 11,109 bytes for products. A warm repeated-content microbenchmark falls from 248.8 ms to 0.1 ms for 1,000 operations; this measures reuse, not first-load or deployed rendering latency.

Search builds a complete compact product index and complete journal metadata across cursors, removing the previous 100-product/50-post truncation. Remote full-result search follows all pages within one 20-second deadline and is cancelled/scoped on query or market changes. Existing partial-match local fallback remains available after a remote failure. For the unchanged fourteen-product fixture, compressed index estimates fall 44.7% internationally and 45.0% locally. Recipe detail now requests only matched ingredient cards through an opt-in lookup accepting at most forty names, instead of fetching the full product catalog. Its five-ingredient fixture is about 75% smaller by gzip estimate.

Admin analytics now asks PostgreSQL for daily groups and five top products, preserving response keys, UTC windows, eligible revenue statuses, historical quantity-weighted prices and LKR normalization. The daily result is bounded by 7,560 groups. A reproducible synthetic 90,000-order workload reduces selected rows from 210,000 to 1,265 and serialized bytes from 20,712,203 to 137,316 (99.34%). Five-run serialization medians fall from 41.458 to 0.410 ms. These are generated-object transfer/serialization estimates; representative SQL plans and dashboard p95 remain unmeasured. [Analytics evidence](./PHASE_7_ANALYTICS.md).

Scheduled jobs now support explicit runner enablement, register once per process and skip overlapping ticks in the same process. Failed abandoned-cart emails remain eligible for retry and are marked sent only after success. This prevents known failures from being permanently suppressed; provider acceptance followed by a lost response or process crash can still cause duplicates. [Jobs evidence](./PHASE_7_JOBS.md).

## Principal comparison

Same public catalog/media fixture, desktop/mobile network and CPU profiles, five cold/warm runs per flow and isolated ports 3101/4101. The API is in memory; these measurements do not include Neon, VPS routing, provider latency or real checkout processing.

| Metric | Phase 6 | Phase 7 |
| --- | ---: | ---: |
| Cold Shop, desktop median | 470.2 ms | 371.5 ms |
| Cold Shop, mobile median | 841.9 ms | 628.0 ms |
| Warm catalog, desktop median | 220.2 ms | 74.2 ms |
| Warm product, desktop median | 205.6 ms | 66.3 ms |
| Warm checkout, desktop median | 141.8 ms | 79.4 ms |
| Warm catalog, mobile median | 516.2 ms | 494.5 ms |
| Warm product, mobile median | 597.8 ms | 540.9 ms |
| Warm checkout, mobile median | 321.0 ms | 257.8 ms |
| Cold home LCP, desktop/mobile medians | 1,196 / 664 ms | 392 / 656 ms |
| Cold home CLS, desktop/mobile medians | 0.000622 / 0 | 0.000612 / 0 |
| Actual initial home JS transfer | 160,351 bytes | 159,243 bytes |

| Gzip route JS estimate | Phase 6 | Phase 7 |
| --- | ---: | ---: |
| Home | 143,374 bytes | 143,179 bytes |
| Article | 141,499 bytes | 130,402 bytes |
| Product | 151,567 bytes | 140,458 bytes |
| Search | 138,125 bytes | 138,208 bytes |
| Recipe | 138,754 bytes | 138,531 bytes |

Passing flows do not establish all timing targets. Cold mobile Shop ranges 533.2–795.6 ms, but observed loading feedback has a 247.4 ms median across four samples, exceeding the proposed 200 ms budget. Warm mobile catalog ranges 261.1–2,145.9 ms; cold mobile product reaches 3,318.8 ms; desktop home LCP has a 3,044 ms outlier. Several warm feedback observations are absent. Warm mobile medians remain slower than Phase 5's 281.8/295.7/198.9 ms. The controlled comparison improves on Phase 6 but does not prove universal speedup or attribution to an individual change. Field INP/Web Vitals and staging p95 remain open.

## Verification and reproducibility

- Frontend: 100 passing tests in thirteen files. Final isolated Next production build includes successful types/lint, with two existing AdminProducts warnings. The standard standalone check still encounters stale user `.next/types`; the isolated build leaves that directory intact.
- Backend: 251 passing source tests in twenty-three files; shared contracts compile, backend types and production build pass. Changed-file lint has zero errors and three pre-existing scheduler-test `any` warnings. The existing backend-wide unused `_userId` lint failure is still a Phase 8 cleanup item.
- Controlled browser regressions: 67/67 pass on the final build, including all 58 earlier checks and nine Phase 7 cases. New cases cover safe markup/story preservation, complete 130-product/63-post paging, stale-query rejection, remote-failure fallback/retry, signed-market refetch, recipe lookup and desktop/mobile font roles/admin CSS. The retry intentionally returns 131 backend matches: the original Malabar Black Pepper description also matches Harvest, while the compact metadata fallback matches 130 generated products. Principal benchmark: 160/160 steps, zero failures.
- Four actual PostgreSQL checks execute the exact query builders against synthetic `VALUES` CTEs shadowing every referenced table, in bounded read-only transactions. No real table rows are read or written. This verifies SQL semantics rather than representative execution plans/load.
- Remote CI, authenticated deployment scenarios, gateway sandbox flows, mail-provider behavior, actual cron runtime/concurrency and hosted CDN behavior are unverified.

Accepted frontend fingerprint: `6cccfdf9f3f6a2e29e706a875bb7695ed7860d6f9e0934a3060cf4249fff38b8`. Fixture server: `74f2255fa86c74d36f8b49540423a8daff5e78b5150478ef60dfe4628973eb36`. Catalog fixture: `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138`; media fixture: `1619cd5028994339ff9657a8e2744c8c960c0f609ec244bce8e42da0504f8d66`, unchanged from Phase 6. The principal runtime is Node 20.20.2 with Chrome 154.0.8037.58 / Playwright 1.62.1; test/measurement artifacts record their own Node versions.

Principal output, earlier/new controlled checks, SQL/payload/cost evidence, source/configuration and these reports are frozen in `artifacts/performance/phase-7-2026-10-02/` with a verified snapshot manifest. Historical failed harness attempts remain separately labeled and are excluded from accepted results. Harness corrections addressed full-backend versus metadata matching, duplicate input selectors, sampling an unstyled icon button, and awaiting fonts after responsive resize; application source/build stayed unchanged. Screenshots of the home, article, product and admin gate were inspected, with original public media hashes unchanged. Runner instructions are in [the performance README](../../scripts/performance/README.md).

## Decisions deferred with triggers

| Work | Evidence and revisit trigger |
| --- | --- |
| Server-only complete search / compact remote results | The current small catalog benefits from a complete compact index. Revisit above 500 products, a 50 KB compressed index, measured local scoring p95 above 20 ms, or hosted search p95 above 500 ms. Preserve complete results and partial-match semantics; five-result autocomplete is insufficient. |
| Exact local font assets | Runtime already self-hosts fonts and observed transfer is unchanged. Revisit repeated build-time font fetch failures when exact licensed files can be identified. |
| Admin table pagination | Existing contracts return arrays capped at 500. Coordinate frontend/API paging when a list nears 500 records, exceeds 1 MB, or hosted p95 exceeds 500 ms. |
| Dashboard rollups/private caching | Aggregation removes raw-row transfer; revisit representative SQL plans and dashboard p95 above 500 ms before adding invalidation/rollup complexity. |
| Durable mail/revalidation outbox | Controlled delays prove awaited dependencies, not actual provider cost. Revisit contact/wholesale or admin invalidation p95 above 500 ms due to these dependencies, timeout rate above 1%, or observed delivery/invalidation loss. Persist work with its source transaction and provide bounded retries, replay/idempotency, failure visibility and operator ownership. |
| Job batching / distributed ownership | Revisit candidate sets above 100, runtime approaching half the schedule interval, or storefront contention. A second API replica immediately requires exactly one active scheduler; if rolling deployments cannot guarantee this, add a dedicated worker or distributed lease first. |

The Phase 6 search trigger repair remains prepared but unapplied: the read-only inspection found fourteen NULL search vectors. Controlled fixture search does not validate real FTS integrity. PERF-22, hosting/region acceptance PERF-27, production no-Origin SSR CORS blocker PERF-32 and representative navigation budgets remain release work. Provider is undecided, likely VPS. For a Sri Lankan audience, measure candidate host latency from Sri Lanka and against the current Singapore database before selecting a region/capacity.

## Rollout and rollback

Deploy the lookup-aware backend before the new recipe frontend, retaining Phase 6 card/summary and Phase 5 passive-cart contracts. Preserve Phase 4 invalidation endpoint/secret/cache rollout order. For the initial single API process, the scheduler defaults enabled. Before additional replicas, restart all non-runners with `SCHEDULED_JOBS_ENABLED=false`, keep exactly one enabled, and verify rollout overlap cannot duplicate jobs. `noOverlap` is a same-process guard, not leader election.

Frontend/server sanitation, index/lookup and CSS changes can be reverted together with their corresponding components/routes; retain the HTML policy. Analytics rollback restores its prior controller implementation without a response-schema change. Scheduler flag rollback restores earlier startup behavior; retain the failed-send correction unless explicitly reconsidered. Existing TTL fallback and authoritative checkout price/stock checks remain in force.

No migration application, real account/customer/payment operation, deployment, commit or push was performed. Phase 8 has not started.
