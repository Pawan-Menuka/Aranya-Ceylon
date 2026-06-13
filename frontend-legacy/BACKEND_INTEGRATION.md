# Aranya Ceylon — Backend Integration Guide

Connecting this frontend (static HTML + React-via-CDN) to your **Node + Express + TypeScript + Prisma (Postgres)** REST API.

The frontend is built so that **all data and actions flow through one file: `api.js`** (`window.AranyaAPI`). You wire pages to the backend by replacing their hardcoded data reads and mock form submits with `AranyaAPI` calls. Nothing else should ever call `fetch()`.

---

# ⭐ START HERE — finishing this in Claude Code (or Cursor) on your machine

You're connecting this frontend to a backend on your **local machine**. The best tool for that is Claude Code / Cursor running locally, because it can start your server, hit real endpoints, and see live network responses — things a hosted preview can't.

**The work is already 60% done and structured for handoff:**
- ✅ `api.js` — the full API client mapped to YOUR real routes (products, auth+refresh, cart, checkout). The hard part.
- ✅ `Catalog.html` + `catalog.jsx` — **a complete, working reference** of a page converted to live data. Copy this pattern for the rest.
- ✅ This guide — the page-by-page playbook.

### Step 1 — Download & open
Download the project, unzip it, and open the folder in Claude Code next to (or alongside) your backend repo. Start your backend (`localhost:4000`).

### Step 2 — Point the frontend at your backend
No code edit needed. Either:
- open any page and run in the browser devtools console once: `localStorage.aranya_api_base = "http://localhost:4000"`, **or**
- add `<script>window.ARANYA_API_BASE="http://localhost:4000"</script>` before `api.js` in the HTML.

Then make sure your Express CORS `FRONTEND_URL` matches where you open the HTML (e.g. a `file://` page or `http://localhost:3000` via a static server). `api.js` sends `credentials:"include"`.

### Step 3 — Paste this prompt into Claude Code
> This is a static React-via-CDN storefront. All backend access goes through `api.js` (`window.AranyaAPI`) — never add `fetch()` elsewhere. `Catalog.html` + `catalog.jsx` are already converted to load live data through it; use them as the reference pattern. Following `BACKEND_INTEGRATION.md` sections 3–6, wire these to my backend at `http://localhost:4000`, one at a time, testing each before moving on: (1) Product Detail, (2) Cart + Checkout, (3) Auth (sign-in modal + Account page). Keep the graceful demo-data fallback. Confirm my endpoint paths in `api.js` `config.paths` against my actual Express routes before wiring each one.

### Step 4 — Verify each slice against your running server
Watch the Network tab: a real call to `/products` should return your data; a failed call falls back to demo data with a console warning. Work one page at a time, top of section 3 onward.

**That's it.** The rest of this document is the detailed reference Claude Code (or you) will follow.

> ℹ️ You do **not** need to keep editing in this hosted environment. Everything here is plain HTML/JS/CSS you own outright — finish wherever you like. The Catalog is done as a live example; the same 3-step pattern (async hook → loading state → fallback) repeats for every other page.

---

## 0. One-time setup

1. **Load `api.js` on every page**, right after the data files and before the React component scripts:
   ```html
   <script src="spice-data.js"></script>
   <script src="catalog-data.js"></script>
   <script src="api.js"></script>            <!-- ← add this line -->
   <script type="text/babel" src="shared.jsx"></script>
   ...
   ```
   It must come **after** `spice-data.js`/`catalog-data.js` so its offline fallback can borrow their colours.
   *(Already done on `Catalog.html` — copy that script ordering to the other pages as you wire them.)*

2. **Point it at your API.** No code edit required — `api.js` resolves its base URL from, in order: `window.ARANYA_API_BASE` → `localStorage.aranya_api_base` → the built-in default (`http://localhost:4000`). To repoint, run once in the browser console:
   ```js
   localStorage.aranya_api_base = "http://localhost:4000"   // then reload
   ```
   (Or set `useApi:false` in `api.js` to force demo-data mode for design work.)

3. **CORS** — your `index.ts` already allows `FRONTEND_URL` with `credentials:true`. Make sure `FRONTEND_URL` matches wherever you serve these HTML files (e.g. `http://localhost:3000`). `api.js` sends `credentials:"include"`.

> **Graceful fallback:** if the API can't be reached, `getProducts`/`getProduct` automatically fall back to the bundled `window.CATALOG`/`window.SPICES`, so the pages never break (and the static preview still works). Watch the console for `[AranyaAPI] … fell back to demo data`.

---

## File map — what to touch (and what not to)

