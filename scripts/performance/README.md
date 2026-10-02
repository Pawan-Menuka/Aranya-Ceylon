# Performance baseline tooling

This tooling measures an isolated **production Next frontend** against a deterministic in-memory API. It does not start `backend/src/index.ts`, scheduled jobs, email delivery or payment providers. `snapshot-db.mjs` and `phase-six-db.mjs` connect to the configured database using READ ONLY transactions. `phase-seven-sql.mjs` also connects read-only, but shadows every referenced table with synthetic VALUES CTEs and reads no real customer/order/product rows.

The Phase 0 source of truth is [the implementation plan](../../docs/performance/PERFORMANCE_IMPLEMENTATION_PLAN.md). Results and screenshots live under `artifacts/performance/` (gitignored); the curated outcome lives in `docs/performance/PHASE_0_RESULTS.md`.

## Run locally

Requirements: installed project dependencies; a supported Node LTS runtime (CI targets Node 22); Playwright **1.62.1** and Chromium or installed Chrome. Historical principal comparisons use the existing local Node 20 runtime, which is not the production recommendation. Exact versions are captured in `environment.json` and `browser.json`.

From the repository root, using PowerShell:

```powershell
$env:PERF_NODE_MODULES='C:/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:PERF_BROWSER_CHANNEL='chrome'
node scripts/performance/run.mjs --smoke
node scripts/performance/run.mjs --reuse-build
node backend/node_modules/vitest/vitest.mjs run --config scripts/performance/vitest.config.ts
node scripts/performance/phase-one-browser.mjs
node scripts/performance/phase-two-browser.mjs
node scripts/performance/phase-three-browser.mjs
node scripts/performance/phase-four-browser.mjs
node scripts/performance/phase-five-browser.mjs
node scripts/performance/phase-six-browser.mjs
node scripts/performance/phase-seven-browser.mjs
node scripts/performance/phase-eight-browser.mjs
```

Keep BFF_CLIENT_IP_SECRET unset and telemetry flags off for the default fixture comparison. Phase 8 enables them in separate controlled cases and supplies synthetic ingress identity; it does not start the real backend or establish hosted proxy trust.

`PERF_NODE_MODULES` is only necessary if Playwright cannot be resolved from the project. Point it to a node_modules directory containing the pinned package on other machines. Omit `PERF_BROWSER_CHANNEL` to use Playwright's installed Chromium. CI installs the browser into its own temporary tooling directory, leaving the project dependency lock unchanged.

- No flags: build an isolated copy, then collect **five repetitions per profile**, with cold and warm browser-cache flows.
- `--smoke`: one desktop repetition; still covers cold/warm home → catalog → product → cart drawer → checkout, account/admin gates and article arrival. Functional errors fail; performance budgets are report-only.
- `--reuse-build`: reuse only if source fingerprint, fixture hash and ports match. Otherwise it fails and requests a fresh build. This does not replace the running frontend's `.next`.
- `--skip-http`: skip the supplementary five-round local HTTP probe.
- `PERF_PORT` and `PERF_API_PORT`: override the default isolated ports 3101 and 4101. The runner refuses occupied ports.

The copied build is retained in `aranya-next/.performance-build/` for repeat measurements and is gitignored. The runner terminates only its own Next server and fixture API when it finishes. A pre-existing developer server is not stopped or reused.

The current focused frontend/tooling suite contains **190 tests across seventeen files**, including signed BFF identity, telemetry, logical-read metrics and staging probes. The eight controlled browser runners contain **74 checks**: six recovery, 12 hero, nine media, eight cache/streaming, twelve startup/commerce, eleven catalog, nine Phase 7 refinements and seven Phase 8 release checks. Run browser runners sequentially because they share the isolated ports. These checks are separate from the five-repetition principal benchmark. The full backend source suite contains **423 tests across twenty-nine files**.

## Refresh fixtures and check database metadata

```powershell
node scripts/performance/snapshot-db.mjs
```

This optional command reads `backend/.env` privately, checks migration/index metadata and SELECT 1 latency, and exports only active products/published content. It never emits credentials or prints raw database errors. Customer accounts, order records, tokens and review authors/bodies are not exported. Public product relation counts are included to retain representative ranking.

Refreshing fixtures intentionally changes the dataset fingerprint and invalidates a reused build. Keep the same checked-in `fixtures/catalog.json` during comparisons; refresh only when deliberately creating a new baseline. Database checks do not run in CI and need no CI database secret.

