# Performance implementation plan

Date: 2026-09-30 (Asia/Colombo)

Source: [Performance audit](./PERFORMANCE_AUDIT_REPORT.md). This plan covers the original 30 audit findings, plus PERF-31 discovered during Phase 0, production CORS blocker PERF-32 identified during Phase 4 review, and shared BFF rate-limit attribution PERF-33 discovered during Phase 8. Phase 0 tooling, Phases 1–7 code and Phase 8 local preparation are verified (updated 2026-10-02). Search repair deployment, representative staging/hosting, candidate remote CI and navigation budget acceptance remain open. Phase 7 measurement-led deferrals have explicit revisit triggers. Existing local changes are preserved and included in the baseline.

## Delivery approach

Apply one phase at a time, with a reviewable diff, relevant checks, a before/after comparison, and a phase outcome recorded here. Follow the repository's existing phase review/sign-off workflow when implementation begins. This document does not authorize deployment or production database changes.

Use `aranya-next` for the frontend and `backend`/`shared` for API contracts. Use the active `Develop` branch as the base for any implementation branch. Preserve the existing successful-page design, typography, image crops, animations, USD/LKR behavior, BFF cookie forwarding, refresh-token rotation, admin gating, and payment/stock transactions.

A phase is complete only when its acceptance checks pass. A measurement-led item may be deferred with evidence, rationale, and a trigger for revisiting it; it should not be marked implemented merely because it is deferred.

| Phase | Objective | Relative effort | Status |
| --- | --- | --- | --- |
| 0 | Establish reproducible production and browser measurements | Medium | Local baseline captured — browser checks fail; staging/release checks pending |
| 1 | Make navigation responsive and slow requests bounded | Medium | Local implementation verified — failure/retry checks pass again in Phase 4; feedback budget and staging acceptance remain pending |
| 2 | Reduce hero downloads and animation work | Medium–large | Done locally — five-run principal flows and 12 hero checks pass; staging/device acceptance pending |
| 3 | Optimize initial photography and static media delivery | Medium | Done locally — responsive server HTML photography, poster preload and versioned caching verified; hosted/device acceptance pending |
| 4 | Fix public data caching, invalidation, and rendering dependencies | Large | Done locally — cache isolation, mutation invalidation, primary streaming and gzip verified; variable/slower navigation timings recorded, staging/configuration acceptance pending |
| 5 | Reduce global startup work and optional JavaScript | Large | Done locally — persistent shell, intent prefetch, read-only cart/session ordering and deferred dialogs/admin/Stripe verified; 87 focused tests, 225 backend tests, 47 browser checks and 160 principal steps pass; staging and budget acceptance pending |
| 6 | Improve API payloads, database work, and host placement | Medium–large | Local implementation verified — compact paging/global facets/SQL, 93 frontend tests, 239 backend tests, 58 browser checks and 160 principal steps pass; slower timings, unapplied search repair, staging and VPS placement remain pending |
| 7 | Apply measured font, content, search, analytics, and job improvements | Variable | Done locally — route CSS/server sanitation, complete compact search, ingredient lookup, analytics SQL and scheduler controls; 100 frontend / 251 backend tests, 67 controlled checks and 160 principal steps pass; growth/provider deferrals and staging/budgets remain open |
| 8 | Run staging acceptance and prepare the release decision | Medium | Local preparation verified — CORS/lint, signed BFF attribution/private binding, telemetry, 190 focused / 423 backend tests, 74 browser checks, 59 disposable SQL checks and 160 principal steps; hosting unselected, hosted/remote CI/migration/rollback/budgets pending |

Effort is comparative, not a calendar estimate. Staging access, hosting settings, browser measurements, and existing local changes affect actual duration.

## Phase 0 — Baseline and measurement

**Audit coverage:** PERF-01; measurement foundation for PERF-30. First verify PERF-22's migration status; detailed query work belongs to Phase 6.

**Purpose:** establish which costs come from network, server rendering, browser work, or development compilation before changing behavior.

Work:

