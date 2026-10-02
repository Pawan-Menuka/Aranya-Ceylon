# Phase 9 verification results

Date: 2026-10-02 (Asia/Colombo). PR: [#170 against Develop](https://github.com/Pawan-Menuka/Aranya-Ceylon/pull/170).

## Source and checks

The complete baseline frontend fingerprint is `bd37ef5aa93a7575ad76ce78f02bb7c17ce74826c44f23751e509b683e4812a5`. This is a local production fixture build, not a deployed API/Neon benchmark. Node 22.23.3 is checksum verified; pnpm 9.15.9 uses the unchanged workspace lockfile. The original checkout and accepted Phase 0–8 build are preserved.

- Backend: 527 unit tests in 42 files, full typecheck, production compilation and lint pass. Prisma 7.10 generation/schema validation uses dummy disconnected configuration.
- Frontend/tooling: 233 tests in 23 files pass. Isolated Next 14.2.35 production build includes frontend types/lint. Standard API-unavailable production build also passed during this implementation.
- Controlled earlier-phase browsers: 74 checks pass. New Phase 9 browser acceptance: four checks pass, covering five bounded admin lists, complete independent search continuations, retained-card retry and all 44 locally served exact font files.
- Final formatting cleanup was followed by another successful production rebuild and all 16 desktop smoke steps. Final rebuilt source fingerprint: `97dd77486c16af59d8f43a0b1a2d73af5bca79ffacaacf38d8af156469cb79e5`.
- Existing checkout suite: all four tests pass against the final isolated production build, with anonymous-session/cart fixtures and stub payments.
- Owned PostgreSQL integration: 20 tests in seven files pass. Coverage includes atomic producer rollback, concurrent paid-order CAS, distinct worker claims, stale ownership/crash recovery, frozen retry keys/payloads, expiry, public-mutation invalidation, rollup equivalence/dirty fallback and resumable bounded jobs. The Asia/Colombo session test verifies immediate queue eligibility with explicit UTC defaults. Provider transports are mocked.
- Final API/SQL harness: 18 semantic checks pass across all 24 migration SQL files and 625 synthetic rows per resource, using actual PrismaPg binding/hydration. Report: `artifacts/performance/phase-nine-api-pages/2026-10-02T13-12-40-628Z-b0669d51-b669-4d37-9ead-91c63241ceda/checks.json`. The harness also passed with PostgreSQL tools deliberately absent from PATH: its captured PG_BIN survives environment sanitization. The harness stopped its own cluster; the separate retained integration cluster also shut down after testing.
- All three GitHub workflows pass actionlint. CI includes the new Phase 9 browser and disposable SQL checks; exact published-head results must be read from the PR.

## Navigation observations

Five repetitions for each desktop/mobile cold/warm profile produced 160 principal flow/arrival steps with no flow, page-error or navigation-timeout failures. Cold browser profiles still use a primed server/Data Cache. Emulated mobile uses four-times CPU throttling and the configured network profile. The test driver retains the original click-to-content measure; added DOM/frame-opportunity/readback observations are diagnostics, not paint guarantees or replacements for the budget.

| Profile / cache / route | Click-to-content median ms | Maximum ms | Loading-feedback median ms (samples) |
| --- | ---: | ---: | ---: |
| desktop/cold/catalog | 1132.6 | 1788.6 | 335.6 (5) |
| desktop/cold/product | 522.6 | 557.2 | 79.7 (5) |
| desktop/warm/catalog | 201.8 | 1408.9 | not observed (0) |
| desktop/warm/product | 65.7 | 219.1 | not observed (0) |
| mobile/cold/catalog | 1242.1 | 3273.8 | 301.4 (2) |
| mobile/cold/product | 989.8 | 2638.5 | 465.9 (3) |
| mobile/warm/catalog | 590.3 | 1619.7 | not observed (0) |
| mobile/warm/product | 672.5 | 1014.4 | not observed (0) |

The earlier 10,870.2 ms warm mobile product outlier did not recur; this run's warm mobile product maximum is 1,014.4 ms. Moving static editorial sections to server rendering reduced the product page JavaScript reported by the build from 10.9 kB to 8.94 kB. These observations do not prove the outlier's cause or establish a production speedup.

Catalog medians and tails are higher than the prior integrated run, despite an essentially unchanged catalog chunk and successful RSC responses. The slowest cold mobile catalog sample is 3,273.8 ms: target DOM at 3,008.2 ms, readback 265.6 ms later, RSC TTFB 89.5 ms. Host variation, client/rendering work and observation overhead remain possible contributors; the alternating same-build Shop diagnostic passed all 20 trials. With hero frames enabled, desktop median/max were 487.7/505.1 ms and mobile median/max 756.3/1,622.1 ms; blocked-frame medians were 468.9/930.5 ms. No trial exceeded 15 seconds. This variation does not isolate a regression or its cause, and disabling the hero is not supported by these results. Diagnostic artifacts: `artifacts/performance/shop-diagnostic-2026-10-02T12-50-50-729Z/`. Timing budgets remain open: the 1,000 ms useful-content and 200 ms loading-feedback budgets are not uniformly met. Missing skeleton observations can also occur on prefetched transitions and do not constitute a feedback pass.

## Release boundary

[Implementation](./PHASE_9_IMPLEMENTATION.md), [API contract](./PHASE_9_API_CONTRACT.md), [worker runbook](./PHASE_9_WORKER_RUNBOOK.md) and [release checklist](./PHASE_8_RELEASE_CHECKLIST.md) describe the completed local source work and remaining rollout steps. The four Phase 9 additive migrations and previous search repair are unapplied to the application database. Outbox/delivery, distributed jobs and dashboard rollups default off.

Hosting/provider choice, trusted ingress/private ports, populated staging migration/backup/restore, actual provider configuration and sandbox flows, representative concurrency/drain, monitoring/retention, real-device timing and rollback remain release gates. No live customer account, email, upload, gateway charge, application database migration, merge to Develop/main or deployment occurred.
