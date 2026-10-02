# Phase 1 — Navigation feedback and request deadlines

Date: 2026-09-30. Status: Phase 1 implementation verified locally; overall performance gate still fails. Staging acceptance remains pending. This phase does not authorize deployment.

## Changes

Storefront routes now have lightweight loading boundaries, with separate checkout/admin pending shells. Public API transport failures reach a page error state rather than silently showing demo catalog data in production. Explicit preview mode retains its fallback. Missing/empty-content fallbacks are unchanged. The retry button refreshes server content and resets the error boundary. Delayed catalog navigation can be interrupted by another navigation.

Account/admin session restoration now has a bounded retry state. Startup and concurrent expired-token requests share the existing single-flight refresh. A cancelled waiter cannot cancel another caller's shared refresh. Anonymous/failed restoration does not grant account or admin access. Successful sign-in/sign-out clears a previous restoration error.

The typed client and BFF use separate operation budgets. Caller cancellation is combined with the deadline, including body consumption and the client's existing one-time 401 refresh/replay. The BFF also bounds incoming body consumption and refuses to forward a mutation if its body completes after cancellation/timeout. Timeout/network failures do not add automatic mutation or payment retries. Cookies, market headers, cache hints, auth headers, refresh-cookie path scope and empty logout responses remain covered by tests.

| Operation | Client/direct SSR | BFF upstream |
| --- | ---: | ---: |
| Catalog and other reads | 10 s | 8 s |
| Refresh and current-session reads | 5 s | 4 s |
| Other writes | 15 s | 15 s |
| Checkout creation and refund writes | 60 s | 60 s |
| Image upload writes | 120 s | 120 s |
| Whole startup session restoration | 10 s | Individual requests as above |
| Backend frontend-revalidation request and response body | 3 s | Not applicable |

These are initial operation budgets to calibrate on staging. A network timeout bounds waiting; it does not establish whether a remote mutation committed. Backend payment/webhook/stock transactions were not changed. Checkout polling's total budget and cancellation remain PERF-29 in Phase 5.

PERF-31's hydration cause was reproduced in development diagnostics: HeroTextOverlay's inline `<style>` text contained quoted font-family names, escaped differently in server HTML and client text. The same CSS declarations now live in the existing global stylesheet. No hydration suppression or frame-loader change was introduced. Successful page markup, fonts, animation and image crops remain intact.

## Verification

- Request/BFF suite: **11 tests pass**, including stalled response bodies, cancellation, shared rotating refresh, rejected refresh, timeout waiter isolation, SSR cookies/cache hints, operation budgets, late incoming mutation bodies, cookie relay, 204 logout, and 504/502/499 proxy responses.
- Full backend suite: **134 tests pass across 13 files**, including two new revalidation deadline tests and existing payment/stock tests.
- Frontend and backend TypeScript checks pass. Frontend lint and isolated production build pass, retaining only the two existing AdminProducts lint warnings. No dependency or lockfile changes were needed.
- All **six controlled production browser checks pass**: home hydration; delayed catalog feedback/navigation away; catalog deadline plus successful explicit retry; failed session restoration/retry and anonymous account/admin gates; primary product 503 plus successful retry; actual BFF auth timeout. Catalog loading appeared in **79 ms**, its deadline error in **10.82 s** including browser/server scheduling, and the BFF returned no-store 504 in **4.12 s** for its 4-second upstream budget. Session failure visibility was checked within seven seconds; this is separate from the whole check's duration, which includes retries and admin arrival.
- Desktop loading/error and mobile home screenshots inspected. Existing mobile navigation clipping remains recorded for release follow-up; successful layouts were not redesigned.

## Measurement scope

The principal comparison uses the same Phase 0 public fixture, desktop/mobile profiles, five repetitions, cold/warm browser caches and real hero requests. It stops at checkout arrival. The deterministic fixture has no real accounts, database, email jobs or gateways. No payment was submitted. CLI verification briefly overlapped part of the desktop run; host background load was not isolated in either phase. Treat differences as local lab observations, not promised deployed speedups.

The browser observer now separately records the first visible loading placeholder after a click. This is an added metric: Phase 0's two-animation-frame sample was only an input-feedback approximation. Missing placeholder samples can mean a fast completed transition. Failed clicks remain failures even when a loading state appears or a later hard navigation succeeds. Supplementary HTTP bytes and browser encoded transfers remain distinct.

Controlled failure checks block hero frames to isolate API/session failure behavior. The principal comparison loads them normally. Neither test substitutes for staging customer/admin sessions, expired-cookie rotation, cart merge or Stripe/PayHere sandbox confirmation.

## Before/after comparison

