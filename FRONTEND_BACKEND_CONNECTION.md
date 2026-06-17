# Frontend ↔ Backend Connection Log

This document records every change made to connect the `aranya-next` frontend to the Express + Prisma backend.

---

## Overview

- **Frontend:** `aranya-next/` — Next.js 14 App Router (SSG/ISR + client components)
- **Backend:** `backend/` — Express + Prisma + Neon (PostgreSQL)
- **Pattern:** Browser calls `/api/*` BFF proxy → proxy forwards to `http://localhost:4000`. Server components call the backend directly. Every API call has a `try/catch` that falls back to hardcoded demo data when the backend is unreachable.

---

## 1. Workspace Setup

**File:** `pnpm-workspace.yaml`

Replaced the old partial `frontend` package with `aranya-next`:

```yaml
packages:
  - 'backend'
  - 'aranya-next'
  - 'shared'
```

---

## 2. Backend — New Endpoints Added

### 2.1 Admin Product Routes

**File:** `backend/src/routes/admin.routes.ts`

Added routes delegating to the existing `product.controller.ts` admin functions:

```
GET    /admin/products        → productController.adminListProducts
POST   /admin/products        → productController.createProduct
PATCH  /admin/products/:id    → productController.updateProduct
DELETE /admin/products/:id    → productController.archiveProduct
```

### 2.2 Contact Endpoint

**New files:**
- `backend/src/controllers/contact.controller.ts`
- `backend/src/routes/contact.routes.ts`

```
POST /contact
```

Validates name, email, subject, message, consent. Generates a reference number (`AC-XXXXXXXX`) and returns it to the caller. Logs the enquiry to server stdout (TODO: send to support inbox via email service).

### 2.3 Wholesale Application Endpoint

**New files:**
- `backend/src/controllers/wholesale.controller.ts`
- `backend/src/routes/wholesale.routes.ts`

```
POST /wholesale/apply
```

Validates company, contact, email, country, type, consent. Generates a reference number (`WS-XXXXXXXX`) and returns it. Logs to stdout (TODO: notify wholesale team via CRM/email).

### 2.4 Profile Update Endpoint

**File:** `backend/src/controllers/auth.controller.ts`

Added `patchMe` function after the existing `getMe`:

```
PATCH /auth/me
```

Accepts `{ name?, phone? }`, updates the authenticated user, returns the updated user object.

**File:** `backend/src/routes/auth.routes.ts`

```
router.patch('/me', asyncHandler(requireAuth), asyncHandler(patchMe));
```

### 2.5 Blog Admin — Author Field

**File:** `backend/src/controllers/admin/blog.admin.controller.ts`

Added `authorId` to the `listBlogs` select so the admin blog list includes who created each post.

> **Note:** The `Blog` model stores `authorId` as a plain string field — there is no Prisma relation defined between `Blog` and `User` in the schema. A future schema migration could add this relation to enable joining the author name directly.

### 2.6 Cart — Remove Item

**File:** `backend/src/controllers/cart.controller.ts`

Added `removeItem` controller function that sets quantity to 0 via `cartService.updateCartItem`.

**File:** `backend/src/routes/cart.routes.ts`

```
DELETE /cart/items/:itemId
```

### 2.7 Route Registration

**File:** `backend/src/index.ts`

Registered the two new route files:

```typescript
import contactRoutes from './routes/contact.routes.js';
import wholesaleRoutes from './routes/wholesale.routes.js';

app.use('/contact', contactRoutes);
app.use('/wholesale', wholesaleRoutes);
```

---

## 3. Frontend — Isomorphic HTTP Client

**File:** `aranya-next/src/lib/api/http.ts`

Already present. Provides `apiFetch()` which:
- On the **server**: calls `http://localhost:4000` directly (or `NEXT_PUBLIC_API_URL`)
- On the **browser**: calls `/api/*` which proxies to the backend via `app/api/[...path]/route.ts`
- Attaches the Bearer access token (held in memory, never localStorage)
- Sets `credentials: 'include'` so HttpOnly cookies (refresh token, guest cart token, market cookie) ride along automatically

---

## 4. Frontend — API Client Library (`src/lib/api/`)

### 4.1 `cart.ts` — Fixed & Extended

Added correct return types and a new `removeCartItem` function:

| Function | Method | Endpoint |
|---|---|---|
| `getCart()` | GET | `/cart` |
| `addCartItem(input)` | POST | `/cart/items` |
| `updateCartItem(itemId, qty)` | PATCH | `/cart/items/:itemId` |
| `applyCoupon(code)` | POST | `/cart/coupon` |
| `removeCartItem(itemId)` | DELETE | `/cart/items/:itemId` |
| `mergeCart()` | POST | `/cart/merge` |

### 4.2 `auth.ts` — Extended

Added `patchMe()`:

| Function | Method | Endpoint |
|---|---|---|
| `login(email, password)` | POST | `/auth/login` |
| `register(input)` | POST | `/auth/register` |
| `refresh()` | POST | `/auth/refresh` |
| `me()` | GET | `/auth/me` |
| `patchMe(input)` | PATCH | `/auth/me` |
| `logout()` | POST | `/auth/logout` |

### 4.3 `admin.ts` — Rewritten

Fixed three path mismatches from the original stub and added all missing functions:

**Mismatches fixed:**
- `listAudit()` `/admin/audit` → `/admin/audit-logs`
- `savePost()` `POST /admin/blog` → `POST /admin/blogs`
- `deletePost()` `DELETE /admin/blog/:slug` → `DELETE /admin/blogs/:id`

**Functions added:**

| Function | Method | Endpoint |
|---|---|---|
| `getDashboard()` | GET | `/admin/dashboard` |
| `listAdminOrders(params?)` | GET | `/admin/orders` |
| `updateOrderStatus(id, patch)` | PATCH | `/admin/orders/:id` |
| `refundOrder(id)` | POST | `/admin/orders/:id/refund` |
| `listAdminProducts()` | GET | `/admin/products` |
| `createAdminProduct(input)` | POST | `/admin/products` |
| `updateAdminProduct(id, input)` | PATCH | `/admin/products/:id` |
| `archiveAdminProduct(id)` | DELETE | `/admin/products/:id` |
| `listAdminBlogs()` | GET | `/admin/blogs` |
| `getAdminBlog(id)` | GET | `/admin/blogs/:id` |
| `createBlog(input)` | POST | `/admin/blogs` |
| `updateBlog(id, input)` | PATCH | `/admin/blogs/:id` |
| `deleteBlog(id)` | DELETE | `/admin/blogs/:id` |
| `listAuditLogs(params?)` | GET | `/admin/audit-logs` |

### 4.4 `orders.ts`

Already present. Used by AccountDashboard to load the signed-in user's order history.

| Function | Method | Endpoint |
|---|---|---|
| `listOrders(params?)` | GET | `/orders` |
| `getOrder(id)` | GET | `/orders/:id` |

### 4.5 `products.ts`

Already present. Used by homepage, catalog, product detail, categories, and search pages.

| Function | Method | Endpoint |
|---|---|---|
| `listProducts(filters?)` | GET | `/products` |
| `getProduct(slug)` | GET | `/products/:slug` |
| `getFeatured()` | GET | `/products/featured` |
| `getBestsellers()` | GET | `/products/bestsellers` |
| `searchProducts(q)` | GET | `/products/search?q=` |

### 4.6 `blog.ts`

Already present. Used by journal list and article pages.

| Function | Method | Endpoint |
|---|---|---|
| `listBlog(params?)` | GET | `/blog` |
| `getBlogPost(slug)` | GET | `/blog/:slug` |
| `getRecentBlog()` | GET | `/blog?limit=4` |

### 4.7 `checkout.ts`

Already present. Used by CheckoutClient.

| Function | Method | Endpoint |
|---|---|---|
| `createIntent(input)` | POST | `/checkout/intent` |
| `pollOrderPaid(id)` | GET | `/orders/:id` (polls until status ≠ PENDING) |

### 4.8 `contact.ts` — New

```typescript
submitContact(input: ContactInput): Promise<{ ref: string; message: string }>
// POST /contact
```

### 4.9 `wholesale.ts` — New

```typescript
submitWholesale(input: WholesaleInput): Promise<{ ref: string; message: string }>
// POST /wholesale/apply
```

### 4.10 `categories.ts`

Already present.

| Function | Method | Endpoint |
|---|---|---|
| `listCategories()` | GET | `/categories` |

---

## 5. Frontend — Shared Types Updated

**File:** `aranya-next/src/lib/types.ts`

- Added `user?: { id, name, email }` to the `Order` interface — the admin order list endpoint includes user details that the customer-facing endpoint does not.
- Added `status?: string` to the `Product` interface — admin product endpoints return a `status` field (`ACTIVE`, `ARCHIVED`, `DRAFT`) not present in the public product response.

