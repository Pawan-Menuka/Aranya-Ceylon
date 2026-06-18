# Aranya Ceylon — Frontend Port Plan

> Status: **proposal for review** (no code yet). Drafted 2026-06-12.
>
> **Decisions locked with the owner:**
> - Framework: **Next.js (App Router)**
> - Sequencing: **thin vertical slice first**, then breadth
> - **Guest checkout is in scope** (pulls in backend #17)
> - This document is the deliverable; implementation starts only after approval.

---

## 1. Why this port (the one-paragraph case)

The current `frontend/` is a high-fidelity **design prototype**: React via CDN `<script>` tags, JSX
compiled in the browser by Babel, components hung off `window`, one standalone HTML file per page, and a
single hand-written gateway (`api.js`). The design system is genuinely strong and worth preserving — but
the runtime architecture forfeits SEO (product pages render client-side after Babel runs), is slow on
mobile (Babel + unsplit JSX per page), and doesn't scale to maintain. The port keeps the *design* and
*API contract* and rebuilds them on a framework that does SSR/SSG, code-splitting, typed data, and the
two payment integrations properly. **This is a re-platforming of a finished design, not a redesign.**

---

## 2. What we keep vs. rebuild

| Asset (in `frontend/`) | Action |
|---|---|
| `aranya.css` (tokens, primitives, fonts) | **Keep** — import as a global stylesheet, lightly adapt |
| `CLAUDE.md` (design decisions — typography, cards, navbar, hero) | **Keep as spec** — the source of truth for the port |
| `*.jsx` components (cards, navbar, hero, sections, account, admin) | **Rebuild** as real TSX components (imports, not `window`) |
| Per-page `*.html` files | **Rebuild** as App Router routes |
| `api.js` (gateway, adapter, auth/refresh, paths) | **Rebuild** as a typed client using `@aranya/shared`; its logic/contract is the reference |
| `*-data.js` (demo catalog/spices/journal/recipes) | **Keep** as seed/fallback fixtures + local design data |
| `BACKEND_INTEGRATION.md` | **Keep as reference** — its endpoint mapping is accurate |
| Prototype debris (`about-2.jsx`, `product-detail-2.jsx`, `navbars.jsx`, `Font Study.html`, `design-canvas.jsx`, `tweaks-panel.jsx`) | **Quarantine** to `frontend-legacy/` or a `design-studies/` ref folder; don't port |

---

## 3. Target architecture

```
frontend/                      # becomes a real Next.js app (App Router)
  app/
    layout.tsx                 # fonts, <body>, providers, global aranya.css
    (storefront)/              # public marketing/shop routes (shared shell)
      page.tsx                 # Home
      products/page.tsx        # Catalog (SSG/ISR list)
      products/[slug]/page.tsx # Product detail (SSG/ISR per product)
      categories/...           # Categories
      search/page.tsx          # FTS search (client-driven)
      gifts/, recipes/, journal/[slug]/  # content
      (legal)/...              # terms, privacy, cookies, shipping, faq, about, contact
      checkout/                # checkout flow + success/cancel return pages
      account/                 # auth-gated dashboard, orders, addresses, wishlist
    admin/                     # role-gated admin shell + dashboard/orders/products/blog/audit
    api/ (optional)            # Next route handlers only if we need server-side proxying
  components/                  # ported design system (Navbar, cards, Hero, sections, footer…)
  lib/
    api/                       # typed client (replaces api.js), one module per resource
    market.ts                  # market resolution helpers (reads x-market cookie server-side)
    format.ts                  # currency/number formatting (cents-aware)
  styles/aranya.css            # design tokens + primitives (kept)
  content/                     # MDX rendering helpers for product/blog bodies
```

**Rendering strategy (the SEO payoff):**
- **Product list / detail, blog, category, marketing pages →** Server Components with **SSG + ISR**
  (revalidate on a timer or via a webhook/`revalidate` secret — note `.env.example` already has
  `REVALIDATION_SECRET`). Crawlers get full HTML + `Product`/`Article` structured data.
- **Cart, checkout, account, admin →** Client Components / dynamic (per-user, not cacheable).
- **Search →** client-driven calls to `/products/search`.

**Cookies & the dual market (important architectural detail):**
- The market is a **signed, HttpOnly `x-market` cookie**, set by `POST /market/override` and read by the
  backend's `resolveMarket`. Because it's HttpOnly, **client JS can't read it** — so market-aware Server
  Components must read the cookie via Next's `cookies()` and **forward it** when fetching the API. The
  market switcher calls `/market/override`, then refreshes server-rendered data.
- The **guest cart** uses an HttpOnly `guestCartToken` cookie; same forwarding rule applies.
- The **refresh token** cookie is HttpOnly, path `/auth/refresh`, `sameSite: 'lax'` (we set this in #14).
- **Deployment topology decision needed (see §8):** if the Next app and the API live on different
  registrable domains, cross-site cookies require `sameSite: 'none'; secure` — affects auth + cart + market.

---

## 4. API layer (replacing `api.js`)

Rebuild `api.js` as a small typed client under `lib/api/`, preserving its proven behaviour:
- **Single gateway**, no scattered `fetch`. One module per resource (`products`, `auth`, `cart`,
  `checkout`, `blog`, `market`).
- **401 auto-refresh** with de-duped concurrent refresh + single replay (port the existing logic — it's
  correct; only the *backend* refresh was broken, and that's fixed now).
- **Validate every payload** with `@aranya/shared` Zod schemas (the monorepo's whole point; the prototype
  couldn't use them). Response shapes parsed through shared schemas → drift becomes a compile/runtime error.
- **Port the product adapter** (`mapProduct`) — but several of its "MISSING BACKEND FIELDS" fallbacks are
  now real: backend already has `latin`, `originLabel`, `color`, and `ratingAvg`. Wire those through and
  drop the guesses.
- **Money is cents-aware**: backend now returns integer-cents totals; formatting helpers consume those.

---

## 5. Route map (prototype → Next)

| Prototype | Next route | Render |
|---|---|---|
| `Home.html` / `home-*.jsx` | `/` | SSG/ISR |
| `Catalog.html` / `catalog.jsx` | `/products` | SSG/ISR + client filter/sort |
| `Product Detail.html` / `product-detail.jsx` | `/products/[slug]` | SSG/ISR |
| `Categories.html` | `/categories`, `/categories/[slug]` | SSG/ISR |
| `Search.html` | `/search` | client |
| `Gifts.html`, `Recipes.html`, `RecipeDetail.html` | `/gifts`, `/recipes`, `/recipes/[slug]` | SSG/ISR |
| `Journal.html`, `Article.html` | `/journal`, `/journal/[slug]` | SSG/ISR (MDX) |
| `Checkout.html` / `checkout.jsx`, `cart-*.jsx` | `/checkout`, `/checkout/success`, `/checkout/cancel` | client |
| `Account.html` / `account*.jsx` | `/account/*` | dynamic, auth-gated |
| `Admin.html` / `admin-*.jsx` | `/admin/*` | dynamic, role-gated |
| Legal/support `*.html` | `/(legal)/*` | static |

---

## 6. Phased milestones

### Phase 0 — Scaffold + design system + **the vertical slice** ← start here
- Create the Next.js App Router app in `frontend/` (TypeScript, ESLint, depends on `@aranya/shared`).
- Wire fonts (Cormorant Garamond / Plus Jakarta Sans / Spectral) and import `aranya.css` tokens.
- Port the **shell**: `AranyaNavbar`, footer, market switcher, base layout — just enough to host a page.
- Build the **typed API client core** (request + 401 refresh + market-cookie forwarding) and the
  `products` resource with the ported adapter.
- **Vertical slice deliverable:** the **`/products` catalog page rendered server-side from the LIVE
  backend**, with the real market switcher changing currency/catalog, falling back to demo data if the
  API is down. This proves the entire pipeline (SSR + cookies + market + typed client + design tokens)
  end-to-end before we port breadth.

### Phase 1 — Catalog & product detail (SEO core)
- `/products/[slug]` with image gallery, variant/weight picker, certifications badges, MDX description,
  approved reviews + rating. SSG/ISR + `Product` structured data, OG tags, sitemap.

### Phase 2 — Cart + checkout + **guest checkout (#17)**
- Server-synced cart (port `cart-store.js` logic onto `/cart` with the guest-token cookie; merge on login).
- Checkout form → `/checkout/create-intent`. **Stripe Elements** (international) and the **PayHere
  hidden-form auto-submit + return-page polling** (local) — the success page handles the PENDING→PAID
  webhook lag with a "confirming payment…" state.
- **Backend #17:** make `createIntent` accept guest sessions (resolve cart by `userId` *or* guest-token,
  require `guestEmail`), switch the route to `optionalAuth`. Tests added alongside.

### Phase 3 — Auth & account
- Sign-in/up modals + pages; wire `login`/`register`/`me`/`logout` and the auto-refresh client.
- Account dashboard: orders + `OrderEvent` timeline stepper, addresses, wishlist, subscription.
- Note the #9 behaviour change: register no longer auto-logs-in → UX routes to sign-in.

### Phase 4 — Content & SEO finish
- Blog (MDX), tags, journal, recipes; sitemap, robots, structured data, OG images across the site.

### Phase 5 — Admin
- Role-gated admin shell: dashboard analytics, orders (status/refund), products, blog editor +
  scheduling, audit-log viewer. Wire the 12 admin endpoints.

### Phase 6 — Polish & roadmap items
- i18n (Sinhala/Tamil local, English intl), transactional emails wiring, abandoned-cart, perf pass.

---

## 7. Backend work this port requires

Most of the backend is ready. New/again backend work, by phase:
- **#17 guest checkout** (Phase 2): `optionalAuth` on checkout, cart resolution by guest token, add
  `guestEmail` to `checkoutSchema`, persist on the order. (~half a day + tests.)
- **Product list response shape** (Phase 0/1): confirm `/products` returns the fields the adapter/SEO need
  (variants with `price`/`currency`/`weight`, `images`, `category`, `ratingAvg`, `latin`, `originLabel`).
- **Revalidation hook** (Phase 1/4): a small authenticated endpoint or use Next ISR timers for content
  freshness (`REVALIDATION_SECRET` already provisioned).
- **#28 Neon stale connections** (before any deploy): unrelated to the port but blocks a healthy prod.

---

## 8. Decisions still needed from the owner

1. **Deployment topology** — same registrable domain for app + API (e.g. `aranyaceylon.com` +
   `api.aranyaceylon.com`) or different? Determines cookie `sameSite` (`lax` vs `none; secure`) for auth,
   cart, and market. **Recommend same parent domain** to keep `lax`.
2. **Hosting target** — Vercel (best Next DX) vs the platform already used for the API. Affects ISR/edge.
3. **Real product photography** — the prototype uses styled placeholders; premium positioning needs real
   images in Cloudinary. Not a blocker for the slice, but is for launch.
4. **Legacy prototype** — quarantine to `frontend-legacy/` (keep for visual reference) or delete once a
   page is ported? Recommend quarantine until Phase 4.

---

## 9. Out of scope (explicit)

- Mobile native apps; the `ios-frame`/`mobile-*` prototype screens inform responsive design but we build
  one responsive web app, not a separate mobile build.
- Wholesale B2B portal beyond what exists (tracked separately in roadmap).
- The #28 Neon fix and transactional-email templates are referenced but tracked in `KNOWN_ISSUES.md`.

---

## 10. Suggested immediate next step

On approval: execute **Phase 0** and hand back the running `/products` vertical slice (live data + market
switch + design tokens) for review before porting further. That single slice de-risks every cross-cutting
concern — SSR, HttpOnly cookie forwarding, market resolution, the typed client, and the design system —
in one reviewable increment.