| File | Role | Touch when wiring? |
|---|---|---|
| **`api.js`** | the single backend gateway (`window.AranyaAPI`) — adapter, auth, cart, checkout | confirm `config.paths`; otherwise leave as-is |
| **`Catalog.html` + `catalog.jsx`** | ✅ **done** — reference example of live-data wiring | copy its pattern, don't redo it |
| `Product Detail.html` | product page; already reads `?product=<slug>` | §3 — fetch via `getProduct()` |
| `cart-store.js`, `cart-ui.jsx` | local cart + slide-in drawer + SignInModal | §4/§5 — sync to server cart, wire auth |
| `checkout.jsx` | checkout flow (mock order today) | §4 — `createCheckoutIntent()` |
| `Account.html` | sign-in gate + account dashboard | §5 — `login`/`me`/`logout` |
| `contact.jsx`, `wholesale.jsx`, home newsletter | forms (mock success) | §6 — only after backend routes exist |
| `spice-data.js`, `catalog-data.js`, `journal-data.js`, `recipes-data.js`, `gifts-data.js` | bundled DEMO data + colour seeds | keep — they're the offline fallback |
| `shared.jsx`, `navbar.jsx`, `cards.jsx`, `home-*.jsx`, `aranya.css` | UI components & design system | don't change for backend work |
| `Mobile *.html` + `mobile-*.jsx` | mobile ports | same pattern later, lower priority |

---

## 1. Field mapping (backend Product → frontend "spice")

`AranyaAPI.mapProduct()` does this for you. Confirmed mapping from your sample:

| Frontend field (UI needs) | Source in your API | Notes |
|---|---|---|
| `name` | `product.name` | ✓ |
| `slug` | `product.slug` | used for `?product=<slug>` links |
| `usd` / `lkr` | `variants[]` → price of the `currency` match (prefers 100 g) | formatted `"$4.50"` / `"Rs 1,750"` |
| `weights` | distinct `variants[].weight` → `["50g","100g","250g"]` | ✓ |
| `badge` | `certifications[]` (ORGANIC→"Organic", GI→"GI Certified") else `featured`→"Bestseller" | ✓ |
| `reviews` | `_count.reviews` | ✓ |
| `category` | `category.name` | ✓ |
| `images` | `images[]` sorted by `position` | ready for real photos (see §6) |
| `variants` | raw `variants[]` kept on the object | for real per-weight pricing later |

### ✅ Extra fields — now present in your model
You added these, so the adapter uses them directly (verified against your sample):

| Field | API source | Result |
|---|---|---|
| `latin` | `product.latin` | italic subtitle on cards/detail |
| `originLabel` | `product.originLabel` | eyebrow ("Matale Hills, Sri Lanka") |
| `ratingAvg` | `product.ratingAvg` | star rating |
| `color` | `product.color` (single hex) | card stripe; the adapter auto-derives `base`/`deep`/`surface` shades from it. (If you ever store all four, it uses them as-is.) |

No fallbacks needed — but they still exist (palette/4.8/blank) if a field ever comes back null, so nothing can break.

---

## 2. Vertical slice A — Catalog list (`Catalog.html` / `catalog.jsx`)

Today `catalog.jsx` reads `window.CATALOG` synchronously. Switch to async load:

```jsx
function useCatalog() {
  const [state, setState] = React.useState({ items: null, loading: true, error: null });
  React.useEffect(() => {
    let alive = true;
    AranyaAPI.getProducts({ limit: 24 })
      .then((r) => alive && setState({ items: r.items, loading: false, error: null }))
      .catch((e) => alive && setState({ items: [], loading: false, error: e.message }));
    return () => { alive = false; };
  }, []);
  return state;
}
```
- Replace the `const data = CATALOG` line with `const { items, loading } = useCatalog();`
- Render a skeleton/spinner while `loading`, then map `items` into your existing `<CardCFinal spice={item} />`.
- **Pagination:** your API is cursor-based (`nextCursor`, `hasNextPage`). Wire the "Load more" button to `getProducts({ cursor: nextCursor })` and append.
- **Facets (category/flavour/form):** your products have `category`; `flavour` isn't in the model. Either add facet fields to Prisma and filter server-side (`/products?category=…`), or keep client-side filtering over the loaded page. Server-side is better at scale.

## 3. Vertical slice B — Product detail (`Product Detail.html`)

This page already reads `?product=<slug>` (we just added that). Change it to fetch:

```jsx
const slug = new URLSearchParams(location.search).get("product");
const [spice, setSpice] = useState(null);
useEffect(() => { AranyaAPI.getProduct(slug).then(r => setSpice(r.product)); }, [slug]);
if (!spice) return <Loading/>;
```
- Feed `spice` into the existing `BuyBox`, `Gallery`, etc.
- The floating product switcher currently iterates `window.SPICES`; either keep it for demo or replace with links built from the catalog list.
- **Real per-weight prices:** today the cards multiply a base price by `50g×0.6 / 100g×1 / 250g×2.3`. Your backend has real prices per variant. To use them, read `spice.variants` (kept on the mapped object) and look up `variant.price` for the selected weight + market currency instead of the multiplier. (Small change in `cards.jsx`/`BuyBox` — I can do this.)

