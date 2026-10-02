# Phase 5 — Startup, shared navigation and optional JavaScript

Date: 2026-10-01. **Done locally; staging and release-budget acceptance remain pending.** Covers PERF-10, PERF-14, PERF-15, PERF-16, PERF-25 and PERF-29. Phase 4 has no remaining local implementation requirement before this phase. Phase 6 has not started.

Three Sol agents worked on independent shell, cart/backend and optional-bundle ownership; the coordinator reviewed integration, reproduced races, corrected request accounting and verified the final source. Existing successful-page design, source photography, crops and hero animation remain intact.

## Final implementation

- Storefront routes share one persistent route-group navbar/footer; public URLs are unchanged. Hero appearance resets per pathname, including streamed/retried content. Checkout/admin retain their appropriate headers. HomePage is now server composition; interactive market/animation sections retain their client behavior.
- Navbar, footer, card and homepage links avoid the viewport prefetch sweep. An eligible public route prefetches after 150 ms hover or keyboard focus, with 30-second deduplication and at most 32 retained keys. Private routes are excluded. Browser checks prove no idle catalog/category request and a selected Shop focus request; the hero CTA ref and styling are preserved.
- Cart drawer/sign-in runtime loads on demand. Requested dialogs retain closing/form behavior, contain keyboard focus, support Escape and restore trigger focus. Their component runtime is absent on a fresh visit; shared libraries required by ordinary pages are accounted separately.
- Auth restoration precedes read-only cart bootstrap. Admin reuses root auth. Backend GET /cart/bootstrap returns an existing hydrated basket or null without creating a cart, issuing a guest cookie, or renewing abandoned-cart activity. Empty totals are also passive. Validated first adds create guest identity; legacy GET /cart remains compatible with older clients.
- Initial shopping intent survives first returning-user session resolution. Matching-owner fallback cannot import another owner's stored basket. Established account changes cancel stale work. Guest adds serialize cookie creation; login drains queued/debounced writes before merge and publishes the user afterward. Bootstrap reconciles server quantity/item IDs before later ID-dependent edits. Market resets enforce clear → add → bootstrap; passive reads do not retry failed resets, while a later explicit action may retry once.
- Shopping mutations deliberately renew recovery activity. A failed post-commit tracking update logs fixed diagnostic text and preserves the successful item mutation and first guest cookie; its recovery timestamp can remain stale on that failure. Checkout price/stock enforcement and payment transactions are unchanged.
- Admin requests the selected screen bundle. Stripe's pure loader and Elements UI are deferred until a Stripe intent exists; local PayHere does not initialize Stripe. Payment polling has caller cancellation and a body-inclusive 20-second total budget. Order replacement/unmount ignores late results; only an authoritative confirmed status clears the cart. Timeout remains unconfirmed.

## Verified candidate

| Evidence | Result |
| --- | --- |
| Focused frontend tests | 87/87, 11 files |
| Backend tests | 225/225, 18 files; mocked database/services |
| Controlled browser checks | 47/47: 6 recovery, 12 hero, 9 media, 8 cache/streaming, 12 startup/commerce |
| Principal browser flow | 160/160 steps, zero functional failures/page errors; five cold/warm repetitions per desktop/mobile profile |
| Frontend production build | Passed, including fresh isolated route types and lint; two existing AdminProducts warnings |
| Backend types/build | Passed; changed production files and new controller test lint clean |
| Other existing lint | Changed legacy service test retains 16 any warnings. Backend-wide order.controller.ts:62 unused _userId error remains the Phase 8 cleanup item recorded in Phase 4. |

The coordinator caught and tested unready-session drain deadlock, post-login ID races, first-session add/market-reset loss and reset-failure recovery before acceptance. A real React browser case delays the initial synthetic user response, clicks Add, then verifies exactly one user-cart write before bootstrap. Unit cases cover clear → add → bootstrap, owner isolation, sign-out, stale work, quantities, coupons and offline behavior. Synthetic admin roles test denial/sign-out; payment intents/status responses and PayHere form submission are fulfilled locally. No live account, database, email, job or gateway is exercised. Real rotation/merge and both sandbox gateways remain staging acceptance.

Production/measurement Node: v20.20.2; unit/backend Node: v24.19.0. Browser: 154.0.8037.58; profiles/network/CPU/cache methodology match Phase 4. The user's development .next is untouched; old generated validators there can reference moved routes, while the isolated build validates the new route tree.

- Before frontend SHA-256: `7fc1d271fe482bfdea213c2e8ac37790aa1f8456930117307b61d4e338c18a2a`.
- After frontend SHA-256: `b499c5bad3be979b79b7399ae94aa82372af433653c112e86562fd592273d86a`.
- Catalog fixture: `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138` (unchanged).
- Fixture server: `3cc66dcfbe5f9c81b9ee3973ecad4a3d0824d6912c6000e09c61ffd4736ecde1` (updated for read-only bootstrap and shopping semantics; never a live API).
- Media component fixture: `1619cd5028994339ff9657a8e2744c8c960c0f609ec244bce8e42da0504f8d66` (unchanged).

## Same-profile measurements

Cold Shop, milliseconds. Both profiles pass the original 15-second deadline with real hero frames and normal networking.

