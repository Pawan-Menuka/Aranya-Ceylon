# Phase 0 performance baseline

Date: 2026-09-30. Status: local measurement work completed; browser checks fail. Staging/release validation remains outstanding. This is a baseline, not deployment clearance.

The measurement tooling is implemented. It builds the current storefront in an isolated directory, records production HTML and browser observations, and checks database metadata read-only. Application performance fixes belong to subsequent phases.

## Reproduction and scope

- Commit: `095f149ca06aa20575c1ed3e55520c9ce90e6498`; branch: `test-order-fixes`. Existing uncommitted application/media changes are included and preserved. The raw environment artifact records the working-tree status, tracked diff hash and per-file source hashes.
- Next 14.2.35; React 18.3.1; local Node 24.19.0; Playwright 1.62.1; installed headless Chrome 154.0.8037.58. CI is configured for Node 22 and Playwright Chromium; its results must be compared separately.
- Local host: Windows x64, Intel Core i7-13650HX, 20 logical CPUs, 16 GiB RAM. Browser CPU slowdown is relative to this machine; background load was not isolated.
- Production frontend: `127.0.0.1:3101`; deterministic in-memory fixture API: `127.0.0.1:4101`. No real API process, scheduled jobs, email, payment or order writes were started. The existing frontend's `.next` was not overwritten.
- Fixture: a read-only snapshot of 14 active products, one published article, six recipes and five gift sets. A fixture-only signing key produces market cookies; these are not real authentication sessions. Runs 1/3/5 use USD and 2/4 use LKR.
- Desktop: 1440 × 900, DPR 1, CPU 1×, 20 ms latency, 10 Mbps down / 5 Mbps up. Mobile: 390 × 844, DPR 2, touch/mobile emulation, CPU 4×, 80 ms latency, 4 Mbps down / 2 Mbps up.
- Five repetitions per profile; each has browser-cold and browser-warm passes. Server caches are warm. Home is observed six seconds after DOM readiness. Click observations use a 15-second deadline; a failed click remains a failure, followed by a labeled hard arrival so other screens can be inspected.

Run instructions and precise metric limitations are in [the tooling README](../../scripts/performance/README.md). Timing targets are provisional/report-only, not agreed release gates.

## Checks completed

The isolated production build passed compilation, TypeScript and lint checks. It retained two existing AdminProducts lint warnings and reported the optional production image optimizer `sharp` as missing. The four measurement scripts pass Node syntax checks. The fixture contains no account credentials, customer contact fields, author identifiers or session token fields.

The read-only database check found all 18 local migrations applied, no unfinished migrations, all eight expected performance indexes present, and `pg_trgm` installed. Five sequential `SELECT 1` transactions took 232, 81, 78, 80 and 78 ms (median 80 ms). These are connectivity observations, not endpoint/query-plan performance. No migration was executed.

The browser smoke collected both desktop passes and all specified screens, but exited nonzero: cold Shop navigation stalled and production home reported React errors 425/418/423. These findings also occurred in diagnostic runs without the observation script. An unthrottled diagnostic completed the Shop transition; this does not establish the root cause of the throttled stall.

React's error decoder identifies [425 as a server/client text mismatch](https://react.dev/errors/425) and [423 as recovery through client rendering](https://react.dev/errors/423). This is a new follow-up finding; its exact component/cause still needs triage. The source was not changed to silence it.

## Measurement results

All four principal-flow groups below have **five observations per step**. Cold catalog content was inspected through a hard arrival after each failed click; the cold Shop timing remains a failure. Cold product/cart/checkout numbers therefore describe a flow resumed after that fallback, not a successful uninterrupted first visit.

| Click → content | Desktop cold | Desktop warm | Mobile cold | Mobile warm |
| --- | ---: | ---: | ---: | ---: |
| Home → Shop | **5/5 exceeded 15 s** | 619 ms (149–1,931) | **5/5 exceeded 15 s** | **4,730 ms (2,564–6,875)** |
| Catalog → product | 896 ms (174–1,654) | 1,223 ms (1,039–3,324) | 918 ms (728–1,259) | **4,310 ms (3,582–5,377)** |
| Product → cart drawer | 80 ms (35–831) | 15 ms (10–20) | 302 ms (235–1,842) | 134 ms (68–256) |
| Drawer → checkout | 128 ms (116–923) | 593 ms (104–2,738) | 433 ms (408–648) | **2,791 ms (1,128–4,204)** |

Values are medians with observed min–max, rounded to milliseconds. Warm mobile navigation is consistently above the proposed one-second content target. The captured cold Shop input reaches two animation frames in median 28 ms desktop / 12 ms mobile, while destination content still misses the deadline. This metric does not show meaningful route feedback; there are no route loading boundaries yet.

