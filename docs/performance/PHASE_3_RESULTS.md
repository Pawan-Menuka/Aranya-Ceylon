# Phase 3 — Responsive photography and media caching

Completed locally: 2026-10-01, Asia/Colombo. Covers PERF-11, PERF-12 and the local portion of PERF-13. Phase 2 had no remaining local implementation work: its hero bounds, cancellation, animation, visual and full-flow checks passed again. Real-device, background-tab and hosted acceptance remain the Phase 8 release gate. Phase 3 is now implemented and locally verified; Phase 4 and deployment have not started.

## Changes

- Ordinary `ImageSlot` now renders responsive Next images in initial server HTML. Keep the existing dimensions, shape, fit, position, mask, empty-slot artwork and photography mappings. Images inside scroll reveals remain visible with JavaScript disabled through a narrowly scoped noscript style; JavaScript reveal animation is unchanged.
- Visitor pages omit the legacy editing script and sidecar request. `editor={true}` explicitly loads the existing authoring component. No saved `.image-slots.state.json` was found in this tree; synthetic browser fixtures verify both bare data-URL and `{u,s,x,y}` formats and crop persistence through an in-memory bridge. The real sidecar is never written by the checks.
- Gallery, card, search, recipe, journal, account, cart and checkout placements declare their actual responsive sizes. Initial product/marketing heroes receive priority, while alternate gallery and lower-page images remain lazy. Add 80/160-pixel candidates for the 74-pixel gallery thumbnails. Fresh 62-pixel thumbnails select 64 pixels at DPR 1 and 128 at DPR 2. Chrome can reuse a larger image already in its cache: the mobile cart reused 640 pixels with **zero new transfer bytes**, rather than downloading another image.
- The original hero poster is now an early, preloaded image with the same cover crop. It is requested once per controlled visit at High priority, beginning 46 ms desktop / 38 ms mobile after the first recorded request in the unthrottled waterfalls. Keep its original 312,926-byte WebP: a measured quality-90 re-encode added about 50 KB without additional source detail. Other slot photos use quality 90; existing product image quality remains 75. No source photograph or frame was recompressed or replaced.
- Publish independent content-versioned copies of 106 photographs and 385 hero files under `/media/<content-hash>/...`. Photos use individual hashes; the poster/frame sequence uses a group hash. Versioned files receive one-year immutable caching; original mutable paths retain `max-age=0`. Source replacement plus regeneration/rebuild changes the URL, while retained old copies keep their original bytes. Generation runs at development startup and production build, **not production server startup**.

The new generator and manifest are build inputs. Derived `public/media` files are gitignored and must be included with the deployed Next/public output. Keeping originals and independent versioned copies adds approximately **105 MB** of static output for the current media set (21,362,522 photo bytes + 84,017,878 hero bytes). Old versions are retained locally; deployment retention/cleanup must preserve any versions still referenced by clients. Run `node aranya-next/scripts/prepare-media.mjs` after replacing originals during an already-running development session to refresh the manifest. No dependency or lockfile changes were needed.

## Before/after measurements

Compare the frozen Phase 2 and final Phase 3 production fixture runs: Node **20.20.2**, Next 14.2.35, React 18.3.1, Playwright 1.62.1 and Chrome 154.0.8037.58. The public dataset and profiles are unchanged: desktop 1440×900/DPR 1, 20 ms/10 Mbps/CPU 1×; mobile 390×844/DPR 2, 80 ms/4 Mbps/CPU 4×. Each profile has five cold/warm browser repetitions. Server/data/image-transform caches are warm; these are not cold-server measurements. Home observations last six seconds.

| Completed encoded transfer median | Phase 2 | Phase 3 | Reduction |
| --- | ---: | ---: | ---: |
| Desktop cold home | 3,553,332 bytes | 2,298,315 bytes | 35.3% |
| Mobile cold home | 2,783,672 bytes | 1,526,432 bytes | 45.2% |
| Desktop cold catalog stage | 425,354 bytes | 194,815 bytes | 54.2% |
| Mobile cold catalog stage | 250,151 bytes | 180,362 bytes | 27.9% |
| Desktop cold product stage | 181,209 bytes | 87,720 bytes | 51.6% |
| Mobile cold product stage | 267,252 bytes | 51,952 bytes | 80.6% |

Stage bytes are grouped by request initiation and completed within observation windows, not total route weight or a count of pixels finally painted. Lazy delivery and responsive candidates explain the reduction. Warm home transfers are 35,154 desktop / 35,563 mobile bytes. Four correct-viewport frames still start at rest; no mobile visit starts desktop frames. Hero/poster encoded bytes stay essentially unchanged at 1,949,495 desktop / 1,179,847 mobile cold (the 90-byte difference from Phase 2 is response overhead). Warm hero transfers are zero in this run.

All **160 principal steps pass**, with zero navigation failures or browser page errors. Cold Shop median is **339.2 ms desktop** (337.7–347.8) / **466.5 ms mobile** (445.0–511.7), keeping the original greater-than-15-second failure resolved. Warm catalog/product/checkout medians are **74.5 / 89.2 / 85.9 ms desktop** and **248.1 / 360.4 / 277.5 ms mobile**. Phase 2 warm mobile values were 278.2 / 381.2 / 207.9 ms; this phase reduces media traffic, but not every navigation timing improves. Mobile cold product/checkout medians are 581.3 / 388.6 ms. Timing budgets remain report-only.