1. Record the exact commit plus current local changes, runtime versions, build command, relevant non-secret environment configuration, and test dataset.
2. Use an isolated production build/server or staging deployment without replacing the user's running development output. Capture existing lint warnings separately from new failures.
3. Define repeatable desktop and mobile browser profiles with explicit viewport, network and CPU settings. Record cold and warm samples separately; use at least five runs per principal flow and compare the median and spread.
4. Capture HTML/RSC/API timing, click-to-feedback and click-to-content time, transferred bytes, hero requests, first-load JavaScript, long tasks, and lab LCP/CLS. Observe interaction timings; do not treat a single lab run as field INP.
5. Add a small browser performance smoke workflow for the critical routes, and a baseline bundle-size report. Prepare staging fixtures and signed-market test sessions.
6. Inspect existing migration/index state using read-only checks; record infrastructure tasks/access needed for later phases.

**Deliverables:** a baseline results artifact, a repeatable measurement command/workflow, representative screenshots, and agreed staging budgets.

**Exit check:** the same browser flows can be repeated against the same build/profile. Measurements cover home → catalog → product → cart → checkout, plus article, account and admin arrival. No environment secrets are written to reports.

## Phase 1 — Navigation feedback and request deadlines

**Audit coverage:** PERF-05, PERF-06; navigation groundwork for PERF-10. Triage PERF-31, discovered in the Phase 0 fixture production build, before interpreting improved browser timings.

**Depends on:** Phase 0.

Work:

1. Add route-level `loading.tsx` boundaries to slow storefront destinations. Use lightweight placeholders matching the current layout so navigation responds while data loads.
2. Add clear retry/error states for timed-out reads and session restoration; keep navigation usable during failure.
3. Add operation-specific deadlines to the typed API client and BFF upstream calls. Honor caller cancellation rather than replacing an existing AbortSignal. Include body consumption in the request budget.
4. Bound auth refresh/session restoration and backend revalidation requests. Keep the existing shared refresh logic; avoid introducing concurrent token rotation.
5. Define separate time budgets for catalog/session reads and payment/upload operations. Restrict retries to appropriate reads; do not automatically replay non-idempotent writes.
6. Locate and resolve the server/client text mismatch behind the observed home hydration recovery (PERF-31), confirming it against a real staging API. Preserve the successful-page design and do not suppress hydration errors to obtain passing measurements.

Primary files: `src/app/**/loading.tsx`, `lib/api/http.ts`, `app/api/[...path]/route.ts`, `AuthContext.tsx`, `backend/src/lib/revalidate.ts`.

**Acceptance:** slow/offline API fixtures produce feedback and a retry state within the configured deadline; navigation remains interruptible; expired-session refresh still works. Checkout submits once and webhook confirmation remains authoritative.

**Verification:** browser navigation with delayed/failed API responses; focused tests for cancellation, timeout/error classification and refresh replay; relevant type/lint checks and production build.

**Local outcome:** [Phase 1 results](./PHASE_1_RESULTS.md). Eleven request/BFF tests, all 134 backend tests, six controlled browser checks, frontend/backend types, lint and production build pass. Home hydration recovery is fixed. Full five-run desktop/mobile comparison still fails on ten cold Shop transitions; mobile feedback is not consistently within 200 ms and warm destination completion does not consistently improve. These failures remain recorded for subsequent phases/staging. PERF-05 optional-content streaming remains Phase 4. No Phase 2 work, deployment or real payment submission was performed.

## Phase 2 — Hero loading and animation scheduling

**Audit coverage:** PERF-02, PERF-03, PERF-04.

**Depends on:** Phase 0; perform after Phase 1 for independent comparison.

**Pre-implementation diagnosis:** [Cold Shop investigation](./SHOP_TRANSITION_DIAGNOSIS.md). In 20 same-build cold-browser trials, all ten frame-enabled visits failed the 15-second check; all ten frame-blocked visits completed (desktop median 338 ms, mobile 506 ms). The needed catalog JavaScript remained pending while the old hero frame queue ran. This evidence guided the queue/concurrency and unmount cancellation work below; the final comparison retains the original full-flow checks with real frames enabled.

Work:

