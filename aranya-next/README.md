# Aranya Ceylon — Storefront (Next.js)

A production-grade rebuild of the Aranya Ceylon storefront on **Next.js (App
Router) + TypeScript**, reproducing the existing prototype **pixel-for-pixel**
while running server-side, typed, and wired to the Express + Prisma REST API
described in the build spec.

> **Phases 1–7 of a phased build.** This package contains the full **foundation**
> (design tokens, fonts, typed API client, BFF cookie-forwarding proxy,
> market/currency logic, all global components), the complete **homepage**, the
> **catalog** + **product detail** pages, the **categories landing** + **search**,
> **cart + guest checkout**, the **account area** (auth, dashboard, order tracking,
> orders, addresses, wishlist, profile) with cart-merge + the payments client,
> the **Journal** + **Recipes** (index + article/recipe detail), and now the
> role-gated **admin console** (dashboard, orders, products, journal management,
> audit log) — all market-aware, with demo fallback throughout.

### Routes built so far
| Route | Render | Notes |
|---|---|---|
| `/` | SSG/ISR + client market | Homepage — hero, accordion, every section |
| `/products` | SSG/ISR + client filters | Catalog — banner, featured row, facet filters (form/origin/flavour), sort, load-more, shareable filtered URLs |
| `/products/[slug]` | SSG/ISR | Product detail — gallery, market-aware buy-box, flavour profile, specs, pairings, reviews, related; `Product` JSON-LD + OpenGraph |
| `/categories` | SSG/ISR | Editorial landing — preparation features (live counts + previews), flavour band, collections; deep-links into the catalog |
| `/categories/[slug]` | server redirect | Maps a category slug → `/products?cat=<name>` |
| `/search` | server-loaded index + client | Searches catalog + journal, tabs, sort, highlighting, idle + empty states; `?q=` shareable |
| `/cart` | server redirect | Cart is a drawer (locked design) → redirects to `/products?cart=1`, which opens it |
| `/checkout` | client | Single-page checkout — contact (guest), address, market-aware delivery + payment, sticky order summary, inline confirmation; attempts `/checkout/create-intent` then falls back locally |
| `/account` | client (gated) | Sign-in/register gate or dashboard — overview, live order tracking, orders, order detail, addresses, wishlist, profile |
| `/journal` | SSG/ISR | Journal index — featured spotlight, category chips, 3-up grid (live blog API → demo fallback) |
| `/journal/[slug]` | SSG/ISR | Article — dark editorial hero, prose body (blocks or fallback), author, related; `Article` JSON-LD + OpenGraph |
| `/recipes` | SSG | Recipes hub — featured spotlight, course chips, 3-up grid |
| `/recipes/[slug]` | SSG | Recipe detail — hero, meta band, sticky checkable ingredients, numbered method + cook's notes, **shop-the-spices (adds to cart)**, related; `Recipe` JSON-LD |
| `/about` | SSG + client market | **Our Story** — full-bleed dark hero, statement band, origin story, forest-green grower section, full-bleed region band + stats, four-step process, closing CTA into the catalog |
| `/gifts` | SSG + client market | **Gift Sets** — dark hero, signature set feature (adds the box to cart as one line), 3-up set grid + build-your-own, forest finishing band, gifts-by-occasion tiles, corporate CTA; à-la-carte saving computed from the catalog |
| `/wholesale` | SSG + client market | **Wholesale & Trade** — dark hero + stat strip, why/who, four-step how-it-works, dark volume tiers, sticky application form (company/country/type/volume → inline reference), trade FAQ accordion |
| `/contact` | SSG + client market | **Contact** — dark support header + cluster tabs, overlapping quick-channel cards (WhatsApp/email/call), message form (inline ticket ref) + email directory + response times, visit-us map |
| `/faq` | SSG + client market | **Help & FAQ** — support header + cluster tabs, sticky category rail with scroll-spy, five categorised accordion groups, support CTA |
| `/shipping` | SSG + client market | **Shipping & Returns** — support header, market-driven rate cards (domestic LKR / international USD, your-region highlighted), tracking timeline + customs note, returns policy + three-step start, support CTA |
| `/privacy`, `/terms`, `/cookies` | SSG + client market | **Legal cluster** — dark legal header + cluster tabs, sticky table-of-contents with scroll-spy, long-form `.prose` (Spectral) sections, print-to-PDF, contact CTA. Content in `legal-content.tsx` (template copy — review with counsel) |
| `*` (unmatched) | client | **404 / not-found** — Liyawel motif, big numeral, search box → `/search`, quick links, in storefront chrome |
| `/admin` | client (role-gated) | **Admin console** — sign-in gate → dashboard (3 switchable layouts + charts), orders (filter + detail drawer, status flow, refund), products (list + create/edit drawer, stock, per-market pricing), journal (list + editor with scheduling), audit log. Standalone full-screen shell, `noindex`; gated to `ADMIN`/`SUPERADMIN` with offline demo session |

