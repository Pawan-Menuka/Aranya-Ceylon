# Phase 7 — mail, revalidation and scheduled jobs (PERF-28)

Date: 2026-10-02, Asia/Colombo. Source baseline: `095f149` plus the preserved local Phase 4–6 changes, including scheduled-publication invalidation. This is a local, synthetic assessment. No provider request, background job, database connection/write, production host or deployment was used.

## Decision and evidence

| Area | Existing response dependency or job shape | Phase 7 decision |
| --- | --- | --- |
| Contact and wholesale submission | Both controllers `await sendSupportNotification` before returning 201. A controlled provider stub held each response for an 80 ms delay; it remained unanswered at 79 ms and completed after 80 ms. The real provider p95 is unknown. | Defer a durable mail outbox until hosted request/provider telemetry shows a material delay or delivery failures. The submission currently has no durable copy, so lost-mail risk also warrants separate product review. |
| Registration, resend verification and password reset | Token creation and email send already run outside the response promise. Those paths are fast but in-process work can be lost at process exit. | Do not replace with another fire-and-forget mechanism. Revisit durability when reliable verification/reset delivery is required, with neutral anti-enumeration timing retained. |
| Cache revalidation | Admin content mutation and product image upload paths await `revalidateFrontend`. The existing helper has one body-inclusive 3,000 ms deadline and a public-cache TTL fallback. A synthetic 80 ms fetch plus 20 ms body wait held the helper for 100 ms; no network was contacted. Scheduled posts already invalidate committed publications in bounded 32-path requests. | Defer outbox until hosted revalidation timing/failure rates justify the additional persistence and replay semantics. Preserve synchronous invalidation for immediate cache freshness. |
| Scheduled jobs | Six schedules start in every API process. Scheduled posts fetch all due records and update them concurrently; stale orders and abandoned carts scan all eligible rows, then process sequentially. Dataset sizes, DB plans and job durations under realistic load have not been measured. | Add explicit runner control and same-process overlap prevention. Defer query batching until actual counts/runtime show pressure. |

These synthetic waits establish that the dependencies are on the awaited path, not their production latency. The Phase 6 browser fixture uses an in-memory API, so its navigation timings cannot estimate Resend, deployed Next revalidation or Neon job cost.

## Implemented locally

`SCHEDULED_JOBS_ENABLED` accepts `true` or `false`, case-insensitively; absent means enabled, preserving the existing single-process behavior. `false` registers no schedules. Invalid values fail startup instead of silently allowing a misconfigured replica to run jobs. Repeated `startAllJobs()` calls in one process register each of the six schedules once. Every cron task uses node-cron's `noOverlap` option so a second tick in the same process skips while the previous invocation is active. This option is not a cross-process lock.

Abandoned-cart recovery now marks a cart as emailed only after `sendAbandonedCartEmail` succeeds, logs failed sends and leaves them eligible for the next hourly attempt. Its return value counts successful sends. This prevents a known failed send from being permanently suppressed. A provider-side acceptance followed by a lost response, or a process exit between send and cart update, can still yield a duplicate. Fully durable exactly-once effects require an outbox plus an idempotency strategy, including provider support where available.

## Deployment ownership and revisit triggers

The intended first VPS deployment is one API process, for which the default remains enabled. Before adding a second API replica, configure **exactly one** scheduler runner with `SCHEDULED_JOBS_ENABLED=true` and set every other API process to `false`; verify configuration and job-start logs on all instances. A rolling overlap of two enabled processes can still duplicate work. If the host cannot guarantee one active runner through rollouts/restarts, implement a dedicated worker or distributed lease before scaling. Do not treat this environment flag as leader election. Keep the host timezone intentional for the 08:00 low-stock alert.

Revisit a durable outbox/queue when representative hosted contact/wholesale p95 exceeds the proposed 500 ms warm public-API budget due to email, when admin invalidation p95 exceeds 500 ms or timeout rate exceeds 1%, or when a notification/invalidation loss is observed. A queue design must persist work with its source transaction, retry with bounded backoff, expose failed/dead-letter work to operators, and make replay/idempotency explicit. Do not add a table or migration until reviewed with the deployment/database owner. Revisit job batching when any run approaches half its schedule interval, an unbounded candidate set exceeds 100 rows, or job DB load measurably affects storefront p95. Adding a second API replica is an immediate scheduler-uniqueness gate regardless of these timing thresholds.

## Verification and limits

- Four focused job/test files: 16 tests pass, including default/disabled/invalid runner configuration, once-per-process registration, no-overlap options, failed reminder retry eligibility, scheduled-publication invalidation and synthetic response dependencies. Run from `backend` using direct Node Vitest CLI; mocked adapters prevented network, provider, database and cron execution.
- Changed jobs production/test files have zero ESLint errors (three pre-existing `any` warnings in `scheduler.test.ts`). The integrated backend typecheck, production build and full 251-test source suite pass after the concurrent analytics/shared edits were completed.
- Actual Resend p95/error rate, revalidation p95, eligible row counts, job duration/DB contention, process restarts and multi-replica uniqueness remain unmeasured until staging. This slice adds no outbox schema or mail/provider calls.

Rollback: remove the flag and `noOverlap` options to restore the old scheduler startup behavior; retain the reminder failure correction unless a product decision explicitly prefers suppressing retries. For deployment, `SCHEDULED_JOBS_ENABLED=false` immediately disables new registrations on a restarted replica while investigation proceeds; keep exactly one enabled runner for scheduled order cancellation and maintenance.