1. Resolve mobile/desktop selection before loading frames. Keep the existing poster and animation presentation.
2. Replace the full-sequence idle preload with a demand-driven queue: load a small initial window, prioritize the target frame, bound concurrency, and maintain a bounded cache around playback.
3. Handle rapid forward/reverse scrolling and unavailable frames using the nearest usable frame/poster. Guard against stale load callbacks and cancel obsolete fetch/decode work where supported.
4. Stop scheduling new downloads on unmount; ensure downloaded/decoded resources can be released. Treat already-transferred bytes separately from cancellation guarantees.
5. Pause dust and frame loops offscreen or in a hidden tab; stop interpolation when it settles. Respect reduced-motion/data-saving behavior with a suitable static fallback.
6. Reduce continuous React state updates/layout reads in the hero and navbar, preserving scroll direction and appearance changes.

Primary files: `components/home/HomeHero.tsx`, `components/home/HeroTextOverlay.tsx`, `components/Navbar.tsx`.

**Acceptance:** an idle visit does not schedule all 192 frames; queue/cache bounds are explicit and measured. Mobile never starts desktop-frame loading. Leaving the page stops new hero work. Fast/reverse scrolling has no blank canvas, and screenshots retain the established presentation.

**Verification:** network waterfall, scroll/main-thread trace, mobile/desktop resize tests, reduced motion, hidden-tab behavior, and navigating away during loading. Choose the initial frame/byte budget from Phase 0 measurements rather than an arbitrary quality reduction.

**Local outcome (2026-10-01):** [Phase 2 results](./PHASE_2_RESULTS.md). Idle startup requests four correct-viewport frames, with two pending operations, a 12-index window and a 16-frame decoded cache. Obsolete/unmounted fetches are canceled and late bitmaps released; frame interpolation settles, inactive/static animation pauses, and scroll styles avoid continuous React updates. All 18 focused tests, 12 hero browser checks, six Phase 1 regression checks and the production build/type/lint checks pass. The five-run desktop/mobile cold/warm principal benchmark now exits 0: all ten cold Shop transitions complete (median 347 ms desktop / 437 ms mobile), versus all ten exceeding 15 seconds in Phase 1. Screenshots and a scroll trace are retained. Visibility and saveData are controlled simulations where the headless browser lacks native behavior; real devices/background tabs remain staging acceptance. Individual mobile feedback/LCP outliers remain, so provisional timing budgets stay report-only. Phase 3 and deployment have not begun.

## Phase 3 — Responsive photography and media caching

**Audit coverage:** PERF-11, PERF-12, PERF-13.

**Depends on:** Phase 2 for the poster/frame loader interface; Phase 0 visual baseline.

Work:

1. Preserve the ImageSlot callsite contract/crop configuration while rendering visitor-facing images in initial server HTML using optimized responsive images.
2. Inventory whether any editing/drop/reframe behavior is still required. If required, isolate it behind an explicit editor mode; retain its saved-image data contract during migration.
3. Add placement-specific `sizes`/priority configuration for gallery images, cards, thumbnails and marketing heroes. Lazy-load alternate/below-fold images; prioritize only the actual visible hero.
4. Make the hero poster discoverable early without duplicate downloads.
5. Version media paths before assigning long-lived immutable cache headers. Prepare CDN/header configuration and verify Next image-transform caching on the selected host.

Primary files: `primitives/ImageSlot.tsx`, `primitives/SpicePhoto.tsx`, `lib/image-assets.ts`, ImageSlot callsites, `next.config.mjs`, media asset paths.

**Acceptance:** photography appears in server HTML; image dimensions/crops and text layout match the baseline; thumbnails request suitably small image variants; repeat visits reuse versioned media. Replaced assets change URL and do not leave a stale image indefinitely.

**Verification:** desktop/mobile screenshot comparison, initial waterfall/LCP trace, disabled-JavaScript image visibility, Cloudinary and local asset cases, and header/cache checks. Hosted CDN verification is completed in Phase 8 if configuration access is unavailable here.