The Journal article links surfaced by **search** now resolve. Recipe detail's
"shop the spices" / "add all to basket" push real lines into the cart context and
open the drawer. Article + recipe-detail pages render the navbar in glass-over-
dark-hero mode (`<SiteChrome hero>`).

Auth lives in **`AuthProvider`** (inside `CommerceProvider`): the access token is
held in memory (`lib/api/http.ts`), the refresh token is an HttpOnly cookie via
the BFF. On mount it tries a silent `/auth/refresh` → `/auth/me` to restore the
session. Sign-in/register (the `/account` gate, the navbar account icon, and the
cart sign-in modal all share it) call `/auth/login | /auth/register`; **on login
the guest cart is merged via `POST /cart/merge`** (spec §7.4). When the API is
unreachable, auth falls back to a local demo session so the dashboard stays
viewable offline. The navbar account icon routes to `/account` when signed in and
opens the sign-in modal otherwise.

Cart + market live in the same **commerce context** mounted on every page
(`CommerceProvider`): a typed cart store ported from the prototype, persisted to
localStorage (optimistic, works offline), with the global cart drawer + sign-in
modal mounted once. Add-to-cart (cards, product buy-box), the navbar bag count,
free-shipping progress, promo codes (`CEYLON10`), gift wrap/note, per-market
pricing, and account reorder all run through it. In production these mutations
also POST to `/cart` and checkout calls `/checkout/create-intent` (Stripe
Elements for intl / PayHere for local, then polls the order until PAID) — the
typed clients are in place; the UI is wired and faithful.

Catalog filters resolve their initial state **server-side** from the URL query
(`?cat=&form=&flavour=&origin=&sort=`), so a shared filtered link renders without
a client flash; the client then owns subsequent filtering and reflects it back to
the URL. Product pages pre-render the demo catalog at build via
`generateStaticParams`, and fill live slugs on-demand through ISR
(`revalidate = 300`). Search loads its index (catalog + journal) server-side so
first results paint instantly and still work with the API down.

---

## Quick start

```bash
# 1. install
npm install          # or pnpm install / yarn

# 2. configure env
cp .env.example .env.local
#   set NEXT_PUBLIC_API_URL to your running Express API (default :4000)

# 3. run
npm run dev          # http://localhost:3000
```

If the backend isn't running, the homepage still renders — it falls back to the
on-brand demo spice set (acceptance criterion §11), so you can develop the UI
independently.

```bash
npm run build && npm start   # production build
```

Requires Node 18.17+ (Next 14). Fonts are self-hosted via `next/font` — no
external font CDN needed at runtime.

---

## What was kept identical to the prototype

The prototype is the **visual source of truth** — nothing about the design was
changed. Ported verbatim:

- **Tokens** — every colour, shadow, radius from `aranya.css` (`globals.css`).
- **Three type roles** — Cormorant Garamond (display), Plus Jakarta Sans (UI),
  Spectral (`.prose` long-form), wired through `next/font` → CSS variables.