## Profiles and observations

`config.json` declares the viewport, DPR, touch/mobile emulation, CPU slowdown, throughput and network latency. Each repetition creates a fresh browser context; a cold pass clears browser cache, then a warm pass revisits in the same context. Next/fixture processes persist and their server caches are already warmed by build/readiness/HTTP checks. These are **browser-cold/warm**, not cold-server measurements.

Network/CPU throttling uses Chromium CDP through Playwright. Home is observed for a fixed six seconds after DOM readiness, without `networkidle`, because the existing hero schedules a large background download. Metrics report initiated frames, completed bytes and in-flight requests separately. Warm reuse can be partial because the cold observation window does not wait for the full sequence to finish. Subsequent actions use the same browser tab and therefore can compete with remaining downloads.

Catalog/product clicks have a 15-second observation deadline. A failed transition is retained as a `navigation-timeout` record and fails the command; a separately labeled hard navigation permits the remaining screens to be inspected. These fallback arrivals never receive a successful click-to-content time. They are not evidence that the click completed. Checkout or later flow failures retain an error screenshot. The run continues with the next repetition.

Signed USD/LKR **fixture** cookies alternate between runs. They are verified by the fixture API and cannot authorize production activity. Anonymous account/admin gates are measured; this is not a signed-in role/checkout correctness test. Payments stop at checkout screen arrival.

Browser observers collect hard-navigation LCP, session-window CLS, long tasks and Event Timing samples. Click-to-content is measured from the captured click to the destination content marker. Since Phase 1, a MutationObserver also records the first visible route loading placeholder after a click as `loadingFeedbackMs`; null means no placeholder was observed. This includes fast transitions that finish without a placeholder and is not automatically a failure. The retained two-animation-frame timing is an input-feedback approximation. Event timings are lab observations, not field INP. SPA transitions do not reset LCP, so the summary excludes inherited home LCP from catalog/product/cart/checkout steps.

Long-task/event arrays and CLS are cumulative within the current document; SPA step records inherit earlier document observations. Use the home record for initial-load comparisons and inspect task start timestamps for individual interactions. The current summary is not a per-transition CPU attribution report. Content-marker detection includes automation polling and does not measure image completion or visual stability.

The underlying Chrome network events supply completed encoded transfer bytes, status and timing for API/RSC requests. Request/response headers, token/cookie values, HTML snapshots and customer data are not written. Do not treat incomplete-window bytes as total page weight. Supplementary HTTP bytes are decoded body sizes and are labeled separately.

Stage network summaries group requests by initiation time. Bytes that finish later from a request initiated in an earlier stage are not attributed to the latest step. A warm flow may therefore show few new bytes while competing with older hero downloads.

## Artifacts and CI

The runner writes build output, source/environment fingerprints, bundle reference estimates, HTTP samples, browser samples, summaries, provisional budget observations and viewport screenshots. Bundle estimates include unique ancestor-layout and page manifest JS references, including route-group layouts, gzip-compressed per file. They exclude later dynamic libraries/resources and are not browser download measurements.

`.github/workflows/performance.yml` runs a production browser smoke on relevant pull requests or manual dispatch and uploads artifacts for 14 days. It uses the checked-in fixture snapshot without contacting the database. Existing font downloads and Cloudinary imagery may require external network access.

Timing budgets remain **report-only** while optimization phases are implemented. Smoke failures in the actual route flow fail CI. After Phase 8 review, choose calibrated regression limits and decide which timings to enforce; do not convert noisy single-run timings into a release gate prematurely.

For each implementation phase, retain the Phase 0 artifacts before generating another run, compare the same fixture/profile/build mode, and record changed-source fingerprints. Hosting/CDN latency, live query plans, authenticated accounts, payment sandbox flows, and field Web Vitals are separate staging/release checks.

The request test suite checks body-inclusive deadlines, caller cancellation, shared refresh/replay, cookie forwarding and BFF failures without contacting a database. Backend revalidation tests remain in the backend suite. `phase-one-browser.mjs` requires a current isolated production build, uses ports 3101/4101, and checks delayed catalog feedback, explicit retry, session failure/gating and the real BFF timeout. It blocks hero frames only in these controlled fault checks to isolate API behavior. The principal benchmark continues loading all real hero frames. Run these commands sequentially: each browser runner owns the same isolated ports. Phase 5 intercepts synthetic sign-in/payment-intent responses; none of these commands signs into a real account or submits a real payment.