**Local outcome (2026-10-01):** [Phase 3 results](./PHASE_3_RESULTS.md). Phase 2 had no remaining local implementation work; its 12 hero and six recovery checks pass again. Visitor images render in server HTML, editor runtime is opt-in, small placements select responsive variants, and the poster is preloaded once without re-encoding its original WebP. Content-versioned copies retain original bytes, change URL on replacement and receive one-year immutable caching; mutable originals retain revalidation. All 23 focused tests, nine media checks, 18 earlier browser checks, production build/types/lint and 160 principal steps pass. Cold home transfer medians decrease 35.3% desktop / 45.2% mobile versus Phase 2; cold Shop completes in 339 / 467 ms. Original source media/crops are preserved. Generation adds about 105 MB of derived public output that must accompany deployment; it does not run at production startup. Hosted CDN, real devices and release budgets remain Phase 8. Phase 4 and deployment have not started.

## Phase 4 — Public caching and primary content rendering

**Audit coverage:** PERF-07, PERF-08, PERF-09, PERF-23, PERF-24.

**Depends on:** Phase 1 request handling; Phase 0 signed-market fixtures. Implement invalidation together with caching, before increasing cache lifetimes.

Work:

1. Split the public server data path from authenticated/private fetching. Define a trustworthy canonical market input and cache keys based on market/resource/query, without guest identifiers.
2. Specify TTLs/resource tags and invalidation behavior for products, categories, home lists, journal, recipes and gifts. Keep private responses out of shared caches.
3. Wire product create/update/archive/image changes to dependent cache invalidation; cover slug changes using old and new identities. Include listing/search/recipe dependencies where appropriate.
4. Keep dynamic SSR compatible with market cookies and CSP nonces. Correct misleading SSG/ISR assumptions in comments. Treat fully static marketing/legal rendering as a separate measured design choice requiring a compatible security strategy.
5. Make metadata load only its primary record. Render primary product/article content independently of related sections, using streaming boundaries for optional data.
6. Measure public API cache/conditional-response and compression behavior; configure the appropriate application or delivery layer. Preserve Set-Cookie, authorization, market verification, and private cache-control semantics.

Primary files: `lib/api/http.ts`, public resource wrappers, `lib/market.ts`, product/article pages, `app/api/revalidate/route.ts`, product mutation controllers, `backend/src/lib/revalidate.ts`, API/proxy delivery configuration.

**Acceptance:** two distinct guests in the same market reuse public cache entries; signed USD and LKR sessions never receive each other's market-specific payload. User/cart/order data remain private. Editing or archiving a product invalidates affected views. Slow related content does not hold primary content/metadata back. Script nonces remain correct.

**Verification:** meaningful cross-visitor/cross-market/private-cache tests; mutation-to-page invalidation checks; production browser streaming traces; compression/header checks. Preserve live price/stock validation at checkout regardless of display cache TTL.

**Local outcome (2026-10-01):** [Phase 4 results](./PHASE_4_RESULTS.md). Sol agents implemented public caching and backend invalidation in parallel; coordinator integrated and reviewed rendering/delivery. Distinct same-market guests share one actual Next entry, signed USD/LKR stay isolated, private carts stay uncached and dynamic CSP nonces remain fresh. Product changes, old/new slugs and archives invalidate detail/list dependencies; audit and partial-write failures still invalidate committed successes. Product/article primary HTML arrives in 56/42 ms while related content is delayed three seconds; public JSON falls 25,059→4,491 wire bytes (82.1%). All 44 focused tests, 196 backend tests, 35 controlled browser checks and two 160-step principal runs pass functionally. Frontend build/types/lint and backend types/build pass; changed backend production files lint cleanly, while the existing full-backend lint error remains a release cleanup item. Repeat cold Shop medians are 336/609 ms, with mobile range 285–3,421 ms; warm mobile catalog/product/checkout are 554/386/276 ms. Some timings regress from Phase 3 and feedback budgets remain open. Configure matching market/revalidation secrets and a compatible rollout before enabling the shared cache. Existing production CORS blocker PERF-32 is recorded for release work. Phase 5 and deployment have not started.

## Phase 5 — Startup, shared navigation and optional bundles

**Audit coverage:** PERF-10, PERF-14, PERF-15, PERF-16, PERF-25, PERF-29.

**Depends on:** Phases 1 and 4. Keep the navigation/layout migration separate from the cart API change so regressions can be isolated.

