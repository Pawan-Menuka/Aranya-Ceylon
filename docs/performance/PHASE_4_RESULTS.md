# Phase 4 — Public data caching and primary content streaming

Implemented and functionally verified locally: 2026-10-01, Asia/Colombo. Covers PERF-07, PERF-08, PERF-09, PERF-23, PERF-24 and the optional-content portion of PERF-05. Two Sol sub-agents implemented public caching and backend invalidation; the coordinator integrated rendering, tests, browser checks and reviewed the combined changes. Navigation timing remains variable and some medians regress versus Phase 3; budget acceptance is open. Phase 5 has not started. No commit, push or deployment was performed.

## Changes

Public reads use a separate allowlisted fetch path. With the server-only `MARKET_COOKIE_SECRET` configured, Next verifies the original signed market cookie, including its expiry, and sends a deterministic signed market-only cookie upstream. Resource, sorted query parameters and verified market define the shared data cache identity. Login, refresh and guest-cart cookies and authorization headers are excluded. Invalid market signatures default to international, matching the API. The canonical cookie is internal to the Next-to-API request and is never issued to a browser.

Products and journal data use a 300-second TTL, categories 600 seconds, recipes and gifts 3,600 seconds. Resource/detail tags cover product dependencies in category, recipe and gift responses. Missing `MARKET_COOKIE_SECRET` retains uncached reads with only the original market cookie forwarded. Private server/browser reads always use `no-store`, including when a caller supplies cache hints. Page HTML remains dynamic, with request-specific CSP nonces and private/no-store responses.

The revalidation endpoint accepts an authenticated, validated batch of up to 32 public paths, invalidates dependent data tags and paths, and retains the legacy single-path GET contract. Invalid batches are rejected atomically. Backend product create/update/archive/image changes invalidate detail identities, home/catalog/category/search and product-dependent recipe/gift views. Slug changes include both identities. Journal, recipe, gift and scheduled-publication changes also invalidate their affected public views. A batch uses one body-inclusive three-second request budget; failure logs only sanitized status/count/failure-class information and falls back to TTL. It does not undo a committed mutation.

Invalidation runs even when audit logging fails after a successful mutation. Independent image writes and scheduled publications finish before invalidating any committed successes; partial failures retain their original error. No stock/payment transaction was changed. Display caches do not replace checkout's live authoritative price and stock checks.

Product/article metadata and pages share only their primary record through React request memoization. Recommendations load in separate server Suspense slots within the existing client presentation. Empty optional lists remain empty in production; failed optional content can be omitted. Successful empty catalog lists and removed/archived product/article identities no longer resurrect demo records. Explicit demo mode retains its demo behavior. Successful section markup, styling and market-reactive product cards are preserved.

The backend now sends `private, no-cache` plus Cookie/Authorization Vary and Express conditional ETags for allowlisted public reads; other routes are `private, no-store`. The BFF gzips eligible public JSON over 1 KB when the browser accepts gzip, preserving market/cookie/private semantics. It respects explicit gzip refusal and `no-transform`, preserves 304 Vary/weak validators, and drops upstream lengths after fetch decoding. Private, cookie-bearing and non-JSON responses are excluded. This optimizes browser delivery; backend-to-Next JSON and hosted CDN behavior still need separate measurement.

## Controlled verification

Eight Phase 4 checks pass against the actual isolated Next production server:

- Two distinct local guests with different signed-cookie expiries share one primary API read; the second guest adds **zero** reads. International pricing creates a separate entry. Upstream public reads contain only `x-market`, and initial structured prices are LKR/USD as appropriate.
- A tampered market token defaults to USD. Separate requests have fresh CSP nonces that match their bootstrap scripts. HTML is private/no-store.
- Three private fixture cart reads all reach the API and return three fresh in-memory cart IDs, with Set-Cookie relay intact.
- Product edit, rename and archive refresh both markets and their lists after invalidation. The old identity and archived detail/listing disappear. Mutations affect only the fixture's in-memory catalog and are restored.
- With recommendations delayed by **3,000 ms**, primary product HTML/metadata arrives in **56 ms**, article in **42 ms**; complete responses take **3,068 / 3,071 ms**. Browser primary content appears in **308 / 230 ms**, before document completion. Metadata and page use one primary read each. These unthrottled fault checks are separate from principal timings.
- Public catalog JSON decodes correctly after gzip: **25,059 → 4,491 wire bytes**, an **82.1%** reduction. This fixture response intentionally remains no-store; backend conditional cache policy has separate HTTP tests.
- Product/article hydrate without page errors; successful related sections retain their presentation. The frozen dataset contains one article, so the check first verifies an empty related list remains empty, then temporarily adds a second article in memory to verify the visible section. The principal dataset is unchanged.

