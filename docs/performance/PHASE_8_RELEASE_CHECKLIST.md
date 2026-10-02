# Phase 8 release checklist

Updated 2026-10-02. See [PR integration results](./PR_INTEGRATION_RESULTS.md) for published candidate #170 and its current checks; historical Phase 8 counts below describe their original snapshot. Hosting is unselected. Local preparation does not constitute deployment acceptance. The [release runbook](./RELEASE_RUNBOOK.md) supplies the procedures; [Phase 8 results](./PHASE_8_RESULTS.md) will hold final local evidence and timing limits.

| Gate | Status | Remaining evidence |
| --- | --- | --- |
| Production CORS / backend lint | Implemented and locally tested | Actual hosted SSR, private CORS matrix and raw gateway delivery |
| BFF visitor rate-limit identity | Implemented and locally tested | Proxy syntax/overwrite, closed private ports, independent visitors and clock/rotation checks on host |
| Search-vector repair | 59 disposable PostgreSQL checks pass | Populated staging backup/restore, Prisma deploy bookkeeping, lock duration, deployed trigger/search/cache verification; actual repair remains unapplied |
| First-party Web Vitals / API / logical-read metrics | Implemented, default off | Chosen log sink/retention, production sampling/privacy and sufficient field data; policy logs do not prove exact cache hits |
| Production build, local tests and controlled browser checks | Final verification recorded in Phase 8 results | Remote CI on the exact published candidate and supported runtime |
| Provider / region / capacity | Pending; no hosting selected | Sri Lanka→site, API→Singapore Neon, expected load, CPU/memory/connections and network capacity |
| Authentication / carts / markets / staff roles | Local regression coverage only | Staging users, refresh rotation, ownership/merge/coupons, signed USD/LKR isolation and real visitor limits |
| Stripe / PayHere / mail / uploads | Mocked or controlled local checks only | Sandbox gateways, duplicate/out-of-order raw webhooks, stock/order authority, sender/domain and media service configuration |
| Scheduler / process / concurrency | Local controls tested | Exactly one active owner through restart/rollout, representative safe staging concurrency and graceful drain |
| Navigation / performance budgets | Open | Slow feedback/tails investigated and measured acceptance under hosted/real-device conditions; no blanket local timing pass |
| Rollback / compatible rollout | Runbook prepared | Restore rehearsal, previous assets/contracts/configuration retained, coordinated identity/cache secrets, observed rollback duration |
| Release decision | Pending | Reviewed candidate, all blockers closed, explicit handling of remaining budget exceptions, deployment instruction |

No candidate commit/push, remote CI dispatch, hosting purchase, deployment, real account/payment/email action or connected-database migration is represented by these local checks. The owned-cluster harness writes only to its disposable loopback database and stops it afterward. Original public assets and the existing design remain part of the verified candidate.
