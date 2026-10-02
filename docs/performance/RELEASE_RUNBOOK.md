# Performance release runbook

Status: prepared locally; provider, staging endpoints, candidate remote CI, gateway sessions, hosted measurements and rollback rehearsal are pending. This document is a reviewable procedure, not evidence of deployment. Use the current Phase 9 results, Phase 8 checklist and Phase 9 worker runbook for the release decision.

## Candidate and host preparation

Choose a provider/region after measuring Sri Lanka→storefront, Next→API and API→the existing Singapore Neon database. Record CPU/memory, disk, connection allowance, expected concurrency, operating system and process count. Local fixture results do not determine VPS capacity or the fastest region. Do not change database suspension/pool settings without checking the actual plan and representative traffic.

Use a supported Node LTS runtime consistent across build, CI and deployment; CI currently targets Node 22. Historical Phase 8 comparisons used Node 20. The integrated PR and Phase 9 follow-up checks use checksum-verified Node 22.23.3; the workspace now requires Node 22 and includes .nvmrc. [Node release support](https://nodejs.org/en/about/previous-releases) identifies supported LTS branches. Pin exact build/runtime versions in the release record. Install the pinned workspace dependencies from the lockfile; preserve the separate frontend package and original public assets.

Run the frontend/API as supervised, unprivileged services. The reviewed [single-VPS proxy example](./deployment/Caddyfile.example) binds Next to 127.0.0.1:3000 and API_HOST to 127.0.0.1:4000, exposes only webhooks/health on the public API origin and overwrites visitor attribution at the storefront ingress. [Signed identity configuration and acceptance](./PHASE_8_BFF_IDENTITY.md) are mandatory before real traffic. The example assumes Caddy directly faces visitors; a CDN/container/multi-host topology needs separate review. Neither configuration syntax nor external port restrictions have been tested on a host here.

Reverse proxy configuration must pass through streaming responses, CSP nonces, Set-Cookie, Origin and conditional/cache headers. It must not cache HTML/RSC/private/API responses across visitors. Route webhooks without adding JSON parsing before the backend signature verifier. Verify the proxy's request timeout exceeds application deadlines, body/upload limits suit the existing routes, and abandoned connections do not continue indefinitely. [Caddy reverse-proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) describes streaming and forwarded-header behavior if Caddy is selected; the hosting/provider choice remains open.

Record the reviewed candidate commit plus source fingerprint, lockfiles, migrations, runtime and generated-media manifest. PR #170 is built in isolated managed worktrees; the original working checkout contains user changes and must not be packaged accidentally. Remote CI must run on the exact published candidate, not an older branch. PR #170 is published against Develop; verify its latest exact head before release. The existing main-branch Deploy workflow runs migrations and may trigger hosting; do not push/merge main as a substitute for staging validation.

## Configuration checklist

Backend:

- NODE_ENV=production; frontend CORS origins are exact public origins in FRONTEND_URL.
- Dedicated non-production database and direct migration connection for staging; backups/restoration verified. No production customer data for synthetic load.
- Strong JWT_ACCESS_SECRET/COOKIE_SECRET; secret storage access restricted. ENABLE_DEV_ROUTES=false.
- PAYMENTS_MODE=live is required by production validation even for gateway sandbox testing. Use Stripe test keys/webhook secret and PAYHERE_MODE=sandbox with sandbox merchant configuration. Do not use the stub completion path or live charges as acceptance.
- API_URL is the public API origin for gateway notification delivery. FRONTEND_URL's first origin must reach the intended revalidation endpoint.
- For the Phase 9 rollout, all API processes use SCHEDULED_JOBS_ENABLED=false and OUTBOX_WORKER_ENABLED=false. Dedicated workers enable the durable outbox and database-fenced scheduler as specified in [the worker runbook](./PHASE_9_WORKER_RUNBOOK.md). Verify concurrent workers, restart/drain and provider idempotency on staging. Legacy mode still requires exactly one scheduler process.
- TRUST_PROXY matches actual hops; TRUST_CLOUDFLARE only if origin access is restricted to that trusted network. Verify client-IP isolation, not merely header presence.
- Single-VPS template: API_HOST=127.0.0.1, TRUST_PROXY=0, TRUST_CLOUDFLARE=false, BFF_CLIENT_IP_REQUIRED=true, BFF_TRUSTED_PEERS=127.0.0.1,::1 and a matching strong server-only BFF_CLIENT_IP_SECRET on both services. The controlled ingress must overwrite X-Aranya-Verified-Client-Ip; synchronize clocks. Existing limits remain unchanged and per API process. Shared public SSR reads retain a bounded service bucket.
- Resend/Cloudinary/sandbox gateway credentials and actual sender/domain configuration are validated without logging secrets. Set LKR_USD_RATE consistently with the frontend.

Frontend:

- Production site/upstream origins match the build and host. Browser API requests still use the BFF.
- Next binds its private interface; enable BFF_CLIENT_IP_SECRET only with the controlled ingress in place. Missing/invalid ingress IP fails closed. Verification emails now use FRONTEND_URL/api/auth/verify; expire/reissue old direct-API links before hiding that route.
- MARKET_COOKIE_SECRET matches backend COOKIE_SECRET and stays server-only; REVALIDATION_SECRET matches both services.
- Build/deploy generated public/media with the original assets and manifest. Preserve old versioned assets while old pages/releases can reference them; approximately 105 MB of generated media currently accompanies the app.
- Telemetry defaults off. Enable a small staging sample with explicit origin and selected log sink/retention. Configure PERFORMANCE_TELEMETRY_ENABLED, PERFORMANCE_TELEMETRY_ORIGIN, PERFORMANCE_TELEMETRY_SAMPLE_RATE and PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE. Respect DNT/GPC; exclude private route cohorts.
- Optional logical server-read metrics: PUBLIC_READ_METRICS_ENABLED=true and PUBLIC_READ_METRICS_SAMPLE_RATE. Optional backend logs: API_PERFORMANCE_METRICS_ENABLED=true and API_PERFORMANCE_SAMPLE_RATE. Sample1 is for controlled staging diagnostics, not the default production volume.
- Disable proxy/platform capture of metric request bodies/headers, full query strings and cookies. Keep log access/retention deliberate. Application metrics retain only allowlisted groups/names/status/timings, not identifiers. The collector is not authenticated against arbitrary non-browser clients; apply an infrastructure-wide budget if needed.

Examples and semantics are in [telemetry notes](./PHASE_8_TELEMETRY.md) and the repository's .env.example files. Secret values are never placed in reports or NEXT_PUBLIC variables.

## Database release procedure

The final Phase 9 owned-cluster check passes all 24 chronological migration SQL files, bounded admin/search contracts and repair behavior. It is not Prisma migration bookkeeping, populated-data locking or Neon integration acceptance. [Search repair notes](./PHASE_8_SEARCH_REPAIR.md) contain exact checks, timeouts and post-verification.

1. On a disposable/staging database, check migration history and schema/index drift. Verify the current trigger state and count mismatched vectors, not just NULL vectors. Record counts/plans without product/customer text.
2. Rehearse backup restoration and the exact Prisma migrate-deploy command against populated staging data. Review lock/backfill duration under bounded timeouts and expected traffic. Keep old applied migrations immutable.
3. Apply the prepared repair via the approved release procedure using the migration connection. Do not manually mark the migration applied merely because raw SQL ran in a local fixture.
4. Verify one enabled narrow insert/name/description trigger, zero mismatched vectors, valid FTS/trigram indexes, insert/edit/search/filter/market/price/cursor correctness through the deployed API and frontend. Review representative EXPLAIN plans and SQL p95 under normal concurrency.
5. Invalidate product cache tags through the authenticated revalidation endpoint. Do not write secrets into shell history, screenshots or reports.

This migration changes derived vectors/functions/trigger, not source descriptions. Avoid dropping it as a generic rollback: old clients can consume the corrected vectors. If it is defective, pause writes/search as appropriate and ship a reviewed forward repair; restore the backup only with an explicit data-recovery decision. A backup restoration can lose post-backup orders and is not an automatic application rollback.

## Compatible application rollout

1. Build the final reviewed candidate with matching environment. Run backend source tests/types/full lint/build, frontend build and focused/browser checks. Check actual remote CI on that candidate.
2. Prepare the new frontend invalidation POST endpoint with shared caching disabled (MARKET_COOKIE_SECRET unset) if deploying services separately.
3. Deploy the mutation/invalidation-aware and card/summary/passive-cart/lookup-capable backend. Retain legacy full product/detail contracts. Verify production SSR reads without Origin, allowed credentialed writes/preflight, rejected absent-Origin writes and null/untrusted origins, and raw signed webhooks.
4. Deploy the dependent frontend, then enable matching market/cache secrets after invalidation succeeds. Rotating COOKIE_SECRET requires coordinated frontend secret rotation or temporarily disabling shared caching.
5. Keep exactly one scheduler owner throughout rollout. Confirm health/database connectivity, middleware order, port exposure, process restart/drain behavior and no unexpected 429s.
6. Run the hosted probes and full staging matrix; monitor error/timeout rates before requesting the release decision.

For signed identity rollout, deploy the verifier with matching secret and BFF_CLIENT_IP_REQUIRED=false before deploying the ingress/signer. Verify fresh signed BFF requests and unsigned shared SSR reads, drain all old unsigned frontend processes, then set BFF_CLIENT_IP_REQUIRED=true and restart the API before staging acceptance or real traffic. Optional mode is only a compatibility step, not a release configuration. Rotation requires matching service secrets and a coordinated restart/drain; the verifier intentionally accepts one key. Keep public private-API restrictions throughout.

## Hosted acceptance evidence

The read-only HTTP checker accepts explicit origins and never loads local .env or creates accounts/carts/orders/forms:

```powershell
$env:STAGING_SITE_ORIGIN='https://staging.example'
$env:STAGING_API_ORIGIN='https://api-staging.example'
$env:STAGING_API_EXPOSURE='webhooks-only'
node scripts/performance/staging-readiness.mjs
```

It checks site/BFF reads, private-revalidation headers, anonymous BFF auth rejection, health and rejection of direct application API routes/preflight under the webhook-only topology. The optional full-api diagnostic mode checks production CORS on a deliberately exposed diagnostic endpoint; it is not the recommended release exposure. Run the allowed/disallowed/null/absent CORS matrix from the private host separately. Artifacts retain status/timing/header properties, not bodies/cookies/ETags. Five sequential samples are descriptive; they do not establish representative p95, load or full release readiness. Output explicitly lists untested scenarios.

Complete the staging matrix with non-production accounts and sandbox orders:

| Area | Required evidence |
| --- | --- |
| Routes/visuals | All storefront routes, account/cart/checkout/success/cancel/admin; desktop/mobile; original typography/crops/animation; real device and reduced motion |
| Navigation | Five cold/warm runs under prior profiles, rapid interrupts/retries and idle hero bounds; investigate slow tails; compare to Phase 7/8 local evidence |
| Market/cache | Signed USD/LKR, invalid cookie, guests/returning users; private isolation; fresh CSP nonce; metadata/primary streaming; mutation/rename/archive invalidation/TTL fallback |
| Auth/cart | One refresh rotation, expired sessions, guest-to-user cart merge, queued adds, signout/owner isolation, coupons and market changes; independent visitors retain rate-limit buckets |
| Stripe/PayHere | Both sandbox gateways, redirect/3DS/cancel/failure; duplicate/out-of-order webhook delivery; authoritative order confirmation, historical price/stock transaction and exactly-once stock effects |
| Delivery | Generated-media/static immutable headers, responsive images, first/repeated transforms, gzip/conditional private responses, no shared cache of sensitive responses |
| Operations | Sri Lanka-to-site and API/DB latency; representative safe staging concurrency/data; connection limits; restart/drain; one scheduler; reminder failure retries; provider error/latency |
| Observability | Metrics off/on sampling, forbidden/private payload rejection, no credentials/referrer in reports; actual log sink retention and no platform PII capture |

Targets remain proposed: feedback ≤200 ms, useful common warm navigation roughly ≤1 s, warm public API p95 <500 ms under documented load, field LCP ≤2.5 s / INP ≤200 ms / CLS ≤0.1 at p75 after sufficient real traffic. Local passes do not waive slow samples. Exceedances require resolution or an explicit reviewed acceptance with evidence. Logical server read policy is not a hit/miss flag; backend 304 counts indicate conditional browser revalidation. Compare sampled logical reads and backend calls only within matched windows/cohorts; do not claim an exact Next cache-hit ratio from these logs.

## Application rollback rehearsal

Keep the previous known-good frontend/backend release and original/generated assets. Rehearse swapping back on staging, private schema/contract compatibility, matching cache secrets, invalidation and exactly one scheduler owner. Keep new opt-in API contracts available while older/newer frontends overlap. Retain compatible derived-vector fixes unless a reviewed forward repair is required.

Telemetry rollback sets all metric flags false and restarts/redeploys; the collector drops new POSTs as 404. Scheduler false disables registration on a restarted non-owner, not running work already accepted. Failed invalidation falls back to TTL; checkout still validates authoritative price/stock.

Record rollback duration, recovered health, confirmed order/stock integrity and retained assets. Define operational rollback criteria from hosted baseline before release: sustained elevated errors/timeouts/429s, cache privacy failure, auth/payment/stock regressions or unacceptable navigation. No automatic data restore, retry of a charge or real order cancellation is part of this runbook.

## Release record

Capture candidate commit/fingerprint, runtime/provider/region/capacity, CI links, migrations/backups/post-verification, config ownership, matrix results, measured budgets/outliers, deferral triggers, scheduler owner and rollback rehearsal. All P0 findings must pass, and remaining performance exceptions need an explicit decision. Phase 7 growth deferrals remain conditional rather than silently implemented. Production deployment follows acceptance of this concrete candidate and runbook.
