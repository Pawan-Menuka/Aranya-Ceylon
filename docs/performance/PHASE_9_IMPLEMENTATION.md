# Phase 9: pre-deployment follow-ups

The remaining locally implementable performance work is incorporated into PR #170 against Develop. Development and verification use isolated managed worktrees; the original checkout and previous accepted build are preserved.

| Work | Implementation | Acceptance evidence |
| --- | --- | --- |
| Navigation costs and feedback | Static product editorial sections render on the server; client gallery, purchase and related controls retain their behavior. Browser observations separate target DOM, frame opportunity and driver readback. | Complete cold/warm desktop/mobile baseline and existing loading/retry/content checks; hosted timing acceptance remains open. |
| Supported runtime | Node 22 workspace engine and .nvmrc; CI and deployment workflows use Node 22. | Checksum-verified Node 22.23.3 for local builds and tests. |
| Admin pagination | Five lists use bounded server pages, authoritative filters/counts and stable cursors; existing order pagination remains. CSV export explicitly collects matching pages. | Late rows and next/previous checks against 625 fixtures per resource, SQL binding and frontend race/recovery regressions. |
| Complete compact search | Initial 20 results per collection with independent continuations, global totals and market/sort/query-bound cursors; no journal body or whole catalog download. | All 590 product and 600 journal fixture matches reachable; description-prefix, sort, market, stale-query and retry checks. |
| Durable mail/revalidation | Atomic encrypted enqueue for auth, paid/shipped orders and public-content changes; support submissions persist before acknowledgement. Dedicated delivery process, stable provider keys, bounded retry/dead-letter and operator commands. | Owned PostgreSQL rollback, concurrent CAS/claim, stale-owner, crash/retry and expiry tests; mocked provider transport only. |
| Dashboard cache/rollups | Bounded private single-flight cache and opt-in UTC/native-currency day aggregates; dirty or incomplete coverage uses existing live queries. | Cache concurrency, live/rollup equivalence, mutation invalidation and fenced rebuild checks. |
| Bounded scheduled jobs | Pages of 200, cooperative deadlines, database-time ownership fences, resumable low-stock checkpoint and cart-episode guards. | Concurrent owners, expired recovery, publication bounds and 2,201-variant continuation checks. |
| Exact pinned fonts | All 44 accepted WOFF2 files and 73 faces, Unicode ranges, metric fallbacks and family identities preserved with hashes/licenses. | Local byte equality, immutable delivery, distinct computed families and production builds without Google font fetches. |

See [verification results](./PHASE_9_RESULTS.md), [API contracts](./PHASE_9_API_CONTRACT.md), [worker rollout](./PHASE_9_WORKER_RUNBOOK.md) and [release gates](./PHASE_8_RELEASE_CHECKLIST.md).

The four new migrations remain unapplied to the application database. Queue, distributed jobs and rollups default off until staging configuration and migration rehearsal pass. Hosting selection, controlled ingress, real authentication/media/mail, sandbox payments, representative load, real-device timing and rollback drills still require a staging environment. Earlier phase reports remain historical evidence.