Home lab LCP medians are **356 ms desktop cold / 140 ms warm**, and **1,256 ms mobile cold / 228 ms warm**, versus Phase 2's 356/160 and 1,356/292. Cold desktop samples span 336–2,832 ms; mobile spans 1,172–1,420 ms. The first desktop cold outlier still exceeds the provisional 2,500 ms limit. Mobile cold home long-task duration median is 358 ms, versus 525 ms in Phase 2. SPA task arrays are cumulative and do not isolate transition CPU cost. Maximum observed route loading feedback is 200.1 ms; the provisional 200 ms target is still not consistently met.

Observed cold home JavaScript transfer falls **173,754 → 160,649 bytes** in both profiles, including removal of the external visitor editor runtime. Unique layout/page gzip estimates increase: home 141,523 → 146,132; catalog 134,466 → 139,332; product 150,940 → 156,083; article 141,473 → 146,027 bytes. These estimates omit external scripts/later dynamic downloads and are not browser transfer totals. Global startup/bundle reduction remains Phase 5.

## Verification

- Production compilation, frontend types and lint pass. Two pre-existing AdminProducts lint warnings and the optional Sharp warning remain.
- **23 focused tests across four files** pass: existing request/BFF and hero behavior, plus independent immutable copies, replacement changing URLs without changing old bytes, stable generation/source preservation, URL mapping and production startup without source-directory scanning.
- **Nine media browser checks** pass: desktop/mobile no-JavaScript photography, unique poster preload, omitted visitor editing requests, small fresh thumbnail variants/cache reuse, local/Cloudinary/shape/fit/position/empty-slot cases, static immutable headers and conditional 304s, Next transform cache HIT, and opt-in sidecar/crop persistence. The 80-pixel transform is 1,414 bytes; its response has one-year caching with revalidation. Public Cloudinary demo access is read-only.
- **12 Phase 2 hero checks** and **six Phase 1 failure/retry checks** pass again against the final build. Cache/pending/window bounds remain 16/2/12, navigation cancellation remains effective, and hydration has no recovery errors. Visibility/saveData use the previously documented headless simulations; reduced motion uses browser emulation.
- Desktop home/catalog and mobile photography/gallery/cart screenshots were inspected against the prior presentation. Existing mobile navbar clipping and gallery container geometry remain unchanged. Screenshot checks await image decoding/painting, including when JavaScript is disabled. Sanitized desktop/mobile initial-load waterfalls and Chrome timelines include LCP candidates; the hero scroll trace is also retained. Controlled traces are separate from principal timings.

Principal build/benchmark and media checks use Node 20.20.2. Focused tests and hero/recovery runners use the sandbox's Node 24.19.0; these runtime differences are recorded. The runner adds a separately fingerprinted component fixture route only to `.performance-build` (51 generated pages rather than 50). It is absent from the live frontend and is not visited by the principal benchmark; its small webpack manifest effect is included in estimates. The developer's `.next` output is untouched. CI now includes the media checks; remote CI was not dispatched.

Final frontend SHA-256: `140760256881188599c42207ab75cfa731e6e7eb533acbe777fc7963f7d1aacd`. Public API fixture remains `e950cc062cdd38fb838eeee2e45f8367fd6e62fd959dcaa2b92b5a1f4e31a138`. Isolated media fixture: `1619cd5028994339ff9657a8e2744c8c960c0f609ec244bce8e42da0504f8d66`. Comparing per-file manifests identifies 28 intended frontend paths; all original photography/frame hashes and other pre-existing frontend edits match Phase 2. Fingerprinting now includes the generator scripts/manifest and excludes their derived media copies.

## Artifacts and release limits

Frozen evidence: `artifacts/performance/phase-3-2026-10-01/`, including the build/source manifests, full browser/HTTP/network/summary/bundle results, 16 principal screenshots, nine media checks/screenshots/two initial traces/waterfalls, 12 hero checks/scroll trace, six recovery checks, test results, comparison and exact tooling/fixture/source snapshots. Stale failure screenshots are excluded. Earlier frozen phases are preserved; generated evidence is gitignored.

PERF-11/12/13 are done locally with hosted/device acceptance pending. Real CDN headers, deployment retention, first-request transform latency and real-phone image quality need Phase 8 checks. This run uses the public fixture API: no real sign-in, customer/admin write, database mutation, email or gateway submission occurs. Backend code is unchanged in this phase; the 134-test backend result belongs to Phase 1 and was not rerun. PERF-05 feedback/optional-content work and Phase 4 caching/streaming remain open. No commit, push or deployment was performed.

For rollback, revert only Phase 3 hunks in the 28 frontend paths and its generator, manifest, media checks/fixture, CI/package/tooling changes. Retain Phase 1 deadlines/retry/hydration fixes, Phase 2 scheduling/motion fixes and unrelated existing work. Original media remains available at its prior paths.
