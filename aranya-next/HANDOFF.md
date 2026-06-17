# Aranya Ceylon → Next.js rebuild — HANDOFF / CONTINUATION BRIEF

Paste this whole file into a new chat to continue the project. It captures the
goal, the rules, what's built, how it's structured, and exactly what's left.

---

## 1. The task

Convert the existing **Aranya Ceylon** storefront prototype (static HTML + React-
via-Babel-in-browser, in the project root) into a **production Next.js (App
Router) + TypeScript** app, following the architecture in
`uploads/ARANYA_FRONTEND_SPEC.md` (Express + Prisma REST backend, BFF pattern,
SSG/ISR, Stripe/PayHere, etc.).

**Hard rule from the user (do not violate):** reproduce the existing UI design
**pixel-for-pixel**. The prototype is the visual source of truth. If the spec doc
mentions anything that would change the visual design (colours, fonts, buttons,
theme, spacing), **ignore that part** — keep the prototype's look exactly.

The output is delivered as a downloadable zip of the `aranya-next/` folder
(`present_fs_item_for_download` on `aranya-next`). The user runs it locally with
`npm install && npm run dev` — **this environment cannot run a Next build**, so we
port faithfully from the prototype source and the user verifies compile on their
machine.

Work is **phased**, one or two routes at a time, re-zipping after each phase.

## 2. Brand / design system (from CLAUDE.md — already encoded in globals.css)

- Forest green `#0F6E56`, secondary `#1D9E75`, amber CTA `#BA7517`, cream bg
  `#FDFAF5`, surface `#F4F0E8`, ink `#1A1A1A`, muted `#5C5248`.
- **Three locked type roles:** Cormorant Garamond = display (`--font-display`),
  Plus Jakarta Sans = UI (`--font-ui`), Spectral = long-form `.prose`
  (`--font-read`). Wired via `next/font` in `app/layout.tsx`.
- **Market rule:** International = USD + amber CTA; Local (Sri Lanka) = LKR +
  forest CTA. Money: LKR whole (`Rs 2,150`), USD 2dp (`$14.50`).
- Tokens live in `aranya-next/src/app/globals.css` (ported verbatim from the
  prototype's `aranya.css` + the homepage `<style>` block + per-phase additions).

## 3. Architecture & conventions (KEEP DOING THIS)

- **Port, don't redesign.** Each prototype file (`catalog.jsx`, `product-detail*.jsx`,
  etc.) maps to a typed `.tsx`. Copy markup/styles exactly; only change the
  plumbing (JSX→TSX, `window` globals→ES modules, in-browser Babel→real build,
  hardcoded data→typed API client + demo fallback, `.html` links→Next routes).
- **BFF pattern (spec §7):** browser only calls same-origin `/api/*`
  (`app/api/[...path]/route.ts`), which forwards to the Express API carrying
  HttpOnly cookies (`x-market`, `guestCartToken`, refresh token) + Bearer, and
  relays `Set-Cookie` back.
- **Typed API client:** no `fetch` in components. `lib/api/http.ts` is isomorphic
  (server-direct with forwarded cookies / browser-via-BFF with credentials),
  single-flight 401 refresh, access token in memory only. One module per resource
  in `lib/api/`.
- **Market** resolves server-side from the `x-market` cookie (`lib/market.ts`),
  passed into client via `MarketProvider`; switching POSTs `/market/override` then
  `router.refresh()`.
- **Demo fallback everywhere** (spec §11 acceptance criterion): every page works
  with the backend down by falling back to the typed demo datasets in `lib/`.
- **Adapters** map live API models → the prototype's flat view-models
  (`toSpice`, `toCatalogSpice`, `toPost`) so ported components render unchanged.
- **SSG/ISR** with `generateStaticParams` + `revalidate = 300` on catalog/
  product/journal detail; client components own interactivity; filter/search
  state is URL-synced and server-resolved on first paint.
- **Fonts/CSS:** never invent tokens; use the `--*` vars already in globals.css.

## 4. What's BUILT (Phases 1–6) — all in `aranya-next/`

Foundation: Next 14 + TS scaffold, `globals.css` (all tokens + responsive grids),
`app/layout.tsx` (next/font + metadata), BFF proxy, `lib/api/http.ts` + resource
clients (`products, categories, blog, cart, market, auth, orders, checkout`),
`lib/` data + helpers (`types, money, market, cart, spice-data, catalog-data,
pd-content, journal-data, recipes-data, account-data`).