- **Components** — Seal, Liyawel, Stars, Badge, SpicePhoto, Icon, Eyebrow,
  Reveal, the glass/auto-hide Navbar, the forest mega-Footer, CardB + CardCFinal.
- **Homepage** — hero (300vh pinned frame-sequence + entrance choreography +
  amber spice-dust canvas + kinetic tracking), spice ticker, From the Forest,
  the **horizontal category accordion**, story band, bestsellers, heritage,
  newsletter — in the same order and background rhythm.

The only changes are structural (the framework rebuild): JSX → typed TSX,
in-browser Babel → real build, `window` globals → ES modules, hardcoded sample
data → typed API client with a demo fallback, `.html` links → Next routes.

---

## Architecture

```
src/
  app/
    layout.tsx            Root layout — next/font wiring, <body class="aranya">, metadata
    globals.css           Ported tokens + primitives + homepage keyframes/layout
    page.tsx              Homepage (server) — resolves market, loads data, renders shell
    products/
      page.tsx            Catalog (server) — SSG/ISR, fetch + demo fallback → CatalogClient
      [slug]/page.tsx     Product detail (server) — generateStaticParams, metadata, JSON-LD
    categories/
      page.tsx            Categories landing (server) — preparation features + flavour + collections
      [slug]/page.tsx     Category slug → redirect to /products?cat=<name>
    search/page.tsx       Search (server-loaded index) → SearchClient
    cart/page.tsx         → redirect to /products?cart=1 (drawer-based cart)
    checkout/page.tsx     Checkout (client) — CommerceProvider + CheckoutClient
    account/page.tsx      Account (client, gated) — SiteChrome + AccountClient
    admin/page.tsx        Admin console (client, role-gated) — renders AdminApp (own AuthProvider + shell), noindex
    journal/
      page.tsx            Journal index (server) — live blog API → demo fallback
      [slug]/page.tsx     Article (server) — metadata, Article JSON-LD, fallback body
    recipes/
      page.tsx            Recipes hub (server, demo set)
      [slug]/page.tsx     Recipe detail (server) — Recipe JSON-LD, shop-the-spices
    about/page.tsx        Our Story (server market + AboutClient)
    gifts/page.tsx        Gift Sets (server market + GiftsClient)
    wholesale/page.tsx    Wholesale & Trade (server market + WholesaleClient)
    contact/page.tsx      Contact (server market + ContactClient)
    faq/page.tsx          Help & FAQ (server market + FaqClient)
    shipping/page.tsx     Shipping & Returns (server market + ShippingClient)
    privacy|terms|cookies/page.tsx   Legal cluster (LegalClient + section data)
    not-found.tsx         App-Router 404 (NotFoundClient in storefront chrome)
    api/[...path]/route.ts  BFF proxy → forwards cookies + Bearer to the Express API
  lib/
    types.ts              API read models (spec §8) + Spice / CatalogSpice / Order view-models
    money.ts              Currency formatting (LKR whole / USD 2dp) + market tokens
    market.ts             Server-side market resolution from the x-market cookie
    cart.ts               Cart logic — config/multipliers, totals, line maths (typed)
    spice-data.ts         Demo fallback data, per-spice palette, Product→Spice adapter
    catalog-data.ts       Catalog demo set + facets + sorts + Product→CatalogSpice adapter
    pd-content.ts         Product-detail editorial content, price helpers, demo reviews
    journal-data.ts       Journal demo posts + Post view-model + Blog→Post adapter + fallback body
    recipes-data.ts       Recipes demo set + helpers + recipe→catalog-spice resolver
    gifts-data.ts         Gift-set dataset + à-la-carte / saving price helpers (off the catalog)
    account-data.ts       Account demo data — orders, tracking timeline, addresses, wishlist
    admin-data.ts         Admin demo dataset — seeded KPIs, 30-day series, orders, products, blog, audit, activity (reuses SPICES + JOURNAL)
    api/
      http.ts             Isomorphic typed fetch (server-direct / browser-via-BFF,
                          single-flight 401 refresh, in-memory access token)
      products.ts categories.ts blog.ts cart.ts market.ts   one module per resource
      auth.ts orders.ts checkout.ts                          auth, orders, payments
      admin.ts                                                admin writes — order status/refund, product CRUD, blog publish (+ISR), audit; best-effort over optimistic local state
  components/
    MarketContext.tsx     Client market state; setter persists via /market/override
    CartContext.tsx       Client cart store (localStorage) + drawer/sign-in open state
    AuthContext.tsx       Auth session — silent refresh, login/register, cart-merge, demo fallback
    CommerceProvider.tsx  Market + cart + auth context with the global drawer + sign-in modal
    SiteChrome.tsx        Inner-page chrome (commerce + navbar [solid | hero] + footer)
    Navbar.tsx Footer.tsx
    primitives/           Seal, Stars, Badge, SpicePhoto, Icon, Reveal, Motif, ImageSlot
    cards/Cards.tsx       CardB + CardCFinal (+ Wish, WeightSeg, price helpers)
    home/                 HomeHero, Sections, StorySections, Heritage, HomePage shell
    catalog/              CatalogControls (banner/dropdown/chips), CatalogClient
    product/              BuyBox (breadcrumb/gallery/buy-box), Sections, ProductDetail
    categories/           CategoriesClient (prep features, flavour band, collections)
    search/               SearchClient (scoring, highlight, tabs, idle/empty states)
    cart/                 CartDrawer, SignInModal
    checkout/             CheckoutClient (header, sections, delivery/payment, summary)
    account/              AccountClient (gate/dashboard switch), SignedOutGate,
                          AccountDashboard (sidebar + views), AccountTracking (timeline)
    journal/              JournalClient (index), ArticleClient (post)
    recipes/              RecipesClient (hub), RecipeDetailClient (ingredients/method/shop)
    marketing/            AboutClient, GiftsClient (cart-wired sets), WholesaleClient
                          (application form + tiers + FAQ), ContactClient, FaqClient
                          (scroll-spy rail), ShippingClient (market rate cards),
                          NotFoundClient, SupportCommon (dark header + tabs + SIcon + CTA)
    legal/                LegalCommon (header + sticky TOC + .prose primitives),
                          legal-content (privacy / terms / cookies section data)
    admin/                AdminApp (gate + hash router), AdminGate (branded sign-in),
                          AdminShell (rail + topbar), AdminPrimitives (icons/atoms),
                          AdminCharts (area/spark/donut SVG), AdminDashboard (3 layouts),
                          AdminOrders, AdminProducts, AdminBlog, AdminAudit
  types/global.d.ts       <image-slot> custom-element JSX typing
public/
  image-slot.js           The photo-drop web component (drop real photos onto tiles)
  assets/hero-spices.png  Simulated hero still (until real frames are hosted)
```