| Profile | Phase 4 median | Phase 5 median | Phase 5 range |
| --- | ---: | ---: | --- |
| desktop | 336.4 | 374.5 | 355.1–378.6 |
| mobile | 608.8 | 533.7 | 529.3–716.5 |

Warm click-to-content, milliseconds. Markers include automation polling and do not wait for every image to finish.

| Destination | Phase 4 median | Phase 5 median | Phase 5 range |
| --- | ---: | ---: | --- |
| desktop → catalog | 336.5 | 74.7 | 70.5–357.9 |
| desktop → product | 90.6 | 62.1 | 53.8–146.5 |
| desktop → checkout | 85.9 | 80.6 | 78–82.3 |
| mobile → catalog | 553.8 | 281.8 | 274.1–1,805.3 |
| mobile → product | 385.9 | 295.7 | 289.8–431.3 |
| mobile → checkout | 275.8 | 198.9 | 195.1–201 |

Cold home medians. Completed bytes are the observation window, rather than total eventual page weight. Long tasks use home observations; later SPA records are cumulative.

| Metric | Desktop Phase 4 | Desktop Phase 5 | Mobile Phase 4 | Mobile Phase 5 |
| --- | ---: | ---: | ---: | ---: |
| Completed JavaScript bytes | 170,386 | 160,321 | 170,386 | 160,321 |
| Completed bytes | 2,309,694 | 2,297,297 | 1,542,044 | 1,527,683 |
| Lab LCP (ms) | 432 | 320 | 1,520 | 672 |
| Startup long-task total (ms) | 128 | 0 | 994 | 438 |
| CLS | 0.000612 | 0.000733 | 0 | 0 |

Bundle estimates are unique ancestor-layout/page references, per-file gzip bytes; they exclude later dynamic resources. Phase 5 explicitly includes the new route-group layout. Phase 4's root-layout/page calculation already included its complete ancestor tree. Browser transfers above are the actual download measure.

| Route | Phase 4 gzip bytes | Phase 5 gzip bytes | Reduction |
| --- | ---: | ---: | ---: |
| / | 146,162 | 143,344 | 1.9% |
| /products | 139,362 | 134,746 | 3.3% |
| /admin | 168,322 | 127,297 | 24.4% |
| /checkout | 139,366 | 129,923 | 6.8% |

Across 41 observed placeholder samples, maximum loading feedback is 157.6 ms; maximum warm click-to-content is 1,805.3 ms. Two warm mobile catalog visits took about 1.63/1.81 seconds with no observed loading placeholder. Null feedback samples do not prove a response within budget; fast cached transitions can also omit placeholders. Timings vary and improvements are not universal. PERF-05/PERF-30 feedback/field/staging budgets remain open; five local samples do not establish field INP/LCP percentiles or deployed API/DB latency.

## Startup intervention and visual evidence

The frozen Phase 4 diagnostic alternated three cold mobile trials per arm, retaining real hero assets. Normal Shop clicks were 401–11,907 ms (median 4,380); natively blocking speculative RSC during startup, then unblocking before click, produced 1,384–2,460 ms (median 1,684). CPU results varied and first-arm samples include trace overhead. This limited intervention supports chosen-link prefetch, without assigning all stalls to prefetch or replacing the final normal-network benchmark. Diagnostic script transfer values use Resource Timing and are separate from principal CDP byte accounting.

Final desktop/mobile home, catalog, product, cart, checkout, article and anonymous account/admin screenshots are retained. Desktop product layout/crop matches the Phase 4 screenshot; hero thresholds/CTA, responsive media and deferred dialog focus/opening checks pass. Existing mobile navbar clipping and product gallery geometry are preserved. Original media bytes are unchanged. Twenty-six route-group files are unchanged relocations; the frozen comparison distinguishes those from 24 changed/new frontend content files and five backend files.

Evidence: [frozen Phase 5 artifacts](../../artifacts/performance/phase-5-2026-10-01/verification.json), [browser measurements](../../artifacts/performance/phase-5-2026-10-01/browser.json), [controlled commerce](../../artifacts/performance/phase-5-2026-10-01/startup-commerce-checks/checks.json), [startup diagnostic](../../artifacts/performance/phase-5-2026-10-01/phase-four-startup-diagnostic/records.json), and [repeatable tooling](../../scripts/performance/README.md). The superseded ea3dab candidate remains separately labeled; its passing measurements are not the accepted final source. Prior frozen phases are untouched. CI configuration includes the new checks; remote CI has not run.

## Rollout and remaining release work

Deploy the backend's new read-only GET /cart/bootstrap contract before the corresponding frontend, or coordinate both. Keep the new backend when rolling the frontend back; older clients still have legacy GET /cart. No cart schema migration is required. Preserve the Phase 4 invalidation-first/cache-enabling rollout and matching server-only market/revalidation secrets. Generated public/media output must accompany the build.

Staging must verify real session rotation, returning-user/guest merge and market/coupon persistence against the database, recovery activity, both sandbox gateways, deployed CDN/regions and calibrated budgets. Production CORS rejection of no-Origin SSR (PERF-32), existing backend lint cleanup and release observability remain Phase 8 blockers. Phase 6 API payload/query/hosting work is the next implementation phase; this phase performs no deployment.
