# Cold Shop transition diagnosis

Date: 2026-09-30. Status: investigation complete; application fix remains Phase 2. The normal application still fails the 15-second cold Shop check.

The same-build comparison identifies the hero frame subsystem as the cause of the reproduced local cold Shop stall. The catalog data arrives, but the JavaScript needed to render the catalog remains waiting while the existing hero download queue continues after leaving home. Blocking frame delivery removes the stall in all ten comparison visits.

## Controlled comparison

| Profile | Hero frames enabled | Hero frames blocked |
| --- | --- | --- |
| Desktop, five cold visits | 5/5 exceed 15 s | 5/5 complete; median **338 ms**, range 328–348 ms |
| Mobile, five cold visits | 5/5 exceed 15 s | 5/5 complete; median **506 ms**, range 445–1,619 ms |

All 20 visits use fresh browser contexts, the same isolated Phase 1 production build, warm server caches, the same public fixture and the original desktop/mobile network/CPU settings. Arm order alternates each repetition. Home is observed six seconds after DOM readiness; USD/LKR alternates across repetitions. The 15-second deadline is unchanged. A successful transition requires catalog content/product links and no loading/error state. Failed visits receive no successful timing or fallback arrival. No page errors occurred.

Native Chromium frame blocking preserves the browser's normal cache configuration. Playwright interception was avoided because it [disables HTTP cache](https://playwright.dev/docs/api/class-browsercontext#browser-context-route). This intervention prevents frame callbacks/decoding as well as transfers. The attribution is to the frame subsystem; the detailed waterfall narrows the observed failure to the route JavaScript waiting for delivery.

## Where the wait occurs

The desktop first-run waterfall shows:

1. The Shop click is accepted, the URL becomes `/products`, and its loading state appears in about **18 ms**.
2. The full navigation data request transfers **20,531 decoded bytes** and completes in **216 ms** from request initiation. This is distinct from the earlier loading-only prefetch.
3. The catalog JavaScript chunk, `/_next/static/chunks/app/products/page-e32d55fbe07154e8.js`, is requested about **281 ms** after the automation begins clicking. It starts at browser priority `Low`; its response has not begun and zero bytes arrive by the 15-second observation deadline. The same chunk remains pending in **all ten enabled-frame trials**.
4. There are **175 hero frames unfinished at that first desktop click**, and **102 still unfinished at the deadline**, despite the hero having unmounted. Across all enabled-frame trials, median unfinished frames at click are **176 desktop / 189 mobile**; the deadline still finds 102–104 desktop / 138–140 mobile frame requests unfinished.
5. With frames blocked, that same catalog chunk completes in **31–46 ms desktop / 104–267 ms mobile**. The page renders in every visit.

In the first mobile enabled visit, the navigation data arrives in roughly one second, while the catalog chunk again receives no response by the deadline. The screenshot still shows the catalog loading shell, rather than a completed catalog or a server error.

Chrome timeline traces were captured for the first repetition in each profile/arm. The enabled visits show no post-click long tasks in the observer. The largest recorded renderer-main duration event during those traced waits was **5.8 ms desktop / 30.7 ms mobile**; these are duration events, not whole-task CPU totals. The traces and pending chunk support request starvation as the principal observed stall, rather than 15 seconds of continuous JavaScript execution. Rendering costs after assets arrive still remain measurable; the first traced mobile blocked visit takes 1.62 seconds.

The fixture's 28 `/products` handlers average **0.44 ms** and all complete within **0.91 ms**. This confirms the fixture is not introducing the wait. It does not measure real database/API latency or prove the deployed backend needs no optimization.

## Recommended next action

Proceed with Phase 2, prioritizing the loader work already in the plan:

- Replace the bulk idle preload with a small demand-driven frame window and explicit concurrent-download/cache bounds.
- Resolve desktop/mobile selection before starting frame requests.
- Stop new work when leaving home; abort obsolete in-flight transfers where possible and release frame resources. Keep the current poster/animation presentation.
- Repeat the original full desktop/mobile benchmark with real frame loading, keeping the 15-second failure check. Verify catalog JavaScript no longer waits behind the frame queue, including navigation during scrolling.

The diagnostic does not justify increasing the timeout, forcing hard reloads, disabling the animation in production or indiscriminate route prefetching. A separate emergency application patch is unnecessary before starting the planned Phase 2 loader fix. The blocked-arm result is diagnostic evidence, not a passing release build. Hosting transport/cache behavior and real API latency require staging confirmation; the exact local timings are not deployment guarantees.

## Reproduction and artifacts

Run `node scripts/performance/shop-diagnostic.mjs` from the repository root with the same Playwright environment described in [the README](../../scripts/performance/README.md). A current isolated build is required; the runner refuses source/fixture/port mismatches and occupied ports. Application source was not edited during this investigation, and no real authentication, order, payment, email or database activity was performed.

Raw evidence is retained in `artifacts/performance/shop-diagnostic-2026-09-30T17-44-23-703Z/`: all 20 samples, summaries, sanitized per-visit request waterfalls, four Chrome timeline JSON traces, screenshots, fixture handler timings, source/runtime/config fingerprints, chunk analysis, server output and the exact runner copy. Traces can be imported in Chrome DevTools Performance. Headers/cookie/token fields and URL queries are excluded. Tracing and screenshots add overhead to the first repetition; host background load was not isolated.

Frontend source SHA-256 remains `e57f784913bea776f1cf679e668bfee164fb1cc3fdf516d8fac9e858e325a8f3`; fixture SHA-256 remains `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138`. Phase 0 and Phase 1 frozen artifacts were not overwritten. Diagnostic syntax and diff whitespace checks pass; owned browser/API/Next processes have been closed. No deployment or Phase 2 application implementation was performed.

## Implementation follow-up — 2026-10-01

[Phase 2 is now implemented and locally verified](./PHASE_2_RESULTS.md). The unchanged 15-second principal check passes all ten cold Shop clicks with real frames enabled (desktop median 347 ms, mobile 437 ms), and idle startup requests four correct-viewport frames. The historical diagnostic results above remain preserved. Staging/device acceptance and later planned media/caching/startup work remain pending.