---

## 6. Frontend — Cart Context Wired

**File:** `aranya-next/src/components/CartContext.tsx`

The cart context holds optimistic local state and fire-and-forgets API calls in the background:

| Action | API call | Condition |
|---|---|---|
| `add(spice, weight, form, qty, backendIds?)` | `POST /cart/items` | Only when `backendIds` (productId + variantId) are provided |
| `inc(id)` / `dec(id)` / `setQty(id, qty)` | `PATCH /cart/items/:backendItemId` | Only when item has a `backendItemId` from a prior add |
| `remove(id)` | `DELETE /cart/items/:backendItemId` | Only when item has a `backendItemId` |
| `applyPromo(code)` | `POST /cart/coupon` | Always (fire-and-forget) |

The `CartLine` type was extended with optional `productId`, `variantId`, and `backendItemId` fields to carry backend IDs through the optimistic state without breaking the existing view-model shape.

---

## 7. Frontend — Product Detail Wired

**File:** `aranya-next/src/lib/cart.ts`  
**File:** `aranya-next/src/components/product/BuyBox.tsx`  
**File:** `aranya-next/src/components/product/ProductDetail.tsx`  
**File:** `aranya-next/src/app/products/[slug]/page.tsx`

The product page now passes the live `Product` object (from `GET /products/:slug`) down through `ProductDetail` → `BuyBox`. `BuyBox` resolves the correct variant based on the selected weight and current market, then passes `{ productId, variantId }` to `cart.add()` so the backend cart is kept in sync.

**Variant resolution logic (`resolveVariant`):**
1. Filter variants by selected weight (grams)
2. From those, prefer the variant matching the current market currency (USD for intl, LKR for local)
3. Fall back to a `BOTH`-market variant, then any variant

---

## 8. Frontend — Account Dashboard Wired

**File:** `aranya-next/src/components/account/AccountDashboard.tsx`

### Order history
On mount, calls `GET /orders` and maps backend orders → `AccountOrder` shape via `toAccountOrder()` (defined in `lib/account-data.ts`). Falls back to demo data if the API is unreachable or the user is not authenticated.

### Profile save
The profile tab is now a controlled form. Saving calls `PATCH /auth/me` with the updated name. Shows "Saved ✓" confirmation on success, silently falls back (keeps local state) on failure.

### `toAccountOrder()` adapter (`lib/account-data.ts`)
Maps the backend `Order` shape to the `AccountOrder` shape the dashboard components expect:
- Backend status strings (`PENDING`, `PAID`, `SHIPPED`, etc.) → dashboard tokens (`processing`, `in_transit`, `delivered`)
- Product slugs → palette colors via `paletteFor(slug)`
- Variant weight in grams → display string (`50g` / `100g` / `250g`)
- Currency conversion between LKR and USD using an approximate rate

---

## 9. Frontend — Admin Console Wired

All admin components load real data on mount and fall back to demo data on any API error. Mutations are optimistic (local state updated immediately) and best-effort synced to the backend.

### 9.1 AdminOrders

**File:** `aranya-next/src/components/admin/AdminOrders.tsx`

- On mount: `GET /admin/orders` → `backendOrderToAdmin()` adapter → replaces demo rows
- Status change: `PATCH /admin/orders/:id` (optimistic local update first)
- Refund: `POST /admin/orders/:id/refund` (optimistic local update first)
- Fixed call signature: `updateOrderStatus(id, { status })` (was incorrectly `updateOrderStatus(id, status)`)

**`backendOrderToAdmin()` adapter:** Maps backend `Order` (which includes `user`, `items[]`, `total`, `currency`) to the `AdminOrder` shape the table and drawer components expect (customer name, city, items with USD price, fulfillment string, etc.).

### 9.2 AdminProducts

**File:** `aranya-next/src/components/admin/AdminProducts.tsx`

- On mount: `GET /admin/products` → `backendProductToAdmin()` adapter → replaces demo rows
- Visibility toggle: `PATCH /admin/products/:id` with `{ status: "ACTIVE" | "ARCHIVED" }`
- Save (create/edit): `POST /admin/products` or `PATCH /admin/products/:id`

**`backendProductToAdmin()` adapter:** Maps live `Product` to `AdminProduct` — derives USD/LKR price strings from variants, picks palette colors via `paletteFor(slug)`, calculates total stock across all variants, builds weight list from unique variant weights.

