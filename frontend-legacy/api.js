/* Aranya Ceylon — API client + backend adapter.
   Talks to the Node/Express/Prisma REST API. Plain JS (load BEFORE the React files,
   AFTER spice-data.js + catalog-data.js so it can borrow their colours as a fallback).

   Exposes window.AranyaAPI. Every network call lives here — no fetch() anywhere else.

   Design notes
   ------------
   • Cross-origin + credentials: requests send `credentials:"include"` and a Bearer token.
   • Graceful fallback: if the API is unreachable (e.g. in the static preview), list/detail
     calls fall back to the bundled window.CATALOG / window.SPICES so pages keep working.
     Set AranyaAPI.config.useApi = false to force offline/demo mode.
   • Adapter: mapProduct() converts a backend Product into the shape the cards/detail
     pages already expect (name, latin, origin, color, usd, lkr, weights, …). Fields your
     Prisma model doesn't have yet (latin, color, rating, originLabel) get sensible
     fallbacks — see "MISSING BACKEND FIELDS" below and BACKEND_INTEGRATION.md. */
(function () {
  // Base URL resolution order (no code edit needed to repoint):
  //   1) window.ARANYA_API_BASE  (set before this script loads)
  //   2) localStorage "aranya_api_base"  (set once in devtools: localStorage.aranya_api_base="http://localhost:4000")
  //   3) the default below
  function resolveBase() {
    try { if (window.ARANYA_API_BASE) return window.ARANYA_API_BASE; } catch (e) {}
    try { const ls = localStorage.getItem("aranya_api_base"); if (ls) return ls; } catch (e) {}
    return "http://localhost:4000";    // ← default API origin (your Express PORT)
  }
  const config = {
    baseUrl: resolveBase(),
    useApi: true,                        // false = always use bundled demo data
    tokenKey: "aranya_token",            // localStorage key for the JWT access token
    // Endpoint paths — products/auth confirmed; the rest are best-guess, confirm against your routes:
    paths: {
      products:    "/products",
      product:     (slug) => "/products/" + encodeURIComponent(slug),
      // auth (confirmed — auth.routes.ts)
      login:       "/auth/login",
      register:    "/auth/register",
      refresh:     "/auth/refresh",
      me:          "/auth/me",
      logout:      "/auth/logout",
      // cart (confirmed — cart.routes.ts)
      cart:        "/cart",
      cartItems:   "/cart/items",
      cartItem:    (id) => "/cart/items/" + encodeURIComponent(id),  // PATCH; quantity:0 deletes
      cartCoupon:  "/cart/coupon",
      // checkout (confirmed — checkout.routes.ts) → PayHere payload (LOCAL) | Stripe clientSecret (INTL)
      checkout:    "/checkout/create-intent",
      // ⚠ NOT yet implemented on the backend — forms keep their mock success until these exist
      contact:     "/contact",
      wholesale:   "/wholesale",
      newsletter:  "/newsletter",
      search:      "/search",
    },
    autoRefresh: true,        // on 401, POST /auth/refresh once (cookie) and replay the request
  };

  /* ---------------- token storage ---------------- */
  const token = {
    get() { try { return localStorage.getItem(config.tokenKey) || ""; } catch (e) { return ""; } },
    set(t) { try { t ? localStorage.setItem(config.tokenKey, t) : localStorage.removeItem(config.tokenKey); } catch (e) {} },
    clear() { this.set(""); },
  };

  /* ---------------- low-level request (with 401 auto-refresh) ---------------- */
  // The refresh token is an HttpOnly cookie scoped to /auth/refresh; the access token
  // comes back in the JSON body ({ accessToken, user }) and is stored in localStorage.
  let refreshing = null;                         // de-dupe concurrent refreshes
  function noRefresh(path) { return [config.paths.login, config.paths.register, config.paths.refresh].indexOf(path) !== -1; }

  async function rawFetch(path, { method = "GET", body, auth = false, headers = {} } = {}) {
    const h = { "Accept": "application/json", ...headers };
    if (body !== undefined) h["Content-Type"] = "application/json";
    const t = token.get();
    if ((auth || t) && t) h["Authorization"] = "Bearer " + t;
    return fetch(config.baseUrl + path, {
      method,
      credentials: "include",                    // sends the refresh cookie on /auth/refresh; CORS credentials:true
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
  async function parse(res) {
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json() : await res.text();
    if (!res.ok) { const err = new Error((data && data.message) || ("HTTP " + res.status)); err.status = res.status; err.data = data; throw err; }
    return data;
  }
  async function request(path, opts = {}) {
    let res = await rawFetch(path, opts);
    if (res.status === 401 && config.autoRefresh && !opts._retry && !noRefresh(path)) {
      try {
        if (!refreshing) refreshing = AranyaAPI.refresh().finally(() => { refreshing = null; });
        await refreshing;                        // sets a fresh access token
        res = await rawFetch(path, { ...opts, _retry: true });   // replay once
      } catch (e) {
        token.clear();
        try { window.dispatchEvent(new CustomEvent("aranya:auth-expired")); } catch (_) {}  // listen → redirect to sign-in
        throw e;
      }
    }
    return parse(res);
  }

  /* ================= PRODUCT ADAPTER ================= */
  // brand palette fallback for products with no colour field
  const PALETTE = [
    { color: "#B5651D", base: "#C2772E", deep: "#7E481A", surface: "#F3E7D4" },
    { color: "#7C9A5A", base: "#93AE6A", deep: "#566F37", surface: "#EAEFDD" },
    { color: "#6B4226", base: "#7A4A2A", deep: "#462914", surface: "#EBDDCD" },
    { color: "#A9683C", base: "#B57441", deep: "#7A451F", surface: "#F0E2D2" },
    { color: "#3C3A36", base: "#54504A", deep: "#26241F", surface: "#E6E2DA" },
    { color: "#D99A1C", base: "#E2A62B", deep: "#A8740F", surface: "#F6E9C9" },
  ];
  function hashIdx(str, n) { let h = 0; for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % n; }
  // shade a hex toward white (amt>0) or black (amt<0), amt in 0..1
  function shade(hex, amt) {
    let h = String(hex).replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((f - r) * p) + r; g = Math.round((f - g) * p) + g; b = Math.round((f - b) * p) + b;
    return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
  }
  function colorsFor(raw) {
    // 1) full set on the product  2) single `color` → derive shades  3) match a bundled spice  4) hash → palette
    if (raw.color && raw.base) return { color: raw.color, base: raw.base, deep: raw.deep, surface: raw.surface };
    if (raw.color) return { color: raw.color, base: shade(raw.color, 0.08), deep: shade(raw.color, -0.4), surface: shade(raw.color, 0.78) };
    const bundled = (window.SPICES || []).find((s) => s.name.toLowerCase() === String(raw.name).toLowerCase());
    if (bundled) return { color: bundled.color, base: bundled.base, deep: bundled.deep, surface: bundled.surface };
    return PALETTE[hashIdx(raw.slug || raw.name, PALETTE.length)];
  }
  const CERT_BADGE = { ORGANIC: "Organic", GI: "GI Certified", GI_CERTIFIED: "GI Certified", FAIRTRADE: "Fair Trade" };
  function badgeFor(raw) {
    const certs = raw.certifications || [];
    for (const c of certs) if (CERT_BADGE[c]) return CERT_BADGE[c];
    if (raw.featured) return "Bestseller";
    return "In Stock";
  }
  function fmt(price, currency) {
    if (price == null) return null;
    return currency === "LKR" ? "Rs " + Math.round(price).toLocaleString("en-US") : "$" + Number(price).toFixed(2);
  }
  function pickVariant(variants, currency) {
    const inCur = (variants || []).filter((v) => v.currency === currency);
    if (!inCur.length) return null;
    return inCur.find((v) => v.weight === 100) || inCur.slice().sort((a, b) => a.weight - b.weight)[0];
  }
  function weightsOf(variants) {
    const ws = [...new Set((variants || []).map((v) => v.weight))].sort((a, b) => a - b);
    return ws.length ? ws.map((w) => w + "g") : ["50g", "100g", "250g"];
  }

  // Backend Product  →  frontend "spice" object the cards/detail pages expect
  function mapProduct(raw) {
    if (!raw) return null;
    const c = colorsFor(raw);
    const usdV = pickVariant(raw.variants, "USD");
    const lkrV = pickVariant(raw.variants, "LKR");
    const form = /ground|powder/i.test(raw.name) || /ground|powder/i.test((raw.category && raw.category.name) || "") ? "Ground" : "Whole";
    return {
      // identity
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      // ── MISSING BACKEND FIELDS (fallbacks) — recommend adding to Prisma Product ──
      latin: raw.latin || "",                                              // add `latin String?`
      origin: raw.originLabel || raw.origin || "Ceylon, Sri Lanka",        // add `originLabel String?`
      rating: raw.ratingAvg != null ? raw.ratingAvg : 4.8,                 // expose avg from reviews
      // colours (matched to a bundled spice or hashed from brand palette)
      color: c.color, base: c.base, deep: c.deep, surface: c.surface,
      // commerce
      badge: badgeFor(raw),
      reviews: (raw._count && raw._count.reviews) || raw.reviewCount || 0,
      usd: fmt(usdV && usdV.price, "USD") || "$0.00",
      lkr: fmt(lkrV && lkrV.price, "LKR") || "Rs 0",
      weights: weightsOf(raw.variants),
      form,
      category: (raw.category && raw.category.name) || "Spices",
      // catalog filter/sort fields — fallbacks so live data can't crash the catalog logic
      flavour: raw.flavour || raw.flavours || [],                          // backend has no flavour facet yet
      popularity: raw.popularity != null ? raw.popularity : ((raw._count && raw._count.orderItems) || (raw.featured ? 90 : 50)),
      added: raw.createdAt || raw.added || "",
      certifications: raw.certifications || [],
      featured: !!raw.featured,
      description: raw.description || "",
      images: (raw.images || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0)),
      variants: raw.variants || [],   // keep raw variants for real per-weight pricing later
      _raw: raw,
    };
  }

  /* ================= PUBLIC API ================= */
  const AranyaAPI = {
    config, token, request, mapProduct,

    async getProducts({ cursor, limit } = {}) {
      if (config.useApi) {
        try {
          const qs = new URLSearchParams();
          if (cursor) qs.set("cursor", cursor);
          if (limit) qs.set("limit", limit);
          const data = await request(config.paths.products + (qs.toString() ? "?" + qs : ""));
          return {
            items: (data.items || []).map(mapProduct),
            nextCursor: data.nextCursor || null,
            hasNextPage: !!data.hasNextPage,
            market: data.market || null,
            _live: true,
          };
        } catch (e) {
          console.warn("[AranyaAPI] getProducts fell back to demo data:", e.message);
        }
      }
      // fallback: bundled catalog/spices
      const items = (window.CATALOG || window.SPICES || []).map((s) => ({ ...s, slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }));
      return { items, nextCursor: null, hasNextPage: false, market: null, _live: false };
    },

    // Load the entire catalog by following the cursor (the catalog page filters/sorts client-side).
    async getAllProducts({ pageSize = 100, maxPages = 20 } = {}) {
      let cursor = null, all = [], live = false, pages = 0;
      do {
        const r = await this.getProducts({ cursor, limit: pageSize });
        all = all.concat(r.items);
        live = r._live;
        cursor = r.hasNextPage ? r.nextCursor : null;
        pages++;
        if (!r._live) break;                 // demo fallback returns everything at once
      } while (cursor && pages < maxPages);
      return { items: all, _live: live };
    },

    async getProduct(slug) {
      if (config.useApi) {
        try {
          const data = await request(config.paths.product(slug));
          return { product: mapProduct(data.product), market: data.market || null, _live: true };
        } catch (e) {
          console.warn("[AranyaAPI] getProduct fell back to demo data:", e.message);
        }
      }
      const want = String(slug).toLowerCase();
      const list = window.SPICES || window.CATALOG || [];
      const hit = list.find((s) => (s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) === want)
               || list.find((s) => s.name.toLowerCase() === want.replace(/-/g, " "))
               || list[0];
      return { product: hit ? { ...hit, slug: want } : null, market: null, _live: false };
    },

    /* ---- auth (JWT bearer) ---- */
    async login(email, password) {
      const data = await request(config.paths.login, { method: "POST", body: { email, password } });
      if (data.accessToken || data.token) token.set(data.accessToken || data.token);
      return data;
    },
    async register(payload) {
      const data = await request(config.paths.register, { method: "POST", body: payload });
      if (data.accessToken || data.token) token.set(data.accessToken || data.token);
      return data;
    },
    async refresh() {
      const data = await request(config.paths.refresh, { method: "POST" });
      if (data.accessToken || data.token) token.set(data.accessToken || data.token);
      return data;
    },
    async me() { return request(config.paths.me, { auth: true }); },
    async logout() { try { await request(config.paths.logout, { method: "POST", auth: true }); } finally { token.clear(); } },
    isAuthed() { return !!token.get(); },

    /* ---- cart (server cart — cart.routes.ts) ---- */
    async getCart() { return request(config.paths.cart, { auth: true }); },
    async addCartItem({ productId, variantId, quantity = 1 }) { return request(config.paths.cartItems, { method: "POST", auth: true, body: { productId, variantId, quantity } }); },
    async updateCartItem(itemId, quantity) { return request(config.paths.cartItem(itemId), { method: "PATCH", auth: true, body: { quantity } }); },  // quantity:0 deletes
    async applyCoupon(code) { return request(config.paths.cartCoupon, { method: "POST", auth: true, body: { code } }); },

    /* ---- checkout (checkout.routes.ts) ---- */
    // returns a PayHere payload (market LOCAL) or a Stripe { clientSecret } (market INTL)
    async createCheckoutIntent(payload) { return request(config.paths.checkout, { method: "POST", auth: true, body: payload }); },

    async search(q) { return request(config.paths.search + "?q=" + encodeURIComponent(q)); },

    /* ---- forms — ⚠ backend routes NOT implemented yet; callers should keep mock success until they exist ---- */
    async sendContact(payload) { return request(config.paths.contact, { method: "POST", body: payload }); },
    async applyWholesale(payload) { return request(config.paths.wholesale, { method: "POST", body: payload }); },
    async subscribe(email) { return request(config.paths.newsletter, { method: "POST", body: { email } }); },
  };

  window.AranyaAPI = AranyaAPI;
})();
