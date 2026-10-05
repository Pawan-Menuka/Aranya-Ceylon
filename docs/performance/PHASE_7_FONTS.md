# Phase 7 — PERF-17 font and admin CSS audit

Measured locally on 2026-10-02 against the live `aranya-next` source. Source/gzip estimates and the integrated production browser measurements below are distinct. Final Phase 7 typography and build acceptance pass.

## Font inventory and decision

| Family / role | Before | Evidence of use | After |
| --- | --- | --- | --- |
| Cormorant Garamond / display | 500, 600, 700; normal and italic | `.disp` and headings use 600; editorial headings and numbered captions use 500; quotes, Latin names, and hero captions use italic. Inline display text without a weight inherits 400 and resolves to the configured 500 face. No display element requests 700 in the current source. | 500, 600; normal and italic |
| Plus Jakarta Sans / UI | 400, 500, 600, 700, 800; normal | Body and controls use 400–700. Shipping step numbers and admin counters/labels explicitly use 800. | Unchanged |
| Spectral / reading | 300, 400, 500, 600; normal and italic | `.prose` sets 400, recipe and journal intros use 500 italic, and prose `<em>` uses italic. Sanitized rich text allows `<b>`/`<strong>`; the available 600 face serves their heavier match. No reading text requests 300. | 400, 500, 600; normal and italic |

The configured weight/style combinations fall from 19 to 15 (Cormorant 6→4, Jakarta 5, Spectral 8→6). This counts declared faces, **not** observed requests or transferred font bytes. Brand families, CSS variables, fallbacks, and all used styles remain unchanged. `next/font/google` already self-hosts the resulting fonts at runtime. No exact local font assets with verified provenance exist in this repository, so moving to `next/font/local` would add an unverified source and is deferred. Revisit only if a production build repeatedly fails to fetch its build-time font inputs and the exact licensed files can be identified.

## CSS measurement and change

| Source | Before | After |
| --- | ---: | ---: |
| Storefront global CSS, raw | 30,531 B | 16,625 B |
| Storefront global CSS, gzip estimate | 7,455 B | 4,282 B |
| Admin CSS, raw | In global CSS | 13,905 B in `app/admin/admin.css` |
| Admin CSS, gzip estimate | In global CSS | 3,616 B |

The storefront source loses 13,906 B (45.5% raw, 3,173 B / 42.6% by gzip estimate). The admin rules were a contiguous final block, so moving them to the admin route stylesheet preserves their order, declarations, media rules, and specificity. The one selector change moves admin color tokens from `:root` to `.admin`; both selectors have the same specificity, and all console content sits under `.admin`. `app/admin/layout.tsx` imports the stylesheet only for the admin route. Actual emitted CSS/request savings depend on Next's build and client navigation behavior; route measurements are still required.

## Verification

- Reconstructed the pre-split stylesheet from the two files and confirmed its original 30,531 B size; only the admin token selector differs, by one byte, plus one removed trailing blank line. A direct source check confirms the admin block is absent from `globals.css` and imported by the admin route layout.
- A standard direct TypeScript check encounters stale user `.next/types` for pages moved in earlier phases. The final isolated production build completes types/lint successfully after integration; the user build output is preserved.
- The coordinator runs browser checks sequentially on the final build. Search and product display/UI/reading roles retain Cormorant, Jakarta and Spectral at desktop and 390-pixel widths, with product emphasis italic after `document.fonts.ready`. Direct storefront loads exclude admin selectors; the admin gate loads its route stylesheet. Representative screenshots were inspected. Authenticated admin acceptance remains staging work.

## Integrated acceptance update

The final isolated production build/typecheck/lint pass, retaining the two existing AdminProducts warnings. A read-only token audit finds 268 uses of moved variables in twelve admin files, no storefront/account/checkout consumers, and no admin portals outside `.admin`. The Phase 3 desktop/mobile cold waterfalls show initial CSS transfer falling from 8,832 bytes/two requests to 5,488 bytes/one request (includes response headers). Font transfer remains 150,142 bytes across six requests in both phases/profiles; removing unused declarations does not reduce the observed loaded font bytes. All nine Phase 7 browser checks pass, including typography/admin separation and scanning 75 emitted client chunks for DOMPurify/policy symbols. The source import removal and reduced route bundles provide additional evidence for the sanitizer boundary.