### 9.3 AdminBlog

**File:** `aranya-next/src/components/admin/AdminBlog.tsx`

- On mount: `GET /admin/blogs` → `backendBlogToAdmin()` adapter → replaces demo rows
- Save new post: `POST /admin/blogs`
- Save edit: `PATCH /admin/blogs/:id` (backend ID stored as `_backendId` on the row)
- Fixed imports: replaced removed `savePost` with `createBlog` + `updateBlog`

**`backendBlogToAdmin()` adapter:** Maps backend blog (`id`, `title`, `slug`, `status`, `publishedAt`, `scheduledAt`, `viewCount`, `tags`) to the `AdminBlogPost` shape the table expects, including status capitalisation (`DRAFT` → `Draft`, etc.).

### 9.4 AdminAudit

**File:** `aranya-next/src/components/admin/AdminAudit.tsx`

- On mount: `GET /admin/audit-logs?limit=100` → `backendAuditToRow()` adapter → replaces demo rows

**`backendAuditToRow()` adapter:** Maps backend audit log entries (`event`, `actorRole`, `targetType`, `targetId`, `meta`, `createdAt`, `actor`) to the `AuditRow` shape the log table renders, including event code → icon key mapping.

---

## 10. Frontend — Contact Form Wired

**File:** `aranya-next/src/components/marketing/ContactClient.tsx`

`submit()` is now `async` and calls `POST /contact`. On success, uses the server-returned `ref`. On any error (network, validation), falls back to a locally-generated reference so the user always sees a confirmation. The submit button is disabled and shows "Sending…" while in flight.

---

## 11. Frontend — Wholesale Form Wired

**File:** `aranya-next/src/components/marketing/WholesaleClient.tsx`

Same pattern as Contact. `submit()` calls `POST /wholesale/apply`. On success, uses the server-returned `ref`. Falls back to local ref on error. Submit button disabled while in flight.

---

## 12. Demo Fallback Pattern

Every data-loading call follows this pattern:

```typescript
// Server component (SSG/ISR)
async function loadData() {
  try {
    const res = await apiFunction();
    if (res.items?.length) return res.items;
  } catch { /* backend unreachable */ }
  return DEMO_DATA; // hardcoded fallback
}

// Client component (useEffect)
React.useEffect(() => {
  apiFunction()
    .then(({ data }) => { if (data?.length) setState(data); })
    .catch(() => { /* keep demo state */ });
}, []);
```

This satisfies acceptance criterion §11: the frontend is fully browsable and functional with no backend running.

---

## 13. Pages Connected — Summary

| Page | Route | Backend endpoints |
|---|---|---|
| Homepage | `/` | `GET /products/featured`, `GET /products/bestsellers` |
| Catalog | `/products` | `GET /products` |
| Product detail | `/products/[slug]` | `GET /products/:slug`, `GET /products` (related) |
| Categories | `/categories` | `GET /products` |
| Category slug | `/categories/[slug]` | `GET /categories` → redirect |
| Journal list | `/journal` | `GET /blog` |
| Journal article | `/journal/[slug]` | `GET /blog/:slug` |
| Search | `/search` | `GET /products`, `GET /blog` |
| Checkout | `/checkout` | `POST /checkout/intent`, `GET /orders/:id` |
| Contact | `/contact` | `POST /contact` |
| Wholesale | `/wholesale` | `POST /wholesale/apply` |
| Account (orders) | `/account` | `GET /orders` |
| Account (profile) | `/account` | `PATCH /auth/me` |
| Admin dashboard | `/admin` | `GET /admin/dashboard` |
| Admin orders | `/admin` | `GET /admin/orders`, `PATCH /admin/orders/:id`, `POST /admin/orders/:id/refund` |
| Admin products | `/admin` | `GET /admin/products`, `POST /admin/products`, `PATCH /admin/products/:id` |
| Admin blog | `/admin` | `GET /admin/blogs`, `POST /admin/blogs`, `PATCH /admin/blogs/:id`, `DELETE /admin/blogs/:id` |
| Admin audit | `/admin` | `GET /admin/audit-logs` |

**Sitewide (not page-specific):**
- Auth: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- Cart: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `POST /cart/coupon`, `POST /cart/merge`

**Static pages (no backend):** `/about`, `/gifts`, `/recipes`, `/recipes/[slug]`, `/faq`, `/shipping`, `/cookies`, `/privacy`, `/terms`
