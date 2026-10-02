# Phase 8 local release preparation — 2026-10-02

Status: local implementation and release preparation verified; hosted acceptance remains pending because the user has no hosting selected. This phase does not authorize or represent deployment, publication of a candidate or migration of the connected database. Phases 0–7 retain their historical evidence and measured deferrals.

## Changes

- PERF-32: production CORS allows no-Origin GET/HEAD server reads without credentialed CORS headers, while rejecting absent-Origin writes/preflight and null/empty/untrusted origins. Exact allowed browser origins and raw gateway-body handling remain intact. Actual middleware is exercised with the production Next BFF and SSR fixture.
- PERF-33, explicitly approved for Phase 8: the BFF replaces incoming IP/signature assertions with a fresh HMAC over a canonical ingress IP, timestamp, method and exact upstream path/query. The API privately installs verified attribution before existing rate limits/audits. Strict mode rejects unsigned private requests; bounded public SSR/health reads from configured socket peers remain unsigned and retain cache keys. Existing login/global/checkout limits are unchanged. Optional validated API_HOST supports private binding. Verification emails use the storefront BFF; refresh/guest cookies and verification redirects are preserved. [Identity notes](./PHASE_8_BFF_IDENTITY.md) explain trust, rollout and old-email compatibility limits.
- First-party Web Vitals, API duration and logical public-read metrics are opt-in, sampled and default off. Only fixed categories, bounded values, timings/status and policy are logged. Browser reports omit cookies/auth/referrer, honor DNT/GPC and exclude private cohorts. The collector enforces exact origin, schema, bytes/chunks/deadline and a worker-wide request budget. Logical policy and backend 304 counts do not establish an exact Next cache-hit ratio. [Telemetry notes](./PHASE_8_TELEMETRY.md).
- Backend-wide lint now has zero errors; guest-order status projection still omits its private userId. The remaining 115 existing warnings are recorded rather than hidden.
- Search repair now has an owned disposable PostgreSQL harness that replays all 19 chronological migration SQL files in an empty database and separately tests missing/stale vectors, idempotence, narrow trigger maintenance, indexes and actual catalog/legacy query-builder semantics. This is raw SQL execution rather than Prisma bookkeeping, populated locking or Neon adapter hydration. The connected database repair remains unapplied. [Search notes](./PHASE_8_SEARCH_REPAIR.md).
- CI covers the new source regressions, eighth browser suite and isolated SQL rehearsal. Prisma generate/validate use explicit configuration and dummy database URLs; source backend tests exclude stale dist tests. The workflow exists locally; remote CI on this candidate remains unrun.
- Added explicit-origin bounded hosted read probes, a [release checklist](./PHASE_8_RELEASE_CHECKLIST.md), [release/rollback runbook](./RELEASE_RUNBOOK.md) and a concrete [single-VPS Caddy example](./deployment/Caddyfile.example). The proxy example assumes direct visitor connections, has not been parsed/installed here and requires actual host verification.

## Local verification

| Check | Result |
| --- | --- |
| Focused frontend/tooling source tests | 190/190, 17 files |
| Full backend source tests | 423/423, 29 files |
| Backend full ESLint | 0 errors, 115 existing warnings |
| Shared/backend compilation and backend typecheck | Pass |
| Final isolated frontend build/types/lint | Pass; two existing AdminProducts warnings |
| Principal production browser comparison | 160 steps, zero failed transitions/page errors, five cold/warm runs per profile |
| Controlled browser regressions, phases 1–8 | 74/74; all suites use this frontend source/build |
| Owned disposable PostgreSQL 18.4 | 59/59 checks; owned cluster stopped; exact migration/query/harness hashes verified |
| Prisma schema validation | Pass with explicit dummy URL; no connected-database operation |
| Original assets/design | Source asset hashes unchanged from Phase 7; desktop product and mobile catalog screenshots inspected against prior output |

Final frontend source fingerprint: `b13aa43953e067ff13b703fe2cf6a3742322a82b2e799ed45276ba9478c4eabc`. Catalog, media, oracle and fixture-server hashes are unchanged from Phase 7. The benchmark uses the isolated `.performance-build`; the user's `.next` is preserved. Accepted evidence is frozen under `artifacts/performance/phase-8-2026-10-02/`, including source snapshots, provenance and a hash-verified manifest. Secret .env files, generated media/build output and database data directories are excluded; examples contain no deployed credentials.

