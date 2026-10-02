# Phase 2 — Hero loading and animation scheduling

Completed locally: 2026-10-01, Asia/Colombo. Covers PERF-02, PERF-03 and PERF-04. The original cold Shop failure is resolved in the five-run production fixture comparison: all ten cold clicks complete with real frames enabled, versus all ten exceeding 15 seconds in Phase 1. Staging/device acceptance remains pending.

## Changes

- Resolve the viewport before starting frame requests; an idle visit loads four frames from the correct folder.
- Prioritize the target and nearby playback frames. Cap pending fetch/decode operations at two, the desired window at 12 indices, and retained decoded frames at 16. Release evicted bitmaps. These are current resource bounds, not total-download limits over a scrolling visit.
- Abort obsolete, paused and unmounted fetches. Each frame has an eight-second fetch/body budget. Native bitmap decoding cannot be interrupted; an aborted decode keeps its slot until it settles, then closes any late result. Resizing uses the same bounded loader across generations.
- Paint the nearest available frame while catching up, retain the poster for missing frames and at rest, and defer hidden canvas painting until scrolling. Keep the existing assets, cover crop, frame mapping, smoothing, final-frame hold, dust design and text reveal.
- Stop frame interpolation when settled. Pause downloading/dust/frame work offscreen, while hidden or in static mode. Reduced motion and data saving use the poster. Visible dust continues its intended animation.
- Update continuous hero/text styles through refs; cache hero dimensions until resize. Navbar React state changes only when direction/appearance thresholds change, with animation callbacks/listeners cleaned up.

Frontend implementation: `HeroCanvas.tsx`, `hero-frame-loader.ts`, `hero-motion.ts`, `HomeHero.tsx`, `HeroTextOverlay.tsx`, `Navbar.tsx`, and two static-mode animation rules in `globals.css`. No backend or data-contract change was needed for this phase.

## Comparable measurements

Same fixture, production build mode, Node 20.20.2 / Next 14.2.35 / React 18.3.1, Playwright 1.62.1 and installed Chrome 154.0.8037.58 as the Phase 1 principal benchmark. Five repetitions per profile, each with cold and warm browser-cache flows. Desktop: 1440×900, DPR 1, CPU 1×, 20 ms/10 Mbps. Mobile: 390×844, DPR 2, CPU 4×, 80 ms/4 Mbps. Servers and server data caches are warm. Home observation remains six seconds after DOM readiness; the click deadline remains 15 seconds. Controlled browser/unit checks use the bundled Node 24.19.0 against the same isolated build; this runtime difference is separate from the matched Phase 1–2 principal comparison. Phase 0 used Node 24.19.0, so comparisons to that earlier phase also have a runtime difference.

| Click-to-content | Phase 1 median | Phase 2 median | Phase 2 range |
| --- | ---: | ---: | ---: |
| Desktop cold Shop | All 5 exceeded 15 s | 347 ms | 84–349 ms |
| Mobile cold Shop | All 5 exceeded 15 s | 437 ms | 263–476 ms |
| Desktop warm catalog | 1,884 ms | 78 ms | 68–85 ms |
| Desktop warm product | 1,291 ms | 86 ms | 67–1,311 ms |
| Desktop warm checkout | 731 ms | 95 ms | 81–128 ms |
| Mobile warm catalog | 4,252 ms | 278 ms | 233–859 ms |
| Mobile warm product | 4,671 ms | 381 ms | 352–1,088 ms |
| Mobile warm checkout | 2,980 ms | 208 ms | 197–265 ms |

All 160 recorded screen/interaction steps pass; the full command exits **0**, with no failed-click fallback and zero page errors. Ten mobile home observations initiate **zero desktop frames**. Idle hero requests fall from median **192 desktop / 193 mobile to four each**. Median outstanding requests across the home page fall from **177 / 189 to one**; that metric counts all page requests, not only frames. Controlled idle checks finish with four cached frames and zero active frame operations.

Completed cold hero transfer bytes in the six-second observation fall from 5,581,193 → 1,949,405 desktop and 1,332,853 → 1,179,757 mobile. Phase 1 left most initiated frames pending, so its completed-window bytes substantially understate its scheduled traffic. These values do not describe full sequence size or a visitor who scrolls the entire animation. Warm completed hero transfers are median 485 bytes in both profiles with browser-cache reuse.