## Verify Phase 2 hero behavior

`node scripts/performance/phase-two-browser.mjs` checks the current source/fixture/build fingerprints and refuses occupied ports 3101/4101. It uses real frame assets to exercise idle loading, rapid forward/reverse scroll, brand reveal, navbar thresholds, offscreen pause, desktop/mobile resize, visibility pause/resume, unmount cancellation, fresh mobile startup, reduced motion, data saving and missing-frame fallback. The earlier Phase 3 focused suite contained 23 request/BFF/hero/media tests across four files, including late decode release, concurrency bounds across viewport generations, immutable asset replacement and production startup without authoring-source scans. The current command also includes the Phase 4 tests counted above.

The loader starts four frames at rest, schedules a window of at most 12 desired indices, permits at most two pending fetch/decode operations, and retains at most 16 decoded frames. These are current resource bounds, not a limit of 12 total downloads over a scrolling visit. An aborted native bitmap decode retains its slot until it settles and its result is closed. Visible dust keeps its intended animation; frame interpolation stops when settled and both loops pause when inactive/static.

Results, screenshots and a sanitized Chrome scroll timeline are written to `artifacts/performance/phase-two-checks/`. Open `scroll-trace.json` in DevTools Performance. These controlled scroll checks are separate from the five-run principal timing comparison. The missing-frame case uses route interception only to force a 404; the principal benchmark does not intercept frames. Headless Chrome visibility falls back to an injected `document.hidden` event if switching tabs does not hide the page. `saveData` is also injected, while reduced motion uses browser emulation. Real background-tab/device/browser acceptance remains a staging check. CI runs all eight controlled browser runners and uploads their artifacts.

## Verify Phase 3 media

`node scripts/performance/phase-three-browser.mjs` checks source, API fixture, media-component fixture and port fingerprints before starting its own processes. It checks desktop/mobile image visibility with JavaScript disabled, unique poster preloading, omission of visitor editing requests, gallery/cart thumbnail variants, immutable static headers/conditional requests, local image-transform reuse, Cloudinary display, shape/fit/position/empty-slot contracts, and opt-in editor sidecar/crop persistence. Results and screenshots go to `artifacts/performance/phase-three-checks/`, together with sanitized desktop/mobile initial-load Chrome traces and request waterfalls. Traces are separate from the throttled principal benchmark; their URL queries and headers are omitted. Open `*-initial-load-trace.json` in DevTools Performance. Its Cloudinary case uses the public Cloudinary demo image; outgoing network access is needed. All browser runners share isolated ports and must run sequentially.

The principal runner copies `media-fixture.tsx` into the isolated build only, at `/performance-fixtures/media`; no such route is added to the live app. This component fixture has a separate build fingerprint. It includes synthetic editor data and a mocked persistence bridge that records writes in memory. It never writes the real sidecar or changes customer/admin data.

Next config automatically calls `aranya-next/scripts/prepare-media.mjs` for development startup and production build. The production server uses the built output without scanning/copying the authoring sources. The principal runner also calls the generator before recording hashes. The generator creates independent content-versioned copies under `public/media/`, plus `src/lib/media-manifest.json`. Photographs use individual content hashes; the hero sequence/poster uses a group hash. The manifest and generator are source/build inputs; derived public/media copies are gitignored and excluded from source fingerprints. Replacing an original and rebuilding creates a new URL while old generated copies keep their original bytes. Run the generator directly after replacing media in an already-running dev session to refresh the manifest. Originals retain their previous revalidation policy; only versioned media gets one-year immutable caching. Build from the original public assets, and deploy the generated public/media output with the Next build. No separate hosting/CDN account configuration is inferred or changed.

Ordinary `ImageSlot` renders initial HTML images and does not load `image-slot.js` or the sidecar. `editor={true}` explicitly mounts the legacy authoring component on demand; its existing `{u,s,x,y}` and bare data-URL sidecar formats/bridge remain intact. No saved sidecar was found in this working tree. The hero poster retains its original WebP encoding: a trial re-encode at quality 90 added about 50 KB with no new source detail. It is now an eager preloaded image with the same cover crop and a versioned URL. Other photography uses optimized responsive images; thumbnail sizes are declared at their placements. Hosted CDN/transform latency and real device quality still require Phase 8 verification.

## Verify Phase 4 public caching and streaming