Earlier regression checks pass again: six timeout/retry checks, twelve hero scheduling/lifecycle checks and nine media checks. All **35 controlled browser checks** pass. Media coverage includes no-JavaScript images, responsive variants, unique poster preload, immutable headers/conditional reuse, public Cloudinary display and opt-in editor persistence through an in-memory bridge. Hero bounds remain four initial frames, two pending operations, a 12-index window and 16 decoded frames. Visibility/data-saving retain their documented headless simulations.

Desktop primary/related screenshots were inspected alongside Phase 3. The fixture article's missing photograph/empty-slot artwork already existed in Phase 3. Original media, successful layouts/crops and the existing mobile navbar/gallery geometry are retained.

## Principal measurements

The production build and two full same-source benchmark repetitions use Node **20.20.2**, Next 14.2.35, React 18.3.1, Playwright 1.62.1 and Chrome 154.0.8037.58. Profiles and public dataset match Phase 3: desktop 1440×900/DPR 1, 20 ms/10 Mbps/CPU 1×; mobile 390×844/DPR 2, 80 ms/4 Mbps/CPU 4×. Each repetition uses five cold/warm browser runs per profile. Server/data/image-transform caches are warm; these are not cold-server/hosted API measurements. Home observation is six seconds and navigation deadline remains fifteen seconds.

Both Phase 4 runs pass **160 principal steps each**, with zero navigation failures or browser page errors. The first run and same-build repeat are both retained. No passing sample is substituted for a timeout. The repeat confirms variable timings and some regressions; it does not establish a consistent navigation speedup.

| Median, milliseconds | Phase 3 | Phase 4 first run | Phase 4 repeat |
| --- | ---: | ---: | ---: |
| Desktop cold Shop | 339.2 | 337.3 | 336.4 |
| Mobile cold Shop | 466.5 | 601.4 | 608.8 |
| Desktop warm catalog / product / checkout | 74.5 / 89.2 / 85.9 | 328.7 / 74.7 / 66.6 | 336.5 / 90.6 / 85.9 |
| Mobile warm catalog / product / checkout | 248.1 / 360.4 / 277.5 | 624.6 / 790.3 / 638.5 | 553.8 / 385.9 / 275.8 |
| Desktop home LCP, cold / warm | 356 / 140 | 380 / 184 | 432 / 124 |
| Mobile home LCP, cold / warm | 1,256 / 228 | 1,448 / 424 | 1,520 / 376 |

Repeat cold Shop ranges are **69.3–341.8 ms desktop / 284.8–3,421.4 ms mobile**. All twenty cold Shop trials across the two Phase 4 runs remain below the original 15-second deadline, but the mobile spread needs attention. Repeat warm mobile catalog/product/checkout ranges are **248–2,835 / 342.8–1,268.3 / 209.3–725.7 ms**. Loading feedback reaches **1,943.4 ms** in the repeat and **3,417.7 ms** in the first run, exceeding the provisional 200 ms target. Repeat cold home LCP spans **372–2,464 ms desktop / 932–4,348 ms mobile**. Median/functional passes are not a green release-budget result.

Cold home transfer medians are **2,309,694 desktop / 1,542,044 mobile bytes** in the repeat, versus **2,298,315 / 1,526,432** in Phase 3 (+0.5% / +1.0%). Four correct-viewport frames and hero/poster bytes remain unchanged; no mobile desktop-frame downloads appear. The extra completed prefetch chunk shifts bytes into home observation rather than representing a new photograph/frame queue. Repeat cold-home long-task duration median is **994 ms mobile**, versus **358 ms** in Phase 3. SPA task arrays remain cumulative, so they do not isolate transition CPU cost.

The code and waterfall review found no new continuous client loop or server-verification code in browser chunks; server market-secret/verifier identifiers are absent from compiled static chunks. Prefetch now finishes additional catalog work during startup. This accounts for the measured extra script transfer, but does **not** prove it explains all CPU/timing variability. Shared-host noise and startup scheduling have not been causally isolated. Record a Phase 5 trigger: profile startup/prefetch CPU and perform controlled comparisons before changing navigation/prefetch behavior; recheck all profiles and retain slow samples. Functional Phase 4 acceptance is complete; PERF-05/30 timing and release budgets remain open.