Contexts (all mounted via `CommerceProvider` = Market + Cart + Auth, with the
global `CartDrawer` + `SignInModal`): `MarketContext`, `CartContext`
(localStorage optimistic store), `AuthContext` (silent refresh, login/register,
cart-merge on login, offline demo session).

Chrome: `Navbar` (glass/auto-hide, hero & solid modes; account icon → /account or
sign-in modal; live bag count), `Footer`, `SiteChrome` (`hero` prop switches
navbar mode).

**Routes done & working:**
- `/` homepage (spice-dust hero + category accordion + all sections)
- `/products` catalog (facet filters form/origin/flavour, sort, load-more, URL-synced)
- `/products/[slug]` product detail (gallery, market buy-box, flavour/specs/pairings/reviews/related, Product JSON-LD)
- `/categories` + `/categories/[slug]` (editorial landing → redirects into catalog)
- `/search` (catalog + journal, tabs, highlight, ?q= shareable)
- `/cart` → redirect to `/products?cart=1` (cart is the drawer, by design)
- `/checkout` (guest checkout, market delivery/payment, inline confirmation, calls `/checkout/create-intent` then falls back local)
- `/account` (gated: sign-in/register gate OR dashboard = overview/orders/order-detail-tracking/addresses/wishlist/profile; reorder → cart)
- `/journal` + `/journal/[slug]` (index + article, Article JSON-LD; live blog API → demo fallback)
- `/recipes` + `/recipes/[slug]` (hub + detail: sticky checkable ingredients, method, **shop-the-spices adds to cart**, Recipe JSON-LD)

## 5. What's LEFT — Phase 7: ADMIN (the only remaining surface)

Prototype source files to port (in project root):
- `Admin.html` + `admin-blog.jsx` — the admin area (orders/products/blog management).
- Read these first with `read_file`, then check for any other `admin-*.jsx` /
  admin data files referenced.

Build it the same way: typed `.tsx` under `src/components/admin/`, a route under
`src/app/admin/` (gated like `/account` — admin role check via `AuthContext`/
`useAuth().user.role`), typed API clients for any admin endpoints (extend
`lib/api/`), demo fallback. Admin is ADMIN/SUPERADMIN role-gated per the spec.
Match the prototype exactly; add admin-only API modules as needed (e.g. order
status updates, product CRUD, blog publish → which should hit the ISR revalidate
hook `REVALIDATION_SECRET`).

After Phase 7, optional cleanup the user may want: real marketing pages that
currently 404 (`/about`, `/gifts`, `/contact`, `/recipes` is done), and the two
documented boundaries below.

## 6. Known boundaries (documented in aranya-next/README.md "Notes & what's next")

- **Live cart sync** = optimistic localStorage store + guest-cart-token via BFF +
  cart-merge on login. Full bidirectional `GET /cart` hydration intentionally left
  to wire against the live backend (don't fake it — it would destabilise the
  offline demo). 
- **Payments:** checkout creates the intent + polls the order; the Stripe Elements
  (intl) / PayHere hosted-form (local) confirm step plugs in where marked in
  `CheckoutClient`. Offline → local confirmation screen (faithful to prototype).
- **Flavour facets** (catalog/search) come from curated data; the live `Product`
  model has no flavour tags yet. Category/form/origin derive from live data.

## 7. Workflow each phase

1. `read_file` the relevant prototype `.jsx` / data `.js` files in the project root.
2. Add typed data/helpers to `lib/`, components to `src/components/<area>/`,
   route(s) to `src/app/<route>/page.tsx`. Add any responsive grid CSS to
   `globals.css`. Wire to contexts/clients; keep demo fallback.
3. Update `aranya-next/README.md` (routes table, architecture tree, notes).
4. `present_fs_item_for_download` on `aranya-next` with label
   "Aranya Ceylon — Next.js storefront (Phases 1–N)".
5. Tell the user to `npm run dev` and click through the new routes (we can't build
   here). Keep the summary short.

## 8. Key files to re-read in the new chat before starting Phase 7

- `uploads/ARANYA_FRONTEND_SPEC.md` (the backend/architecture brief)
- `CLAUDE.md` (brand decisions — also auto-loaded as project instructions)
- `aranya-next/README.md` (current state of the rebuild, full file map)
- `Admin.html`, `admin-blog.jsx` (Phase 7 source)
- `aranya-next/src/components/account/AccountClient.tsx` + `AuthContext.tsx`
  (the gating pattern to mirror for admin role-gating)
- `aranya-next/src/lib/api/http.ts` + an existing client like `orders.ts`
  (the API-client pattern to extend)
