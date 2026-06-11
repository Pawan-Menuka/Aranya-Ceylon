# Backend Feature Inventory

- Auth: register, login, refresh, logout, me profile; access/refresh token rotation with reuse detection; HttpOnly refresh cookies
- Roles and admin gating: admin/superadmin protection for admin routes and product management
- Market-aware storefront: local vs international market selection via signed cookie; server-side market validation
- Products: list with filters plus cursor pagination, featured, bestsellers, slug lookup, search autocomplete, full-text search
- Categories: list categories with product counts
- Cart: guest plus authenticated carts, add/update items, market-validated variants, coupon application, totals with market-specific shipping
- Checkout: server-side totals, order creation, address validation (local-only LK), save address, shipping methods
- Payments: Stripe (international) payment intents plus webhook handling; PayHere (local) hosted checkout plus webhook validation
- Orders: order creation with timeline events, stock decrement on paid, cart clearing after payment
- Admin orders: list/filter/paginate, view detail, update status, refund (Stripe), restock on refund
- Blog (public): list, recent, slug fetch, view count
- Blog (admin): create/update/delete, scheduled publishing, ISR revalidation calls to frontend
- Analytics (admin): revenue, order counts, top products, pending fulfillment, low stock, recent audit logs
- Audit logging: immutable audit trail for admin actions
- Email: order confirmation, shipping notifications, low stock alerts, wholesale status emails
- Background jobs: scheduled blog publishing, guest cart expiry, daily low stock alerts
- Health check: database connectivity plus shared version info

## Route-by-Route Endpoint Catalog

### Health

- GET /health
	- Public health check and DB connectivity probe

### Auth

- POST /auth/register
	- Public; validates register payload
- POST /auth/login
	- Public; validates login payload
- POST /auth/refresh
	- Public; uses HttpOnly refresh cookie
- POST /auth/logout
	- Auth required
- GET /auth/me
	- Auth required

### Market

- POST /market/override
	- Public; sets signed market cookie (local or international)

### Products (Public)

- GET /products
	- Public; filterable list with cursor pagination
- GET /products/featured
	- Public
- GET /products/bestsellers
	- Public
- GET /products/search
	- Public; autocomplete and full-text search
- GET /products/:slug
	- Public

### Products (Admin)

- POST /products
	- Auth required; roles ADMIN or SUPERADMIN
- PATCH /products/:id
	- Auth required; roles ADMIN or SUPERADMIN
- POST /products/:id/images
	- Auth required; roles ADMIN or SUPERADMIN; multipart upload
- DELETE /products/:id
	- Auth required; roles ADMIN or SUPERADMIN

### Categories

- GET /categories
	- Public

### Cart

- GET /cart
	- Optional auth; guest carts supported
- POST /cart/items
	- Optional auth; add item to cart
- PATCH /cart/items/:itemId
	- Optional auth; update quantity or remove
- POST /cart/coupon
	- Optional auth; apply coupon code

### Checkout

- POST /checkout/create-intent
	- Auth required; creates order and payment intent or PayHere payload

### Blog (Public)

- GET /blog
	- Public; paginated list
- GET /blog/recent
	- Public; recent posts
- GET /blog/:slug
	- Public

### Admin: Analytics

- GET /admin/dashboard
	- Auth required; roles ADMIN or SUPERADMIN
- GET /admin/audit-logs
	- Auth required; roles ADMIN or SUPERADMIN

### Admin: Orders

- GET /admin/orders
	- Auth required; roles ADMIN or SUPERADMIN
- GET /admin/orders/:id
	- Auth required; roles ADMIN or SUPERADMIN
- PATCH /admin/orders/:id
	- Auth required; roles ADMIN or SUPERADMIN
- POST /admin/orders/:id/refund
	- Auth required; roles ADMIN or SUPERADMIN

### Admin: Blog

- GET /admin/blogs
	- Auth required; roles ADMIN or SUPERADMIN
- POST /admin/blogs
	- Auth required; roles ADMIN or SUPERADMIN
- PATCH /admin/blogs/:id
	- Auth required; roles ADMIN or SUPERADMIN
- DELETE /admin/blogs/:id
	- Auth required; roles ADMIN or SUPERADMIN

### Webhooks

- POST /webhooks/stripe
	- Public; Stripe signature verification; raw body
- POST /webhooks/payhere
	- Public; PayHere MD5 validation; form-encoded body