**Measurement trigger from Phase 4:** profile startup/prefetch CPU before altering shared navigation. Same-build repeats show variable cold mobile Shop and slower warm catalog/feedback timings; the extra 9,707-byte catalog prefetch chunk explains transfer placement, but does not establish the cause of all CPU variability. Preserve both Phase 4 runs, compare controlled interventions and recheck the original full flow.

Work:

1. Move shared storefront navigation/footer into a suitable persistent route-group layout, preserving home-specific hero behavior and keeping checkout/admin chrome appropriate to their routes.
2. Use Link where suitable and add targeted intent-based prefetching for likely destinations. Measure production requests; do not prefetch the entire catalog or private data unnecessarily.
3. Defer optional cart drawer/sign-in UI bundles and expensive hidden content while preserving opening/closing behavior and accessibility.
4. Coordinate session restoration and cart bootstrap. Reuse the root AuthProvider in admin and deduplicate refresh work.
5. Introduce a read-only cart bootstrap path and create a new guest cart on first mutation when appropriate. Restore existing carts correctly and preserve abandoned-cart activity tracking deliberately.
6. Narrow client boundaries around static sections; defer optional components where the production bundle analysis shows value.
7. Lazy-load admin screens and the international Stripe payment UI. Bound/cancel payment-status polling on unmount or deadline without changing the meaning of payment success.

Primary files: route-group layouts, `SiteChrome.tsx`, `HomePage.tsx`, Commerce/Auth/Cart providers, cart API/controllers/service, `AdminApp.tsx`, `CheckoutClient.tsx`, `lib/api/checkout.ts`.

**Acceptance:** fresh non-shopping visits do not write a guest cart to the DB; returning/signed-in carts restore correctly; add/merge/switch-market flows remain correct. Admin starts one session restoration. Optional bundles are absent until needed. Local PayHere flows do not initialize Stripe UI. Payment polling stops when its consumer disappears.

**Verification:** guest/new/returning/expired-session scenarios; cart persistence, merge, quantity/coupon and market-switch tests; admin RBAC/sign-out checks; sandbox gateway flows; production bundle and request comparison; keyboard/focus checks for deferred dialogs.

**Local outcome (2026-10-01):** [Phase 5 results](./PHASE_5_RESULTS.md). Parallel Sol agents implemented shell, cart/backend and optional bundles; coordinator verified integration and repaired initial-session, ID, drain and reset-failure races before acceptance. Idle homepage visits perform one auth restore and one passive cart bootstrap, create no guest cart/cookie and omit catalog prefetch and optional runtime. Selected public focus/hover prefetch works, storefront chrome persists, dialogs preserve focus/animation, admin restores once and lazy-loads its screen, and local PayHere omits Stripe. Polling cancels with its consumer and clears only on authoritative confirmation. All 87 focused tests, 225 backend tests, 47 controlled checks, frontend production build/types/lint, backend types/build and 160 final principal steps pass. Home JavaScript transfer falls 170,386→160,321 bytes; admin/checkout gzip estimates fall 24.4%/6.8%. Cold Shop medians are 375/534 ms desktop/mobile. Warm mobile catalog/product/checkout medians improve to 282/296/199 ms, but catalog outliers reach 1.63–1.81 seconds without an observed placeholder; budgets remain open. Backend-wide existing lint cleanup, production CORS, real DB/auth/gateway and hosted acceptance remain Phase 8. Deploy the read-only bootstrap backend before its frontend and preserve Phase 4 cache rollout/configuration. Phase 6 local code is now verified; its remaining database/hosting acceptance is recorded below. Deployment has not started.

## Phase 6 — API, database and hosting latency

**Audit coverage:** PERF-19, PERF-21, PERF-22, PERF-27.

**Depends on:** Phases 0 and 4; use Phase 5 startup behavior for representative traffic.

Work:

1. Introduce compact card/list projections and preserve detail contracts. Use summary category data where useful.
2. Add progressive cursor pagination without making facet counts/filtering/search operate only on the currently downloaded page. Keep global sort order stable.
3. Measure slow product queries with representative staging data. Optimize price ordering in SQL with deterministic ties/cursors; reduce aggregate work only where plans/profiles justify it.
4. Verify existing FTS/trigram/FK indexes and add narrowly justified indexes via reviewed migrations. Compare result correctness and query plans before/after.
5. Inspect actual Next/API/Neon regions, cold starts, connection budgets and replica limits. Configure host placement/capacity based on measurements and provider constraints.

Primary files: product service/controllers and shared types, catalog/category loading, `backend/prisma` migrations, deployment configuration.

**Acceptance:** compact responses reduce bytes without removing UI-required fields; pagination/filter/sort results match full-data fixtures. Queries use appropriate plans at representative sizes. Migration/index installation is verified in staging. Cold/warm server and DB timings are recorded, including remaining provider constraints.

**Verification:** ordering/tie/cursor and market-price tests; facet/search correctness; safe staging query-plan analysis and bounded concurrency testing; deployed API latency percentiles. Apply production migrations only in the eventual approved release process.

**Local outcome (2026-10-02):** [Phase 6 results](./PHASE_6_RESULTS.md). Compact catalog and category/home projections, eight-card demand paging, global facets and deterministic SQL ordering/cursors are verified. The unchanged fixture initial catalog gzip estimate falls 58.6%; catalog JS grows 1.5%. All 93 frontend tests, 239 backend tests, 58 controlled browser checks, types/build and 160 principal steps pass. A footer flash is repaired through pending-state viewport reservation, with final home CLS 0.000622/0 desktop/mobile. Final cold Shop medians are 470/842 ms and warm mobile catalog/product/checkout are 516/598/321 ms, slower than Phase 5; feedback and release budgets remain open. Thirty-eight read-only plans and current-small-data cursor/filter comparisons pass, but the missing FTS trigger and fourteen NULL search vectors require the prepared, unapplied migration to be staging-tested and released through the approved procedure. No speculative indexes or aggregate counters were added. VPS provider is undecided; Singapore matches the configured database and is a candidate awaiting Sri Lankan network/capacity measurements. Production CORS and real hosted/auth/gateway acceptance remain Phase 8. Backend card/summary contracts must precede this frontend. Phase 7 and deployment have not started.

## Phase 7 — Measurement-led refinements and growth work

**Audit coverage:** PERF-17, PERF-18, PERF-20, PERF-26, PERF-28.

**Depends on:** Phases 0 and 4–6. Each sub-item gets an implement/defer decision based on measured cost.

Work:

1. Audit font usage; retain the brand families/styles and remove only unused variants. Scope admin CSS to admin and consider local font files for build reliability.
2. Sanitize unchanged rich text at a narrow server/content-version boundary; preserve HTML safety and invalidate sanitized output when content changes.
3. Replace broad search-index loading if it materially affects the current dataset; use cancellable debounced server search with complete results, not just autocomplete. Batch recipe-linked product lookups.
4. Use database aggregation/rollups and pagination for expensive admin analytics/listing workloads while preserving revenue/currency calculations.
5. Introduce a durable outbox/queue for email/revalidation where response delays justify it. Include retries, idempotency, failure reporting and operational ownership. Batch jobs and configure a single runner/leader for multiple API replicas.

**Acceptance:** implemented changes have demonstrated benefit and correctness. Deferred changes include the baseline evidence and a concrete revisit trigger, such as search-index payload exceeding its budget, dashboard p95 exceeding its budget, or adding a second API replica. A multi-replica release must resolve duplicate scheduled-job execution before launch.

**Verification:** typography/content snapshots; sanitization cases; complete search and recipe mapping fixtures; analytics totals/currency tests; queue retry/duplicate-delivery and job-concurrency tests where those systems are introduced.

**Local outcome:** [Phase 7 results](./PHASE_7_RESULTS.md). Initial CSS transfer falls 8,832→5,488 bytes; article/product gzip JS estimates fall about 11 KB each. Complete product/journal search, ingredient cards, analytics currency/status/UTC aggregation and scheduler ownership/retry corrections pass. Observed font bytes are unchanged. Final cold Shop medians are 371.5 ms desktop / 628.0 ms mobile; mobile feedback/outliers still leave timing budgets open. Deferred server-only search, admin table paging, rollups, local fonts, durable outbox and job batching have evidence and revisit triggers. Exactly one scheduler is required before adding a second API replica. Search migration remains unapplied. No Phase 8 work or deployment ran.