`node scripts/performance/phase-four-browser.mjs` verifies real Next Data Cache reuse across distinct fixture guests, isolation of signed USD/LKR markets, invalid-cookie handling, fresh matching CSP nonces, uncached private carts, mutation/rename/archive invalidation, primary product/article HTML and metadata preceding delayed recommendations, public JSON gzip delivery, and browser hydration/layout. Run it after a current isolated build, sequentially with the other browser runners. Content changes affect only the fixture process's in-memory catalog and are restored; no real backend, database, account or payment is mutated.

The isolated runners set a synthetic `MARKET_COOKIE_SECRET` matching the fixture API. For actual deployment, set this **server-only** Next variable to the backend's `COOKIE_SECRET`; never put it in a `NEXT_PUBLIC_` variable. Without it, public reads continue working but remain uncached and forward only the original market cookie. Configured requests verify the original signature/expiry and use a stable signed market-only cookie for upstream public reads. Resource/query/market define cache identity; guest, login and refresh cookies are omitted. Private fetches remain `no-store` even if callers supply cache hints. Public browser reads use conditional private caching; the backend verifies their original market cookie.

Default public data TTLs are 300 seconds for products/blog, 600 for categories, and 3,600 for recipes/gifts. Resource tags cover dependent product/category/recipe/gift views. Backend mutations send bounded, deduplicated POST invalidation batches, including old/new slugs; the frontend retains the older authenticated GET contract. `REVALIDATION_SECRET` must be configured with the same value in both deployments. Set the backend's `FRONTEND_URL` so its first comma-separated origin reaches the intended frontend revalidation endpoint. Failed invalidation logs a sanitized warning and falls back to TTL; it does not undo a committed mutation. Checkout still reads authoritative live price/stock.

Deploy the mutation/invalidation-aware backend before enabling shared caching in the frontend. For a staged rollout, first prepare the new frontend POST endpoint with `MARKET_COOKIE_SECRET` unset, then deploy the backend and verify authenticated invalidation succeeds, and finally enable the matching server-only market secret in the frontend. A coordinated rollout can deploy both together. This order accommodates the new POST contract while preventing cache-enabled reads from running against a backend that lacks product invalidation. Rotating the backend `COOKIE_SECRET` requires updating the frontend `MARKET_COOKIE_SECRET` together, or temporarily disabling shared caching during the change.

The backend supplies private conditional-response headers and Express ETags for public reads; private routes are no-store. The BFF delivers gzip for eligible public JSON, retaining cookie/market/conditional semantics. Verify hosted CDN behavior separately in Phase 8. Existing anonymous gates and signed fixture markets do not establish real account/payment acceptance.

The recovery runner now explicitly invalidates product tags before injecting faults, since changing guest cookies intentionally no longer bypasses the public cache. Build/source guards remain in place. Initial/scroll/media checks retain their original bounds; optional recommendations now stream through server Suspense slots while the successful page styling remains unchanged.

## Verify Phase 5 startup and commerce

`node scripts/performance/phase-five-browser.mjs` checks the current production build against twelve controlled cases. It verifies one root session restore followed by a read-only cart bootstrap, no fresh guest cookie, optional chunk absence, deferred dialog keyboard/focus behavior, persistent navbar identity/appearance, synthetic expired-session/login-merge/admin gates, captured local PayHere submission, deferred Stripe SDK boundary, and cancellation/paid-only cart clearing on the success route. External HTTP is blocked. Authentication, intent and order responses are synthetic browser interceptions; these checks do not establish real session rotation or gateway sandbox acceptance. Results and screenshots go to `artifacts/performance/phase-five-checks/`. Interception disables HTTP caching in this controlled harness; the principal benchmark keeps normal networking/cache behavior.

Storefront navbar/footer/card links disable viewport-wide prefetch and prefetch an eligible public destination after 150 ms of hover or keyboard focus, with a bounded 30-second deduplication map. Cart and sign-in chunks mount on demand. Admin reuses root auth and loads the chosen screen. Stripe's pure loader is isolated until a Stripe intent exists. Payment status polling has a body-inclusive 20-second total budget and caller cancellation; only an authoritative confirmed status clears the basket.

Deploy the backend's new read-only `GET /cart/bootstrap` contract before the corresponding frontend, or coordinate both deployments. The legacy creating `GET /cart` remains compatible with older clients. New passive bootstrap/totals do not create carts or reset recovery activity; validated first adds create guest identity. Shopping mutations deliberately renew activity; a failed post-commit tracking update logs fixed diagnostic text while preserving the successful basket mutation/cookie. Real database/session/merge and gateway flows remain Phase 8 checks.