Principal runtime is the existing Node 20.20.2, Chrome 154.0.8037.58 and Playwright 1.62.1. This preserves the local comparison runtime, not a production runtime recommendation. CI targets supported Node 22; exact hosted/runtime/remote candidate acceptance remains pending. Backend local tests/build may use the sandbox Node 24.19.0. The [Node support table](https://nodejs.org/en/about/previous-releases) explains the supported LTS requirement.

The Phase 8 browser suite wraps the in-memory fixture with the actual production CORS, identity and API metric middleware, rather than starting the real index/database/jobs/providers. It proves two synthetic ingress IPs retain independent actual login-limiter buckets: one visitor's eleventh request is 429 while the second visitor's first is 200. Forged incoming assertions are replaced, missing ingress fails 502, unsigned/partial direct private assertions fail 403, shared unsigned SSR still succeeds and cookie paths/verification query/redirect survive. It does not prove a future proxy overwrites identity or blocks private ports. A controlled hidden-document event flushes real Web Vitals observers deterministically; those reported numbers are not field performance measurements. The combined run passed all 67 earlier cases and the first six Phase 8 cases; its initial strict-case failure was resolved by correcting the fixture's runtime loader to one shared CommonJS module namespace. The final separate Phase 8 rerun passes all seven cases on the same unchanged application build. Superseded failed harness runs are not accepted evidence.

## Principal comparison and unresolved budgets

Five repetitions per row, identical principal fixture and emulated profiles; browser-cold/warm, with warm server caches. Values are medians in milliseconds.

| Flow | Phase 7 | Final Phase 8 |
| --- | ---: | ---: |
| Cold desktop Shop | 371.5 | 469.0 |
| Cold mobile Shop | 628.0 | 813.1 |
| Warm desktop catalog | 74.2 | 233.3 |
| Warm desktop product | 66.3 | 213.9 |
| Warm desktop checkout | 79.4 | 115.6 |
| Warm mobile catalog | 494.5 | 644.0 |
| Warm mobile product | 540.9 | 664.6 |
| Warm mobile checkout | 257.8 | 333.1 |

These results are slower than Phase 7 and are not presented as a navigation speedup. Cold Shop ranges are 456.9–487.1 ms desktop and 774.7–1,095.4 ms mobile. One warm mobile catalog sample takes **5,236.5 ms**, while the others leave its median at 644 ms. That sample records a successful 109.4 ms RSC response-header time, 4,532 response bytes, no JavaScript transfer, no hero requests or HTTP failures during the transition, and long tasks up to 434 ms. The captured aggregate does not attribute the full delay; a hosted/full trace and repeated tail investigation are still required. No timeouts or successful hard-navigation substitution occurred.

Cold mobile Shop feedback is 296.9 ms across only two observed samples; product feedback is 411.9 ms across four. Warm catalog/product feedback is unobserved, not zero. These do not meet or establish the proposed ≤200 ms response target. Mobile warm content medians are below one second, but the 5.24 s tail prevents blanket budget acceptance. Final cold home LCP medians are 528 ms desktop / 636 ms mobile, and home CLS is 0.000612 / 0; these are lab observations, not real-user p75.

The disabled telemetry gate adds **657 bytes** to actual initial home JavaScript transfer, 159,243→159,900 bytes, and to each reported route gzip estimate: home 143,179→143,836; article 130,402→131,059; product 140,458→141,115; search 138,208→138,865; recipe 138,531→139,188. No telemetry requests are emitted with flags off. The small measured instrumentation overhead is disclosed; these samples do not establish it as the cause of the timing regression.

The earlier Phase 8 run before approved identity integration is retained separately at `artifacts/performance/phase-eight-before-attribution-2026-10-02/` and is superseded. It also has slower/variable timings; it is not mixed into the final five-run statistics or represented as accepted identity evidence. No repeat was used merely to select a faster result.

## Remaining work before release

Select hosting and test Sri Lanka→site/API→Singapore Neon placement and capacity. Validate the concrete ingress, IPv4/IPv6 private ports, signatures, independent visitors, clocks and secret rotation. Run remote CI on an exact published candidate using the supported runtime. Rehearse populated staging backups and Prisma migrate deploy, then verify trigger/search plans/cache invalidation before applying the repair through the approved release procedure.

Finish the hosted route/visual/cache/market/auth/cart/staff matrix, Stripe and PayHere sandbox/raw webhook/stock acceptance, real sender/upload configuration, representative safe concurrency and exactly one scheduler through restart/rollout. Enable chosen sampled logs, investigate navigation feedback/tails, collect enough field data and rehearse compatible rollback. The runbook specifies evidence and rollout order. No connected-database migration, real account/payment/email activity, deployment, commit or push occurred in Phase 8. Phase 7 growth deferrals retain their measured revisit triggers.