Cold home lab LCP medians improve from **648 → 356 ms desktop** and **1,956 → 1,356 ms mobile**. Warm desktop LCP rises from 96 → 160 ms; warm mobile changes from 360 → 292 ms. Cold home long-task duration medians change from 109 → 0 ms desktop and 1,108 → 525 ms mobile. These small lab samples include host variation: desktop first cold LCP is 2,416 ms, and mobile cold LCP reaches 4,576 ms with 3,282 ms of long tasks. Warm mobile has a 2,248 ms home long-task outlier. SPA long-task arrays are cumulative within a document and do not isolate each transition's CPU work.

Catalog/product/checkout loading-feedback medians are 20/18/17 ms desktop cold and 71/178/36 ms mobile cold; warm medians are 20/19/17 ms desktop and 81/159/37 ms mobile. Individual feedback samples reach 897 ms. The provisional 200 ms feedback and 2,500 ms LCP targets are **not consistently met**, despite the resolved Shop stall. Timing budgets remain report-only pending Phase 8.

Unique layout/page gzip JS estimates increase slightly: home 139,789 → 141,523 bytes (+1,734); catalog 134,405 → 134,466 (+61). These estimates exclude later dynamic resources. Phase 2 primarily removes competing media work; bundle/startup work remains planned separately.

Frontend SHA-256: `6be4cb14f2155a2ce4f26a112a0027cc1347dac38b7f73ef38bef1b5f3a9aee6`. Fixture SHA-256 remains `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138`. Comparing per-file manifests with Phase 1 identifies exactly the seven intended frontend paths above; other pre-existing frontend edits retain their prior hashes.

## Verification

- Production build, frontend types and lint pass. The two existing AdminProducts lint warnings and optional Sharp warning remain.
- All **18 tests across two files** pass: 11 existing request/BFF checks plus seven loader/motion tests for priorities, concurrency/cache bounds, pause/reverse/failure behavior, late decode release, generation reset and subscription cleanup.
- All **12 real-frame browser checks** pass on the final build: idle, rapid forward/reverse scroll, full brand reveal, navbar thresholds, offscreen pause, responsive folder switching, visibility pause/resume, navigation away during delayed loading, fresh mobile startup, reduced motion, data saving and missing-frame fallback. Observed maximum cache/pending operations/window is **16 / 2 / 12**; settled interpolation stops. Visibility simulation starts with two pending operations and pauses to zero. Leaving home cancels two pending requests and starts zero after catalog arrival.
- All **six Phase 1 controlled browser checks** pass again: hydration, delayed/interruptible navigation, explicit retry, unavailable-session gating, primary product retry, and the real BFF deadline.
- Full five-run principal flows pass with frames enabled. Desktop idle/reverse/brand and mobile screenshots were inspected against the existing presentation. Existing mobile navbar clipping remains as recorded in Phase 1; this phase preserves the layout. A sanitized Chrome forward/reverse scroll timeline is retained separately from benchmark timings.

Visibility used injected `document.hidden`/`visibilitychange` because headless tab switching did not produce native hiding. Data saving used injected `navigator.connection.saveData`; reduced motion used browser emulation. Missing-frame interception is confined to that fault check. Real background tabs, device data-saving settings and additional browser compatibility remain staging checks. No new backend changes were made; its 134-test result belongs to Phase 1 and was not rerun for this frontend phase.

## Scope, artifacts and remaining work

This is a local public-fixture frontend comparison, not a deployed API/database or real-phone measurement. Payments stop at checkout arrival; no customer/admin sign-in, email, database write or gateway submission occurs. Remote CI and authenticated/payment sandbox acceptance have not run. Source/fixture guards prevent the hero runner from accidentally checking a stale isolated build; each runner owns and closes only its own ports/processes.

Raw evidence is frozen in `artifacts/performance/phase-2-2026-10-01/`: environment/source manifest, current build fingerprint/log, full browser/HTTP/network/summary/bundle records, 16 principal screenshots, 12 hero checks/screenshots/scroll trace, six controlled checks, verification manifest, and exact runner/test/fixture files. Stale failure screenshots from earlier attempts are excluded. Phase 0, Phase 1 and Shop diagnosis artifacts are preserved. Generated artifacts remain gitignored.

PERF-02/03/04 are done locally with staging acceptance pending. PERF-05 remains partial because feedback outliers and optional-content streaming need later work. Phase 3 responsive photography/poster discoverability/media caching is next; subsequent caching/startup/infrastructure phases and the Phase 8 release gate remain planned. Phase 3 and deployment have not started.

For rollback, revert only Phase 2 hunks in the seven frontend paths and its hero tests/runner/CI/package script additions. Keep Phase 1 deadlines, loading/error/retry and hydration fixes, as well as unrelated existing account/admin/catalog/image/backend changes. No commits, migration or deployment was performed.