`startup-diagnostic.mjs` is an archival Phase 4 comparison helper and requires that exact frozen Phase 4 isolated build. It compares three cold mobile startup samples per arm with speculative RSC enabled versus natively blocked, unblocking before Shop. It retains real hero assets and normal HTTP cache behavior; first-arm samples include timeline overhead. It cannot run against the newer Phase 5 build without deliberately preparing the recorded Phase 4 snapshot. Treat its limited, variable CPU samples as diagnostic evidence, separate from final normal-network measurements.

## Verify Phase 6 catalog and SQL

`node scripts/performance/phase-six-browser.mjs` uses the current isolated build with 625 in-memory synthetic products, separate from the unchanged 14-product principal fixture. It checks compact/market-specific cards, all six sorts beyond 500 rows, global combined facets, eight-card SSR, demand-only cursor requests, no-JavaScript filtered HTML, late-page cancellation, explicit retry, category summaries, same-route query navigation and USD/LKR resets. It shares ports 3101/4101 and must run sequentially with other browser runners. Its oracle is `catalog-fixture.mjs`; environment evidence records that file's hash. These tests do not prove large-dataset SQL performance; actual SQL is checked separately.

`node scripts/performance/phase-six-db.mjs` runs bounded read-only Neon metadata, cursor/filter traversals and EXPLAIN ANALYZE queries. It never imports backend startup, applies migrations or overwrites the frozen public fixture. The current 14-product database cannot establish representative staging scale. The discovered missing search trigger/NULL vectors and unapplied local repair migration remain a release requirement. See [database and hosting evidence](../../docs/performance/PHASE_6_DATABASE.md). Next/API hosting is undecided; Singapore is a candidate matching the database, awaiting measurements from Sri Lanka and the selected VPS.

The no-JavaScript catalog case verifies the filtered rows in streamed server markup. Next's pending fallback can remain visible without the inline completion scripts; this case does not establish a visible or interactive no-JavaScript catalog. Existing no-JavaScript home/product photography checks remain separate. Catalog filters and pagination require JavaScript.

Next's Data Cache persists across `next start` processes. The large-catalog harness restores its original fixture and invalidates tags before shutdown; the principal runner also clears public tags before its existing HTTP warmup. This prevents synthetic data from contaminating later comparisons while retaining normal browser networking/cache behavior. An interrupted contaminated comparison is archived separately and excluded from acceptance. Loading placeholders reserve one viewport so a footer does not flash before the full page arrives; completed-page styles are unchanged.

Phase 6's historical acceptance included 93 frontend cases plus 14 backend SQL/card-service/controller cases and 239 full-source backend tests; current totals are listed above. CI generates the Prisma client and compiles shared contracts, and backend tests exclude stale compiled tests in `backend/dist`. Its eight controlled browser runners and disposable SQL rehearsal never connect to the configured database. Deploy the opt-in `view=cards` and `view=summary` backend before this frontend; legacy full products/detail/admin contracts remain available. Cache tags, market secrets, invalidation and authoritative checkout behavior retain their prior rollout requirements.

`loading-height-diagnostic.mjs` is a separate, interleaved desktop intervention on the pending placeholder geometry. It runs two contexts per 70vh/100vh arm, retains the normal principal networking profile, and writes to `artifacts/performance/phase-six-loading-height-diagnostic/`. These limited samples and their extra observer are diagnostic evidence; they do not replace the final five-run measurements. The principal runner omits the optional intervention.

## Verify Phase 7 refinements

`node scripts/performance/phase-seven-browser.mjs` verifies article sanitation and formatting, product story after market refresh, complete search across 130 generated products and 63 journal posts, stale-query rejection, remote-failure/local fallback, market-scoped refetch, bounded recipe lookup, font roles and admin CSS separation. It uses synthetic public rows in memory, restores them and invalidates cache tags on exit. External browser requests are blocked; no real accounts/payments/mail/analytics/jobs/database writes run. Browser route interception means these are correctness checks, separate from normal-cache principal timing.

`node scripts/performance/phase-seven-sql.mjs` executes the exact analytics and ingredient query builders against synthetic VALUES CTEs in bounded read-only PostgreSQL transactions. No real table data is read. It validates UTC windows, quantity-weighted revenue, currency/status handling and active-market lookup, not representative plans or hosted load. `phase-seven-measure.mjs` measures repeated-content sanitizer reuse separately from browser timing.

