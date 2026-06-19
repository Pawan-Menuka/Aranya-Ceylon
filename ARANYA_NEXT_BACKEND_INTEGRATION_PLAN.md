# Aranya Ceylon — `aranya-next` Backend Integration Plan

A detailed, execution-ready plan to finish connecting the `aranya-next` frontend
to the Express + Prisma backend. Written to be handed to **Sonnet 4.6** and worked
phase by phase.

**Stack:** `aranya-next/` (Next.js 14 App Router) · `backend/` (Express + Prisma +
Neon/PostgreSQL) · BFF proxy at `aranya-next/src/app/api/[...path]/route.ts` →
`http://localhost:4000`.

**Goals (what "done" means):**
1. **Checkout works** — adding to cart and clicking "Place order" reaches a real
   payment step and creates a paid order (no more "Your basket is empty").
2. **Dashboards are backend-driven** — the customer account and the admin console
   show **real data**, not hardcoded demo content; demo fallback only in true
   offline dev, never masking a logged-in session.
3. **Gifts & Recipes are admin-editable** — `/gifts`, `/recipes`, `/recipes/[slug]`
   read from the backend, and an admin can create/edit/delete that content.
4. Keep hardcoded (no change): `/about`, `/faq`, `/shipping`, `/cookies`,
   `/privacy`, `/terms`.

> **Working rule for the executor:** run the backend (`pnpm dev:backend`) and the
> frontend (`pnpm --filter aranya-next dev`) together and **seed/verify a real
> admin user and a customer user** before claiming any phase done. After each
> phase, test the exact user flow described in its "Verify" block. Do **not** rely
> on the demo-fallback path to declare success.

---

## Root-cause summary (evidence)

| # | Symptom | Root cause | Files |
|---|---|---|---|
| A | Checkout shows "Your basket is empty" | Cart is **localStorage-first**; `CommerceProvider` is mounted **per route** (re-mounts on nav to `/checkout`) and `CartContext`'s persist effect runs with EMPTY state on mount → desync/wipe. The backend cart (what checkout uses) is separate and usually empty. | `aranya-next/src/components/CartContext.tsx`, `src/app/checkout/page.tsx`, every `*/page.tsx` that wraps its own `CommerceProvider` |
| B | Even with items, payment never happens | Backend `createIntent` does `req.user!.userId` → **throws for guests**; looks up cart **by userId only** (ignores guest-cart token); request body + response shapes **mismatch** the frontend. | `backend/src/controllers/checkout.controller.ts`, `aranya-next/src/lib/api/checkout.ts`, `src/components/checkout/CheckoutClient.tsx`, `@aranya/shared` `checkoutSchema` |
| C | Dashboards look hardcoded | Every loader silently falls back to demo data on **any** error; some tabs (addresses, wishlist, subscription, admin charts) have **no backend endpoints** and are pure hardcode. | `src/components/account/AccountDashboard.tsx`, `src/components/admin/*`, `src/lib/account-data.ts` |
| D | `/gifts`, `/recipes` not editable | **No `Recipe`/`Gift` Prisma models** exist; pages render from `src/lib/recipes-data.ts` / `gifts-data.ts`. | `backend/prisma/schema.prisma`, `src/app/gifts`, `src/app/recipes`, `src/components/recipes/*`, `src/components/marketing/GiftsClient.tsx` |

---

## Phase 0 — Foundation fixes (do first; everything depends on these)

### 0.1 Mount the commerce/auth providers ONCE at the root