| Home observation | Desktop cold | Desktop warm | Mobile cold | Mobile warm |
| --- | ---: | ---: | ---: | ---: |
| Lab LCP median; min–max | 644 ms; 512–8,968 | 332 ms; 244–1,112 | 2,804 ms; 1,760–38,624 | 444 ms; 252–1,108 |
| Document CLS median | 0.000612 | 0 | 0 | 0 |
| Initiated frame requests | **192** | **192** | **193** | **193** |
| Desktop / mobile frames | 192 / 0 | 192 / 0 | **41 / 152** | **41 / 152** |
| Completed encoded transfer, median | 6.84 MiB | 5.08 MiB | 2.97 MiB | 2.37 MiB |
| Requests still in flight, median | 177 | 179 | 189 | 190 |
| Document long tasks, median | 1 | 1 | 8 | 12 |

The fixed six-second window begins after DOM readiness, so a slow DOM arrival can extend the total elapsed observation substantially. Large outliers are retained, not discarded. Both warm profiles still start the entire frame preload path; warmed browser cache does not eliminate that work. On mobile, the frame cache appears to mix viewport generations; Phase 2 must verify correct rendering as well as eliminating desktop requests.

There are **10 cold Shop timeouts**, **10 repetition-level page-error records** (120 React errors recorded across the repetitions), and **two additional mobile arrival failures**. Mobile run 2's warm account arrival and run 4's warm article arrival exceeded 30 seconds. Consequently, mobile warm account/admin have four successful samples and article has three; all other supplementary groups have five. Failed attempts are retained in `summary.json`; the full command correctly exits nonzero.

Five-round local HTTP medians, using the fixture API: home **61 ms TTFB / 65 ms total**, catalog **78 / 81 ms**, product **64 / 67 ms**, about **61 / 64 ms**. The first product sample was 1,136 ms total. All tested HTML responses were private/no-store. These are SSR/loopback observations, not real API or deployed network latency.

Unique layout/page JavaScript references, gzip estimates: home **139,240 bytes**, catalog **133,614**, product **150,088**, admin **164,804**. Actual home completed script transfer was median **162,353 bytes cold / 484 bytes warm**. Build estimates, wire transfer and later resources have different definitions and should not be compared as identical totals.

Source SHA-256: `06d2cf496abc68266ee345fac76980b422f591eac68b7e34a3f6a37930e2f24b`. Fixture SHA-256: `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138`. Tracked application diff SHA-256: `3ab257c332bd64a60bb7c794f2283290d53cd3ffc7dc3f69706c517e61116263`.

LCP can look fast while background hero downloads and route navigation remain expensive; assess these measurements together. Completed-byte counts cover the observation window, not total page weight. SPA records retain document-wide CLS and long-task history; those values do not attribute all CPU work to the latest click. Click-to-content includes automation polling and checks a content marker, rather than image completion. The two-animation-frame sample is an input timing approximation, not visual proof of a loading state or field INP.

## Release follow-ups

1. Phase 1: bounded requests/loading feedback; triage the home hydration errors and repeat the cold navigation sample. Phase 2: measure navigation again after removing eager frame downloads. The current evidence does not prove that hero traffic is the only navigation cause.
2. The mobile screenshots show horizontal clipping in existing navigation/checkout layouts. Retain these as visual evidence and resolve the affected responsive behavior before release; no layout edits were included in Phase 0.
3. Staging still needs an actual release build with recorded frontend/API/DB regions, CDN/cache/compression behavior, cold starts, representative payloads and controlled delayed/failed API scenarios. No staging URL or hosting control was available in this workspace session.
4. Add real signed-in customer/admin and expired-session fixtures, guest/cart merge/market switching checks, and both gateway sandbox flows on staging. This local run stops at checkout arrival and never submits an order/payment.
5. Run the added GitHub workflow remotely. It has been configured, not dispatched or verified on GitHub. Its command fails locally on the known baseline issues; performance budgets remain report-only. Field Web Vitals, route/API percentiles and a calibrated release gate remain Phase 8 work.

## Artifacts and rollback

Raw results are gitignored under `artifacts/performance/phase-0-2026-09-30/`. This frozen folder preserves the environment/source fingerprints, build output, bundle estimates, HTTP/browser records, summaries, DB metadata, 16 representative screenshots and two current failed-arrival screenshots. The public fixture and runner/workflow are checked-in candidates; generated build/browser output is not.

To remove Phase 0 tooling, revert only `scripts/performance/`, `.github/workflows/performance.yml`, the three `perf:*` root scripts and the two performance ignore entries. There are no application behavior changes or database writes to roll back. Preserve existing local changes when reviewing/reverting.