### The patterns that matter (spec §7)

- **BFF cookie forwarding.** The browser only ever calls same-origin `/api/*`.
  `app/api/[...path]/route.ts` forwards each request to the Express API carrying
  the HttpOnly cookies (`x-market`, `guestCartToken`, refresh token) and the
  Bearer token, and relays `Set-Cookie` back. Tokens never touch client JS.
- **Market resolution.** `lib/market.ts` reads the signed HttpOnly `x-market`
  cookie **server-side** so the first paint has the right currency + CTA colour.
  The switcher (`MarketContext`) calls `POST /market/override` through the BFF,
  then `router.refresh()` re-renders the server tree. USD = amber CTA,
  LKR = forest CTA; money formats per currency (`Rs 2,150` / `$14.50`).
- **Typed API client.** No `fetch` in components — every call goes through
  `lib/api/*`. The client is isomorphic: direct-to-API with forwarded cookies on
  the server, via the BFF with `credentials:"include"` in the browser, with one
  de-duplicated `/auth/refresh` + replay on 401.
- **Adapter.** `toSpice()` maps a live `Product` onto the prototype's flat
  `Spice` shape (representative price per market, accent palette by `color` or a
  hashed fallback) so every ported component renders unchanged on live or demo
  data.

---

## Configuration

| Env var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Express API base (dev `http://localhost:4000`). |
| `NEXT_PUBLIC_SITE_URL` | Public origin — canonical URLs, sitemap, OpenGraph. |
| `NEXT_PUBLIC_ASSETS_URL` | CDN/R2 base for hero frames + photography (optional). |
| `REVALIDATION_SECRET` | On-demand ISR hook the backend calls after blog publish. |