## Phase 8 — Staging validation and release readiness

**Audit coverage:** PERF-30, deployment blocker PERF-32, attribution blocker PERF-33 explicitly approved by the user for Phase 8, and final validation of PERF-01, PERF-13, PERF-23, PERF-27.

**Depends on:** Phases 0–6 passing and Phase 7 decisions recorded. All P0 findings must have passed their checks.

Work:

1. Build and deploy a staging candidate from the final reviewed source and intended non-production secrets/configuration. Confirm that runtime assets/config match the tested build.
   Resolve the existing backend production CORS rejection of no-Origin SSR requests (PERF-32), preserving browser-origin and write protections; test allowed/disallowed/absent/null Origin against the actual API. Clear the existing backend-wide lint failure before treating CI as a release gate.
   Add authenticated BFF visitor attribution from a controlled ingress, keep shared SSR cache keys and existing limiter budgets, and verify independent visitor buckets/spoof rejection/private bindings (PERF-33). Preserve verification-email routing, refresh cookies and raw gateway handling. Hosted proxy trust remains an acceptance requirement.
2. Repeat Phase 0 measurements under the same profiles and produce one comparison report. Add real-user Web Vitals reporting and server/API latency/cache metrics, without tokens, PII or full sensitive query strings in telemetry.
3. Verify CDN/static media versioning, public/private cache headers, compression, image transforms, actual regions and cold-start behavior on the host.
4. Run the full route/commerce regression matrix below. Use sandbox payment providers; do not run synthetic load against production customer data.
5. Resolve regressions and document remaining deferrals. Prepare the release/rollback runbook, including compatible frontend/API contracts and versioned media. Rehearse the previous release's ability to consume any changed API contract.
6. Present the tested candidate, measurement comparison, migration/configuration steps, remaining risks and rollback instructions for the deployment decision.

**Release check:** no unresolved P0 item; no design/market/auth/payment regression; project budgets met or explicitly reviewed with evidence; staging and rollback instructions complete. Deployment itself is a subsequent action.

**Local outcome (2026-10-02):** [Phase 8 results](./PHASE_8_RESULTS.md). Production CORS and full-backend lint are fixed locally. The user-approved signed BFF identity integrates actual existing visitor limits, private API binding and verification email/cookie compatibility without changing shared SSR cache keys. Opt-in Web Vitals/API/logical-read metrics, disposable 19-file SQL migration rehearsal, hosted read probes and a concrete proxy/release/rollback runbook are prepared. All 190 focused tests, 423 backend tests, 74 controlled browser checks, 59 disposable PostgreSQL checks, types/build/lint and 160 principal steps pass. Cold Shop medians are 469 ms desktop / 813.1 ms mobile; one warm mobile catalog sample takes 5.24 s and feedback budgets remain open. Instrumentation adds 657 bytes to initial route JS. No hosting is selected; actual ingress, supported-runtime remote candidate CI, populated Prisma repair, sandbox gateways/auth/media/concurrency/rollback and timing acceptance remain pending. No connected-database migration, deployment, commit or push occurred. [Open release gates](./PHASE_8_RELEASE_CHECKLIST.md) identify the remaining work.

## Proposed performance targets

Finalize the test profile and budgets in Phase 0. These are goals, not current achievements or promises of a fixed speedup.

| Metric | Target / interpretation |
| --- | --- |
| Navigation feedback | Visible response in roughly 100–200 ms on the selected test profile |
| Common warm navigation | Approximately 1 s or less to useful content on the selected profile |
| Initial hero behavior | Bounded frame queue/cache; no full-sequence download on an idle visit |
| Public API latency | Proposed warm p95 below 500 ms on staging; document dataset/region/load |
| LCP | Aim for ≤ 2.5 s at the 75th percentile of real-user measurements |
| INP | Aim for ≤ 200 ms at the 75th percentile of real-user measurements |
| CLS | Aim for ≤ 0.1 at the 75th percentile of real-user measurements |
| Payload/bundle size | Establish budgets from Phase 0 and enforce meaningful reductions/no regressions |