Sanitation retains the existing allowlist at server boundaries, with a content-keyed cache bounded to 128 entries and 524,288 combined input/output UTF-16 units. Interactive renders receive only clean paragraph strings. Search retains a complete compact index for the current small catalog, follows cursors instead of silently truncating at 100/50, and cancels complete remote FTS reads on query/market changes within a 20-second overall budget. Recipe lookup is opt-in `view=lookup` with at most forty names. Its backend contract must deploy before the frontend.

Admin CSS is imported by the admin layout; only unused font weights are removed. Dashboard SQL aggregates preserve the existing response and money/status/UTC semantics. `SCHEDULED_JOBS_ENABLED=false` disables registrations on restarted additional API replicas; exactly one runner must remain enabled. Same-process noOverlap is not distributed leader election. A durable queue, broad server-only search and admin full-array table paging are deferred with concrete triggers in the Phase 7 results. All eight controlled runners share ports and must be sequential. CI's Phase 8 migration SQL rehearsal uses only a newly owned disposable PostgreSQL cluster; it does not connect to the configured database.

## Verify Phase 8 release preparation

`node scripts/performance/phase-eight-browser.mjs` verifies actual production CORS/metrics/identity middleware around the isolated fixture and actual Next BFF. It checks default-off telemetry, bounded public Web Vitals without credentials/referrer, collector rejection/private cohorts, finite server metrics, signed visitor login-limit isolation, spoof stripping, generic missing-ingress failure, unsigned public SSR and preserved cookie/verification redirects. Browser visibility is simulated for deterministic metric flush, and ingress IPs are synthetic. These are functional checks, not hosted trust or timing acceptance. Results are in `artifacts/performance/phase-eight-checks/`.

`node scripts/performance/phase-eight-search-migration.mjs` requires local PostgreSQL binaries (`PG_BIN` if not on PATH) and creates a uniquely owned loopback cluster. It ignores configured database URLs, refuses ownership mismatches, replays all chronological SQL migrations in a separate empty database and tests the search repair against controlled drift. It stops its cluster in finally. This is raw SQL replay, not Prisma migration bookkeeping or populated Neon acceptance. Details: [search-repair notes](../../docs/performance/PHASE_8_SEARCH_REPAIR.md).

`node scripts/performance/staging-readiness.mjs` requires explicit `STAGING_SITE_ORIGIN` and `STAGING_API_ORIGIN`; default `STAGING_API_EXPOSURE=webhooks-only` matches the controlled VPS template. It makes bounded GET/OPTIONS probes, stores no response bodies/secret headers and does not create carts/accounts/orders or call gateways. `full-api` is an explicit diagnostic exposure mode. Small-sample timing is descriptive. No hosting is selected, so this checker has not been run against a host. See [release runbook](../../docs/performance/RELEASE_RUNBOOK.md) and [open gates](../../docs/performance/PHASE_8_RELEASE_CHECKLIST.md).

## Isolate cold Shop stalls

Run `node scripts/performance/shop-diagnostic.mjs` from the root after a current isolated build exists. It checks source/fixture/port fingerprints, refuses occupied ports, and reuses the same public fixture/build without modifying application code. Five fresh cold-browser trials per desktop/mobile profile compare hero frames enabled versus natively blocked, alternating order per repetition. The 15-second observation deadline remains unchanged; a failed click has no successful timing or hard-navigation fallback. Server caches remain warm, matching the principal benchmark.

Results go into a unique `artifacts/performance/shop-diagnostic-<timestamp>/` directory. It records summaries, actual page state, sanitized request waterfalls with streamed bytes/completion, fixture API elapsed times and representative screenshots. The first repetition in each profile/arm also captures a Chrome timeline JSON trace, which can be loaded in DevTools Performance. Traces exclude headers/cookie/token fields and URL queries; all requests use isolated fixture data. No live authentication or payment is submitted. Tracing/screenshots add overhead to those first samples.

Native CDP blocking is used so HTTP cache behavior is identical in both arms. Playwright route interception [disables HTTP cache](https://playwright.dev/docs/api/class-browsercontext#browser-context-route), so it is avoided for this comparison. Blocking prevents frame callbacks and decoding along with transfers; interpret it as an intervention on the frame subsystem, not a network-only intervention. Host/browser transport and staging results may differ. A passing blocked arm is diagnostic evidence and does not turn the normal application's failing smoke into a pass.