## 4. Cart & checkout (server cart + PayHere/Stripe)

Your backend has a real server cart and a checkout intent endpoint, so the flow is:

- Keep the local `cart-store.js` for guests/optimistic UI, and **sync to the server cart once authed**:
  ```js
  await AranyaAPI.addCartItem({ variantId, quantity: 1 });   // POST /cart/items
  await AranyaAPI.updateCartItem(itemId, 2);                 // PATCH /cart/items/:id
  await AranyaAPI.updateCartItem(itemId, 0);                 // quantity:0 deletes
  await AranyaAPI.applyCoupon("HARVEST10");                  // POST /cart/coupon
  const cart = await AranyaAPI.getCart();                    // GET /cart
  ```
  Note items are keyed by **`variantId`** (a specific weight+currency SKU), not product — so map the selected weight/market to the right variant before adding.
- **Checkout** → `createCheckoutIntent(payload)` (`POST /checkout/create-intent`). It returns **a PayHere payload when market = LOCAL**, or **a Stripe `{ clientSecret }` when market = INTL**:
  ```js
  const res = await AranyaAPI.createCheckoutIntent({ market, shipping, … });
  if (res.clientSecret) { /* Stripe.js confirmCardPayment(res.clientSecret) */ }
  else { /* render PayHere form/redirect with res (payload) */ }
  ```
  Wire `checkout.jsx` to branch on the response and show the returned order id/number instead of the current fake `AC-…`.

## 5. Auth (JWT access + HttpOnly refresh cookie)

`api.js` stores the **access token** in `localStorage` and sends `Authorization: Bearer <token>`. The **refresh token is an HttpOnly cookie** scoped to `/auth/refresh`, sent automatically via `credentials:"include"`.
```js
await AranyaAPI.login(email, password);   // POST /auth/login → { accessToken, user }
AranyaAPI.isAuthed();                      // gate Account.html
const { user } = await AranyaAPI.me();     // GET /auth/me (requireAuth)
await AranyaAPI.logout();                  // POST /auth/logout + clears token
```
- **401 auto-refresh is built in.** On any `401`, `request()` calls `POST /auth/refresh` once (using the cookie), stores the new access token, and **replays the original request**. Concurrent 401s share one refresh. If refresh fails, it clears the token and fires a `window` event `aranya:auth-expired` — add a listener to redirect to sign-in:
  ```js
  window.addEventListener("aranya:auth-expired", () => { /* open SignInModal or go to Account.html */ });
  ```
- Wire `SignInModal` (in `cart-ui.jsx`) and `Account.html` to `login`/`register`/`me`/`logout`.

## 6. Forms & images

- **Contact / Wholesale / Newsletter:** ⚠️ these routes **aren't implemented on the backend yet**. The methods exist (`sendContact`/`applyWholesale`/`subscribe`) but the forms should **keep their current mock success** until the endpoints exist. When they're ready, swap each form's mock `setDone(true)` for `await AranyaAPI.sendContact(payload)` (keeping the same success UI), and confirm the final route paths in `config.paths`.
- **Images:** the design uses styled `SpicePhoto` placeholders. With real data, `spice.images[0].url` is available — swap the placeholder for an `<img src={spice.images[0].url}>` (keep the placeholder as the fallback when `images` is empty).

---

## 7. Production hardening (before launch)

1. **Precompile JSX.** These pages use the in-browser Babel transformer (fine for prototyping, slow for users). Run them through Vite/esbuild so the browser ships plain JS. The pinned CDN React tags can stay or be bundled.
2. **Token storage.** The access token is in `localStorage` (XSS-exposed). Your refresh token is already an HttpOnly cookie (good). For maximum safety you can also move the access token to an HttpOnly cookie — `api.js` already sends `credentials:"include"`, so that's a small change (drop the Authorization header).
3. **Env-based base URL.** Replace the hardcoded `baseUrl` with a build-time env var.
4. **Error/empty/loading states** on every list and detail view.

---

## Status & next step

**Done:** `api.js` is fully wired to your confirmed routes — products, auth (with 401 auto-refresh against the HttpOnly cookie), server cart (`/cart/items`), and checkout (`/checkout/create-intent`, PayHere/Stripe branch). The product adapter is verified against your sample and uses your real `latin`/`originLabel`/`ratingAvg`/`color` fields.

**Still backend-side:** contact / wholesale / newsletter endpoints — forms stay on mock success until those exist.

**Next (frontend):** convert **Catalog + Product Detail to live data** as the first working slice (it runs live against your server, falling back to demo data in this static preview), then roll the same pattern through cart/checkout, auth, and the account page. Say the word and I'll start the Catalog wiring.