> Deploy this app and the API on the **same parent domain**
> (`aranyaceylon.com` + `api.aranyaceylon.com`) so the HttpOnly cookies stay
> `sameSite=lax`. Add this app's origin to the backend's `FRONTEND_URL` CORS
> allow-list.

### Real hero frames
The hero currently simulates the 192-frame sequence with one still. To use real
frames, host `0001.webp … 0192.webp` on `NEXT_PUBLIC_ASSETS_URL/frames/` and set
`USE_REAL_FRAMES = true` in `src/components/home/HomeHero.tsx`.

### Real photography
Category, story, and product photos drop into the `<image-slot>` placeholders
(drag an image onto a tile in the browser). Until then the spice-tinted
`SpicePhoto` base keeps the layout on-brand.

---

## Notes & what's next

- Routes built: `/`, `/products`, `/products/[slug]`, `/categories`,
  `/categories/[slug]`, `/search`, `/cart`, `/checkout`, `/account`, `/journal`,
  `/journal/[slug]`, `/recipes`, `/recipes/[slug]`, `/about`, `/gifts`,
  `/wholesale`, `/contact`, `/faq`, `/shipping`, `/privacy`, `/terms`,
  `/cookies`, `/admin`, plus the App-Router `not-found` (404). **Every footer
  and nav link now resolves to a real page** — the storefront is link-complete.
- **Journal** reads the live blog API (`/blog`, `/blog/:slug`) with the demo
  journal as fallback; search's article links now resolve. **Recipes** are
  curated content (no live endpoint in the spec) and ship as the demo set; the
  recipe page's "shop the spices" / "add all" push real lines into the cart.
- **Auth & account** are wired to the typed `/auth/*`, `/orders`, `/cart/merge`,
  and `/checkout/*` clients. With the backend running they work end-to-end; with
  it down, sign-in falls back to a local **demo session** (spec §11).
- **Live cart sync** today = the optimistic localStorage store + guest-cart-token
  forwarding through the BFF + **cart-merge on login**. Full bidirectional
  hydration from `GET /cart` is intentionally left to connect against the live
  backend.
- **Payments**: checkout calls `/checkout/create-intent` and polls the order;
  the Stripe Elements (intl) / PayHere hosted-form (local) confirm step plugs in
  where noted in `CheckoutClient`. Offline it resolves to the local confirmation.
- **Admin console** (`/admin`, Phase 7) is a standalone full-screen app, role-gated
  to `ADMIN`/`SUPERADMIN`. It mounts its **own** `AuthProvider` (no storefront
  navbar/footer/cart) and detects a real admin via `/auth/me` role; offline the
  branded sign-in gate grants a local demo session so the console stays reviewable
  (spec §11). All mutations — order status/refund, product create/edit/visibility,
  blog publish/schedule — update optimistic local state immediately and **best-
  effort** sync through `lib/api/admin.ts` (blog publish also pokes the ISR
  revalidate hook). The dashboard offers three switchable layouts (Command /
  Editorial / Dense), persisted to localStorage; route state lives in the URL hash.
  The demo dataset is **seeded/deterministic** so server and client render identically.
- All storefront marketing, support and legal pages are now ported. Remaining
  work is backend wiring (replace the demo data + form `setState` submits with
  the BFF/API), real photography into the `<image-slot>`s, and a cookie-consent
  banner to back the Cookie Policy.