Five observations per profile/cache/step were retained. All 20 home arrivals and all account/admin/article arrivals completed. Phase 0 recorded 120 React hydration/recovery errors; Phase 1 recorded **zero page errors**. Both phases retain **ten cold Shop clicks exceeding 15 seconds**, followed by explicitly labeled hard arrivals. The full Phase 1 command correctly exits **1**. The earlier single desktop smoke completed cold Shop in 340 ms but timed out on cold product; the five-run comparison takes precedence over that isolated successful Shop sample.

| Warm click-to-content median | Phase 0 | Phase 1 | Phase 1 range |
| --- | ---: | ---: | ---: |
| Desktop catalog | 619 ms | 1,884 ms | 313–2,731 ms |
| Desktop product | 1,223 ms | 1,291 ms | 429–4,253 ms |
| Desktop checkout | 593 ms | 731 ms | 615–1,547 ms |
| Mobile catalog | 4,730 ms | 4,252 ms | 347–4,459 ms |
| Mobile product | 4,310 ms | 4,671 ms | 1,423–9,180 ms |
| Mobile checkout | 2,791 ms | 2,980 ms | 1,647–3,355 ms |

There is **no consistent improvement in destination completion time** yet, including a worse desktop catalog median in this run. These small, variable local samples do not establish a speedup or isolate the cause of a regression. Loading boundaries add visible feedback, while the remaining resource contention and rendering dependencies still need their planned fixes.

For the ten failed cold Shop clicks, actual loading feedback was median **21.8 ms desktop** (17.7–86.9 ms) and **120.9 ms mobile** (81.3–1,380.6 ms), five samples each. Warm catalog feedback medians were **21.6 ms desktop / 62.1 ms mobile**. Warm product feedback was **20.5 ms desktop / 4,001.8 ms mobile**; the mobile delay and cold outliers remain unresolved. The provisional 200 ms feedback target is not consistently met. Optional content/metadata streaming remains Phase 4; shared route layout/prefetch work remains Phase 5.

The home still initiates median **192 desktop / 193 mobile hero frames**, with **177 / 189 requests in flight** in the cold observation window. These match the outstanding Phase 2 loader findings; this phase did not reduce frame traffic. Cold home lab LCP medians were 648 ms desktop / 1,956 ms mobile. A reasonable initial LCP does not establish responsive navigation. Unique layout/page gzip JS estimates grew slightly: home 139,240 → 139,789 bytes; catalog 133,614 → 134,405; product 150,088 → 150,879; admin 164,804 → 165,792. These estimates exclude later dynamic resources.

Frontend source SHA-256: `e57f784913bea776f1cf679e668bfee164fb1cc3fdf516d8fac9e858e325a8f3`. Fixture SHA-256 is unchanged: `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138`. Next/React/Chrome versions and profile configuration match Phase 0. Runtime metadata review during Phase 2 corrected the Node comparison: Phase 0 used Node 24.19.0, while this principal run used Node 20.20.2. That is an additional limitation of the Phase 0–1 timing comparison; Phase 2's principal run also uses Node 20.20.2. Comparing manifests identifies only the 30 intended Phase 1 frontend files; all previously changed frontend files outside this scope retain their Phase 0 hashes.

## Remaining acceptance

Local Phase 1 failure/retry, cancellation and mocked refresh acceptance checks pass. PERF-05 remains partial because optional content streaming and consistent mobile feedback still need work. PERF-06 and PERF-31 are implemented and locally verified, with real staging confirmation outstanding. The full cold-navigation performance failure remains a release blocker; it is not reclassified as a passing click. Continue with the approved sequence: Phase 2 hero scheduling next, then later rendering/cache/startup work and the Phase 8 staging gate. This phase did not begin those changes.

## Artifacts and rollback

The frozen Phase 0 artifact directory is preserved. Raw Phase 1 results are frozen under `artifacts/performance/phase-1-2026-09-30/`: environment/per-file hashes, build output, full browser/HTTP/summary/bundle records, 16 principal screenshots, the six controlled checks with five screenshots, a verification manifest, and copies of the exact measurement scripts/public fixture. Stale screenshots from earlier runs were excluded. Generated browser/build artifacts remain gitignored. The checked-in candidates include the focused request tests, controlled failure runner, fixture delay/failure support, and CI steps. Remote CI has not been dispatched or verified.

Review/revert only Phase 1 hunks: route loading/error files and shared pending/retry components; read-failure handling in public pages/wrappers; request deadline/client/auth/BFF/upload handling; AuthContext and account/admin retry gates; HeroTextOverlay's CSS move; backend revalidation timeout/tests; Phase 1 measurement/test/CI additions. Preserve the unrelated pre-existing account, admin, image, catalog and backend changes. No database migrations, deployment or commits were performed.