**Problem:** Each page wraps its own `<CommerceProvider>` (see
`src/app/checkout/page.tsx`, and the storefront's `SiteChrome`). Navigating
remounts cart/auth/market state and triggers the localStorage race.

**Do:**
- Move `MarketProvider + CartProvider + AuthProvider + CartDrawer + SignInModal`
  into a single client wrapper rendered **once** in `src/app/layout.tsx` (wrap
  `{children}` in `<body>`). Resolve `initialMarket` in the root layout (server)
  and pass it down.
- Remove the per-page `<CommerceProvider>` wrappers (checkout, home, inner pages).
  Pages keep only their own chrome (e.g. checkout's minimal header).
- Keep `CommerceProvider` as the component, just rendered at the root.

**Verify:** Add an item on `/products`, navigate to `/checkout` via the cart
drawer — the cart state persists (no remount, no flash to empty).

### 0.2 Fix the cart persistence race in `CartContext.tsx`

**Problem:** `useEffect(() => setState(loadState()), [])` (hydrate) and
`useEffect(() => localStorage.setItem(CART_KEY, …), [state.items])` (persist) —
on mount the persist effect writes the EMPTY initial state, racing hydration
(and double-firing under React StrictMode in dev), which can blank the cart.

**Do:** gate persistence on a "hydrated" flag:
```ts
const hydrated = React.useRef(false);
React.useEffect(() => { setState(loadState()); hydrated.current = true; }, []);
React.useEffect(() => {
  if (!hydrated.current) return;            // never persist the pre-hydration EMPTY
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.items)); } catch {}
}, [state.items]);
```

### 0.3 Make the BACKEND cart the source of truth (the real fix for "empty basket")

**Problem:** items are only POSTed to `/cart/items` when `add()` is called **with
`backendIds`**. Adds from cards/quick-add without resolved variant IDs never reach
the backend, so `createIntent` (which builds the order from the server cart) sees
an empty cart.

**Do:**
- On app mount (in `CartProvider`), call `GET /cart` and hydrate cart state from
  the backend response (this also makes the backend issue/set the `guestCartToken`
  cookie via the BFF). Use the backend cart as the canonical list; keep optimistic
  UI on top.
- Ensure **every** path that adds to cart resolves a real `{ productId, variantId }`
  before calling `add()`. Audit all `cart.add(...)` call sites (product `BuyBox`,
  catalog cards, home "bestsellers", quick-add) and pass `backendIds`. A card that
  only has display data must look up the product's variant for the selected weight +
  current market (reuse `resolveVariant` from `BuyBox`) before adding. If a card
  truly can't resolve a variant, it should link to the product page instead of a
  silent local-only add.
- After add/update/remove, prefer reconciling against the server response (the
  backend `GET/POST /cart` returns the authoritative cart with item IDs) instead of
  fire-and-forget.

**Verify:** add items, then `GET /api/cart` in the browser devtools Network tab —
the backend cart contains the same items. The `guestCartToken` cookie is set.

### 0.4 Demo-fallback policy (so dashboards stop looking hardcoded)

**Problem:** loaders fall back to demo data on **any** error, masking real failures
and showing hardcoded content even when signed in.

**Do:** establish one rule and apply it everywhere:
- **Public catalog/blog/recipes/gifts (server components):** demo fallback allowed
  ONLY when the API is unreachable (network/502). On success, always use live data.
- **Authenticated dashboards (account + admin):** **no demo fallback.** Show three
  explicit states: `loading`, `error` (with a retry), and `empty` (e.g. "No orders
  yet"). Never substitute demo rows for a logged-in user.
- Gate any remaining demo data behind `process.env.NODE_ENV !== "production"` so it
  can never ship.

---

## Phase 1 — Cart & Checkout (fix the payment flow)

This is the top priority. Two sides: backend `createIntent` must support the real
request, and the frontend must send the right payload and confirm payment.

### 1.1 Backend — make checkout work for guests + users

**File:** `backend/src/controllers/checkout.controller.ts`

- **Do not** use `req.user!.userId` unconditionally. Resolve the cart by user OR
  guest token:
  ```ts
  const userId = req.user?.userId ?? null;
  // cartService should already resolve a cart by userId or the guest cookie —
  // reuse the same resolver the cart controller uses (getOrCreateCart).
  const cart = await getCartForRequest(req); // by userId, else guestCartToken
  if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  ```
- Accept **guest checkout**: require `guestEmail` when there is no `userId`; persist
  it on the order (`Order.guestEmail` — add the column if missing). Switch the order
  `userId` to nullable for guests.
- Align the request contract. Either (recommended) **extend `checkoutSchema`** in
  `@aranya/shared` to match what the UI naturally sends, or adjust the UI (Phase 1.2)
  — but they MUST match. Target schema:
  ```ts
  checkoutSchema = {
    guestEmail?: string,            // required if not authenticated
    customerName?: string,
    customerPhone?: string,
    shippingMethod: "standard" | "express",
    saveAddress?: boolean,
    couponCode?: string,
    giftWrap?: boolean,
    giftNote?: string,
    shippingAddress: { firstName, lastName, line1, line2?, city, region?,
                       postalCode?, country }  // country = ISO-2 ("LK","US",…)
  }
  ```
- Fix the cross-market check to compare ISO codes (`country !== 'LK'`) and make sure
  the frontend sends ISO-2 country codes.
- Return a **stable, documented shape** the client already expects
  (`aranya-next/src/lib/api/checkout.ts`):
  ```jsonc
  // Stripe (international)
  { "provider": "stripe", "orderId": "...", "clientSecret": "...", "publishableKey": "pk_..." }
  // PayHere (local)
  { "provider": "payhere", "orderId": "...", "action": "<payhere url>", "params": { ... } }
  ```
  (Rename the current `gateway`/`payHerePayload` fields, and include the Stripe
  publishable key + PayHere form `action` URL.)
- Confirm `POST /checkout/create-intent` stays on `optionalAuth` and that
  `resolveMarket` runs before it.

**Verify (backend, via curl/REST):** with an empty `Authorization` header but a
`guestCartToken` cookie that has items, `POST /checkout/create-intent` returns a
`provider/orderId/clientSecret|params` payload and creates a PENDING order.

### 1.2 Frontend — send the right payload + actually confirm payment

**File:** `aranya-next/src/components/checkout/CheckoutClient.tsx`

- Make the shipping-address and contact fields **controlled** and send their real
  values (today they're empty placeholders — `shippingAddress: { firstName: "", … }`).
  Map the country selector to **ISO-2 codes**. Map the delivery radio to
  `shippingMethod`. Pass `guestEmail` (the email field) when not signed in.
- Replace the fake card form with real confirmation:
  - **International (Stripe):** add `@stripe/stripe-js` + `@stripe/react-stripe-js`.
    Use the returned `clientSecret` + `publishableKey` to mount Stripe Elements and
    `stripe.confirmPayment(...)`. On success, poll `GET /orders/:id` (existing
    `pollOrderPaid`) until PAID, then show the confirmation screen.
  - **Local (PayHere):** build a hidden `<form action={action} method="POST">` from
    the returned `params`, submit it (redirect to PayHere). Implement the return URL
    (`/checkout/success?order=…`) that polls `pollOrderPaid` for the webhook lag.
- The empty-cart guard (`if (items.length === 0)`) is fine once Phase 0.3 makes the
  cart reliable — keep it, but ensure it reflects the hydrated/backend cart.

**File:** `aranya-next/src/lib/api/checkout.ts` — align `CheckoutInput` to the schema
in 1.1 (rename `deliveryMethod`→`shippingMethod`, add `guestEmail`, `customerName`,
`customerPhone`, `saveAddress`). Keep `pollOrderPaid`.

**Verify (end-to-end):**
1. As a **guest**, add a product, go to `/checkout`, fill contact + address,
   place order → reach the Stripe/PayHere step → complete a test payment → land on
   the confirmation screen, and the order shows in the backend as PAID (webhook).
2. Repeat **signed in** — the order appears under `/account` order history.
3. The "Your basket is empty" screen only appears when the cart is genuinely empty.

> Note: Stripe/PayHere need test keys in the backend env (`STRIPE_SECRET_KEY`,
> `STRIPE_PUBLISHABLE_KEY`, PayHere merchant id/secret) and the webhook routes
> (`/webhooks/stripe`, `/webhooks/payhere`) reachable. If keys aren't available
> yet, implement the flow but document that it needs keys to fully transact.

---

## Phase 2 — Dashboards fully backend-driven

Apply the Phase 0.4 demo-fallback policy, verify the existing wiring against a
real session, and wire the still-hardcoded sections.

### 2.1 Customer account (`/account`)

**File:** `aranya-next/src/components/account/AccountDashboard.tsx` (+ `account-data.ts`)

- **Orders** — already calls `GET /orders`; remove the demo fallback for signed-in
  users; add loading/empty/error states. Verify the `toAccountOrder()` adapter
  against a real order created by Phase 1.
- **Profile** — already `PATCH /auth/me`; show real `GET /auth/me` values on load
  (name, email, phone) instead of `ACCOUNT.user` constants.
- **Addresses tab** — currently hardcoded; the `Address` model exists but **has no
  routes**. Add backend endpoints and wire them:
  ```
  GET    /auth/me/addresses
  POST   /auth/me/addresses
  PATCH  /auth/me/addresses/:id
  DELETE /auth/me/addresses/:id
  ```
- **Wishlist tab** — hardcoded; `WishlistItem` model exists, no routes. Add:
  ```
  GET    /wishlist           POST /wishlist {productId}     DELETE /wishlist/:productId
  ```
  Wire the wishlist heart on product cards/detail to these.
- **Subscription tab** — `Subscription` model exists but is roadmap; either wire a
  read-only `GET /auth/me/subscription` or keep this single tab clearly static.
  (Decide with the owner; not required for "dashboard is backend-driven".)

### 2.2 Admin console (`/admin`)

Components: `AdminDashboard.tsx`, `AdminOrders.tsx`, `AdminProducts.tsx`,
`AdminBlog.tsx`, `AdminAudit.tsx`, `AdminCharts.tsx`.

- **Gate** the whole console behind a real role check (`AdminGate.tsx`): require an
  authenticated user with role `ADMIN`/`SUPERADMIN` (from `GET /auth/me`); redirect
  others. The backend already enforces role on `/admin/*`, but the UI must not show
  the shell to non-admins.
- **Dashboard KPIs** — bind the cards to `GET /admin/dashboard` (revenue split by
  market, order counts, pending fulfilment, low-stock, recent audit). Remove demo
  numbers.
- **AdminCharts** — currently hardcoded series. Either (a) derive the series from the
  `/admin/dashboard` payload, or (b) add a small backend analytics endpoint
  (`GET /admin/analytics?range=30d` → revenue/orders time series) and bind to it.
  Pick (a) if the dashboard payload is enough; otherwise (b).
- **Orders / Products / Blog / Audit** — already wired (per the connection log);
  remove demo fallbacks, add loading/empty/error, and verify each adapter against
  real data. Confirm product create/edit posts the full variant array (weights,
  price, sku, stock, market, currency) and that the variant-reconciliation update
  works.

**Verify:** sign in as a seeded ADMIN. Every admin tab shows real DB data; creating
a product/blog post makes it appear on the public site; changing an order status is
reflected in `/account` for that customer and writes an audit-log row.

---

## Phase 3 — Gifts & Recipes (admin-editable content)

These have **no backend** today. Add models + endpoints + admin CRUD, then point the
public pages at the API. Seed from the existing data files so nothing is lost.

### 3.1 Backend — Prisma models + migration

**File:** `backend/prisma/schema.prisma` — add:
```prisma
model Recipe {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  excerpt     String?
  heroImage   String?
  bodyMdx     String          // long-form content (MDX/markdown)
  category    String?         // e.g. "Curries", "Sweets", "Drinks"
  prepMins    Int?
  cookMins    Int?
  serves      Int?
  ingredients Json            // string[] or [{group,items[]}]
  steps       Json            // string[]
  spiceSlugs  String[]        // links to products ("uses these spices")
  status      BlogStatus  @default(DRAFT)   // reuse the Blog status enum
  publishedAt DateTime?
  authorId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([status, publishedAt])
}

model GiftSet {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  description String?
  image       String?
  priceLKR    Decimal? @db.Decimal(10,2)
  priceUSD    Decimal? @db.Decimal(10,2)
  contents    Json            // string[] of what's inside
  productSlugs String[]       // optional links to included products
  status      BlogStatus @default(DRAFT)
  featured    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```
Run `prisma migrate dev` (or `db push` against Neon as the repo does). Then write a
**seed script** that imports the records currently in
`aranya-next/src/lib/recipes-data.ts` and `gifts-data.ts` so the live content
matches today's pages.

### 3.2 Backend — controllers + routes

Mirror the blog pattern (`blog.controller.ts` + `admin/blog.admin.controller.ts`).

Public (read; published only):
```
GET /recipes            ?limit&cursor&category        → { items, nextCursor }
GET /recipes/:slug                                    → { recipe }
GET /gifts              ?featured                      → { items }
GET /gifts/:slug                                      → { gift }
```
Admin (role-gated, all statuses), register under `/admin`:
```
GET    /admin/recipes      GET /admin/recipes/:id
POST   /admin/recipes      PATCH /admin/recipes/:id    DELETE /admin/recipes/:id
GET    /admin/gifts        GET /admin/gifts/:id
POST   /admin/gifts        PATCH /admin/gifts/:id       DELETE /admin/gifts/:id
```
Register the public routes in `backend/src/index.ts`
(`app.use('/recipes', …)`, `app.use('/gifts', …)`) and the admin ones in
`admin.routes.ts`. Use the existing `requireAuth + requireRole('ADMIN','SUPERADMIN')`
middleware and write audit-log entries on create/update/delete (reuse `audit.service`).

### 3.3 Frontend — API clients + page wiring

- New `aranya-next/src/lib/api/recipes.ts` and `gifts.ts` (mirror `blog.ts`):
  `listRecipes`, `getRecipe(slug)`, `listGifts`, `getGift(slug)`, plus admin
  variants in `admin.ts` (`listAdminRecipes/createRecipe/updateRecipe/deleteRecipe`,
  same for gifts).
- Convert the pages to **server components that fetch live data** (SSG/ISR), keeping
  the existing `recipes-data.ts`/`gifts-data.ts` ONLY as an offline-dev fallback
  (per Phase 0.4):
  - `src/app/recipes/page.tsx` → `listRecipes()`
  - `src/app/recipes/[slug]/page.tsx` → `getRecipe(slug)` + `generateStaticParams`
  - `src/app/gifts/page.tsx` → `listGifts()`
  - render MDX/markdown body with a markdown renderer (e.g. `next-mdx-remote`).
- Keep the exact visual design of `RecipesClient`/`RecipeDetailClient`/`GiftsClient`
  — only swap the data source from the static import to props fed by the server
  component.

### 3.4 Frontend — admin editors

- Add `AdminRecipes.tsx` and `AdminGifts.tsx` mirroring `AdminBlog.tsx` (list +
  create/edit form with status DRAFT/PUBLISHED, slug, body, images, the structured
  fields), wired to the Phase 3.2 admin endpoints.
- Register them as tabs in `AdminApp.tsx` / `AdminShell.tsx` nav.

**Verify:** as ADMIN, create a recipe and a gift set → they appear on `/recipes`,
`/recipes/[slug]`, and `/gifts`. Edit one → the public page updates (allow for ISR
revalidate). Delete one → it disappears.

---

## Cross-cutting checklist

- [ ] `pnpm-workspace.yaml` includes `aranya-next` (per the connection log) and the
      app builds: `pnpm --filter aranya-next build` and `pnpm --filter @aranya/backend typecheck`.
- [ ] One root-level provider tree (Phase 0.1); no per-page `CommerceProvider`.
- [ ] Backend cart is authoritative; `guestCartToken` round-trips through the BFF
      (the proxy already forwards `Set-Cookie` — keep it).
- [ ] No demo data is reachable in `NODE_ENV=production`.
- [ ] `@aranya/shared` `checkoutSchema` and `aranya-next` `CheckoutInput` are identical.
- [ ] New env documented: Stripe publishable key exposed to the client for Elements
      (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`), backend payment keys + webhook secrets.
- [ ] Country codes are ISO-2 throughout checkout.

## Suggested execution order for Sonnet

1. **Phase 0** (providers at root, persist fix, backend-cart hydration, demo policy)
   — small, unblocks everything.
2. **Phase 1** (checkout) — backend `createIntent` guest+schema+response, then the
   frontend payload + Stripe/PayHere confirmation. Test guest + signed-in.
3. **Phase 2** (dashboards) — admin gate + dashboard KPIs/charts; account orders/
   profile; then addresses + wishlist endpoints.
4. **Phase 3** (gifts & recipes) — models + seed + endpoints, public wiring, admin
   editors.

Work one phase at a time; run both servers and complete the phase's **Verify**
block before moving on. Commit per phase with a clear message.

---

### Reference (current behaviour, for the executor)
- BFF proxy + isomorphic client: `aranya-next/src/lib/api/http.ts`,
  `src/app/api/[...path]/route.ts` (forwards cookies + Set-Cookie — leave intact).
- Auth/session bootstrap already exists: `src/components/AuthContext.tsx` (silent
  `/auth/refresh` → `/auth/me` on mount). Access token is in-memory by design.
- Cart logic: `src/components/CartContext.tsx`, `src/lib/cart.ts`,
  `src/lib/api/cart.ts`.
- Backend routes mounted in `backend/src/index.ts`: `/auth /products /blog
  /categories /market /cart /checkout /orders /admin /contact /wholesale` (+
  `/recipes /gifts` after Phase 3).