Lab browser checks provide pre-launch evidence; field percentiles require enough real-user samples after release. Web Vitals targets do not replace explicit navigation timing.

## Required regression matrix

Routes: home, catalog, product detail, categories, journal/article, recipes/detail, gifts, about/contact, search, account, cart, checkout/success/cancel; admin separately.

Scenarios: mobile/desktop; cold/warm load; first/repeated navigation; signed USD/LKR markets; new/returning guest; signed-in/expired session; empty/populated cart; rapid scroll/clicks; API delay/failure; navigation during loading; reduced motion; both sandbox payment gateways.

Check successful-page visuals against the Phase 0 screenshots. Check auth rotation, cart merge/coupons/market switching, private-data isolation, admin authorization, live checkout total validation, webhook idempotency and stock integrity using meaningful existing/focused tests. Run relevant type/lint/build checks for each affected package. Do not add tests that merely duplicate implementation structure.

## Audit-to-phase traceability

Primary implementation phase is listed below; subsequent phases may verify the same item.

| Audit ID | Primary phase | Audit ID | Primary phase |
| --- | --- | --- | --- |
| PERF-01 | 0 | PERF-16 | 5 |
| PERF-02 | 2 | PERF-17 | 7 |
| PERF-03 | 2 | PERF-18 | 7 |
| PERF-04 | 2 | PERF-19 | 6 |
| PERF-05 | 1 | PERF-20 | 7 |
| PERF-06 | 1 | PERF-21 | 6 |
| PERF-07 | 4 | PERF-22 | 6; initial check in 0 |
| PERF-08 | 4 | PERF-23 | 4 |
| PERF-09 | 4 | PERF-24 | 4 |
| PERF-10 | 5; groundwork in 1 | PERF-25 | 5 |
| PERF-11 | 3 | PERF-26 | 7 |
| PERF-12 | 3 | PERF-27 | 6 |
| PERF-13 | 3 | PERF-28 | 7 |
| PERF-14 | 5 | PERF-29 | 5 |
| PERF-15 | 5 | PERF-30 | 8; foundation in 0 |
| PERF-31 | 1; discovered in 0 | PERF-32 | 8; deployment blocker discovered in 4 |
| PERF-33 | 8; approved BFF visitor attribution | — | — |

## Phase outcome template

Record after each implementation phase:

- Status: planned / in progress / checks passed / reviewed / deferred with evidence.
- Changes and affected audit IDs.
- Before/after results with build/environment/profile identifiers.
- Relevant functional tests, production build, and screenshot checks.
- Remaining items, dependencies and measured deferrals.
- Rollback steps and any compatibility/configuration implications.

## Phase 0 outcome — 2026-09-30

Measurement tooling, signed market/public fixtures, isolated production build, read-only database checks and a GitHub browser smoke workflow are implemented. Five cold/warm repetitions per desktop/mobile profile are captured in [Phase 0 results](./PHASE_0_RESULTS.md), including failures. Production build checks passed; browser checks expose navigation timeouts and home hydration recovery, rather than providing a green release gate.

Warm mobile median clicks took 4.73 s to catalog, 4.31 s to product and 2.79 s to checkout. All ten cold Shop transitions exceeded the 15-second observation deadline. Mobile starts 41 desktop frames alongside 152 mobile frames; desktop initiates all 192 frames. Principal screens were inspected through separately labeled direct arrivals when navigation failed. Two mobile supplementary arrivals timed out and reduce their successful sample counts.

Migration verification found all 18 local migrations and eight expected performance indexes installed. Phase 6 now records thirty-eight actual read-only plans; representative-scale/staging analysis and the newly discovered search-vector repair remain pending. The workflow has not run remotely; live staging latency/hosting, authenticated roles, gateway sandbox flows and field observability remain release checks. Budgets are provisional/report-only.

Next application implementation step: Phase 1, followed by Phase 2's hero loader. Phase 0 applies no application performance fixes and does not authorize deployment.
