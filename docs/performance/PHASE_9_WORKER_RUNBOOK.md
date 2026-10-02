# Phase 9 worker and rollup rollout

All four feature flags default false. Additive migrations are prepared; no application database has been migrated by this work. Apply reviewed migrations and verify restoration on the selected staging host before enabling the features. Use the project-supported Node 22 runtime and the frozen workspace lockfile.

## Processes

The API validates optional feature configuration before connecting/listening. Set OUTBOX_WORKER_ENABLED=false and SCHEDULED_JOBS_ENABLED=false on API replicas. A separate process runs `node backend/dist/jobs/worker.js` from the repository root (or `node dist/jobs/worker.js` from backend). Importing this entrypoint in tests starts nothing.

The dedicated process requires OUTBOX_ENABLED=true, OUTBOX_WORKER_ENABLED=true, DISTRIBUTED_JOBS_ENABLED=true, a valid keyring/active key, RESEND_API_KEY, REVALIDATION_SECRET and the HTTPS FRONTEND_URL in production. Set SCHEDULED_JOBS_ENABLED=true there; JOB_TIMEZONE explicitly selects the cron calendar. Enable DASHBOARD_ROLLUPS_ENABLED only after migration rehearsal. Incomplete/dirty rollup coverage falls back to the original bounded live aggregates.

## Queue and leases

Business writes and their enabled queue inserts commit together. Email payloads retain the rendered original body/recipient and are AES256-GCM encrypted with row-bound authenticated data. OUTBOX_ENCRYPTION_KEYS is a secret JSON keyring; OUTBOX_ACTIVE_KEY selects new writes. Retain old keys until all events encrypted with them have been drained or reviewed. Status/error reporting does not reveal decrypted content or recipient/token values.

Claims use PostgreSQL SKIP LOCKED and a 120-second recoverable lease, two messages per batch, two delivery lanes, bounded database transactions and a 10-second email request deadline. Delivery failures retry with backoff/jitter and at most eight automatic attempts. Authentication messages also expire with their token deadline. The exact payload and `outbox/<uuid>` provider key survive crash/retry. Automatic and manual email replay stop before 23 hours from the first attempt, conservatively inside [Resend's documented 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys); ambiguous old deliveries require manual investigation rather than a new provider key.

Use `node backend/dist/jobs/outboxOps.js status` for grouped counts/oldest age. `node backend/dist/jobs/outboxOps.js replay <uuid>` accepts only eligible DELIVERY_FAILED events; it preserves the first-attempt window, payload and provider key. Expired, invalid, changed-cart and uncertain events are ineligible. Keep these operator commands private. Verify recipient and provider receipt via authorized provider tools before resolving uncertain/dead events.

Each scheduled task acquires a database-time 60-second owner/fence lease and checks it inside every write transaction. Retaining the released lease row keeps fence numbers monotonic. Batches are bounded at 200; low-stock uses a fixed checkpoint to resume beyond 2,000 variants without starvation. Abandoned reminders deduplicate cart/update episodes and mark sent only after accepted delivery while that episode remains unchanged. Scheduled publication uses a conditional update and enqueues invalidation atomically.

## Stop and rollback

Stop the dedicated worker to stop delivery/scheduling; SIGTERM waits for current bounded work and disconnects. An interrupted claim becomes eligible after its lease expires. Retain database rows and encryption keys during rollback. Disable feature flags consistently on producers/readers only after reviewing pending work: reverting to direct sends while durable emails remain pending can duplicate notifications. Keep API scheduler flags false during this transition. Do not delete queue rows or reset provider keys to hide failures.

Hosted provider credentials, real deliveries, migration/load/rollback drills and monitoring are still release gates. Local tests use only owned disposable PostgreSQL and mocked transports.