Home/page manifest gzip estimates barely change versus Phase 3: home **146,132 → 146,162**, catalog **139,332 → 139,362**, product **156,083 → 156,130**, article **146,027 → 146,064 bytes**. The first run's observed cold-home JavaScript transfer increases **160,649 → 170,386 bytes** because a **9,707-byte catalog page chunk** now arrives through existing Link prefetch during home observation; the remaining difference is the small shared chunk change. This is confirmed by the initial-load waterfalls. It is not a new 10 KB home module. Bundle/startup/prefetch reduction remains Phase 5.

## Tests and build checks

- Frontend production compilation, types and lint pass. Two existing AdminProducts warnings and the optional Sharp warning remain.
- **44 focused tests across eight files** pass: request/deadline/refresh behavior, hero/motion/media generation, public-cache identity/isolation/fallback/private safety, atomic authenticated invalidation, decoded proxy framing and gzip/conditional semantics.
- **196 backend tests across 17 files** pass, including existing auth/cart/payment/stock coverage and new mutation/audit/partial-failure/scheduled invalidation and actual in-memory Express conditional-response tests. No live database or external write is used.
- Backend types and production TypeScript build pass. Changed production files lint without errors/warnings; the changed gift test file retains 25 explicit-any warnings. The full backend lint has a pre-existing error: unused `_userId` at `src/controllers/order.controller.ts:62`, identical in HEAD, plus 119 warnings recorded by the backend agent. This is a release cleanup item, not a passing lint gate.
- All four controlled browser runners are included in the performance CI workflow. Remote CI was not run. Focused tests, backend tests/types/lint and recovery/hero/cache checks use sandbox Node 24.19.0; principal build/benchmark and media checks use Node 20.20.2.

The isolated component fixture route exists only in `.performance-build`, with its separate fingerprint; it is absent from the live app. The developer's `.next` and environment secrets are untouched. Original source media is unchanged; generated media output from Phase 3 must still accompany deployment. Final frontend SHA-256 is `7fc1d271fe482bfdea213c2e8ac37790aa1f8456930117307b61d4e338c18a2a`; public API fixture remains `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138` and isolated media fixture remains `1619cd5028994339ff9657a8e2744c8c960c0f609ec244bce8e42da0504f8d66`. Twenty-three frontend paths differ from Phase 3; all original photography/frame hashes match. Backend snapshots cover fifteen Phase 4-owned production/test paths and include any pre-existing edits in those files; they are not blanket attribution of every hunk to Phase 4.

## Configuration and release limits

Set Next's **server-only** `MARKET_COOKIE_SECRET` to the backend `COOKIE_SECRET`. Without it, shared caching remains disabled. Never use a NEXT_PUBLIC variable for this secret. Both deployments need the same `REVALIDATION_SECRET`, and the first origin in backend `FRONTEND_URL` must reach the intended frontend invalidation endpoint. Actual local/deployment secrets were not read, copied or configured; all isolated checks use synthetic fixture values.

For a staged rollout, deploy the new frontend POST revalidation endpoint with shared caching disabled, deploy the invalidation-aware backend, verify the hook, then enable the matching frontend market secret. A coordinated rollout can deploy both together. Rotate backend/frontend market secrets together, or temporarily disable caching. Revalidation failure permits stale display data until TTL, while checkout continues to validate live data.

Phase 4 review identified **PERF-32**, an existing production deployment blocker: backend CORS rejects requests without Origin outside development, while Next server API fetches omit Origin. The fixture does not reproduce that policy. Define and test the actual server-to-server policy without weakening browser-origin/write protections before release. The separate pre-existing backend-wide lint failure also needs cleanup. Both are recorded in the root audit/plan; no security policy was changed in this phase.

Staging remains responsible for real API/DB latency, production CORS, cache hit telemetry/replica behavior, authenticated market/cart flows, token rotation, gateway sandbox/webhook/stock checks, CDN compression/304 behavior, real-device presentation and calibrated budgets. Anonymous fixture gates do not establish real account/admin/payment acceptance.

## Artifacts and rollback

Frozen evidence: `artifacts/performance/phase-4-2026-10-01/`, including production/browser summaries, exact source/tooling/fixture snapshots, backend source manifest and test evidence, all 35 controlled checks, traces/waterfalls/screenshots and both principal runs. Earlier frozen phases are preserved. Stale failure screenshots are excluded. Generated evidence is gitignored.

Rollback only Phase 4 source/tooling hunks; retain Phases 1–3 and unrelated existing work. Disable shared caching by unsetting the frontend market secret when rolling back backend invalidation, and retain compatible endpoint contracts during the change. No migration or dependency/lockfile change was introduced.
