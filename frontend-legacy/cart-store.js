/* Aranya Ceylon — persistent cart + market store.
   Plain JS (load with <script src> BEFORE the React component files).
   Single source of truth, persisted to localStorage, with a tiny pub/sub so
   React views re-render on change. Exposes window.AranyaCart. */
(function () {
  var CART_KEY = "aranya_cart_v1";
  var MKT_KEY = "aranya_market_v1";

  /* weight → multiplier on the 100g base price (matches Product Detail) */
  var MULT = { "50g": 0.6, "100g": 1, "250g": 2.3 };

  /* commerce constants per market */
  var CONFIG = {
    intl:  { cur: "USD", freeShip: 60,   ship: 8.5,  giftWrap: 4.5,  promo: { CEYLON10: 0.10 } },
    local: { cur: "LKR", freeShip: 5000, ship: 650,  giftWrap: 400,  promo: { CEYLON10: 0.10 } },
  };

  var subs = [];
  function emit() { subs.forEach(function (f) { try { f(state); } catch (e) {} }); }

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  var state = {
    items: load(CART_KEY, []),         // [{id,name,latin,weight,form,color,base,deep,surface,base100Usd,base100Lkr,qty}]
    market: load(MKT_KEY, "intl"),
    giftWrap: false,
    giftNote: "",
    promo: "",                          // applied code
  };

  function persist() { save(CART_KEY, state.items); save(MKT_KEY, state.market); }

  function num(p) { return typeof p === "number" ? p : parseFloat(String(p).replace(/[^0-9.]/g, "")); }

  /* unit price (one unit, chosen weight) in the active market's currency */
  function unitPrice(item, market) {
    var base = market === "local" ? item.base100Lkr : item.base100Usd;
    return base * (MULT[item.weight] || 1);
  }

  function fmt(n, market) {
    if (market === "local") return "Rs " + Math.round(n).toLocaleString("en-US");
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
  }

  var AranyaCart = {
    /* ---- read ---- */
    get: function () { return state; },
    items: function () { return state.items; },
    market: function () { return state.market; },
    count: function () { return state.items.reduce(function (n, i) { return n + i.qty; }, 0); },
    MULT: MULT,
    config: function () { return CONFIG[state.market]; },

    fmt: function (n) { return fmt(n, state.market); },
    unitPrice: function (item) { return unitPrice(item, state.market); },
    linePrice: function (item) { return unitPrice(item, state.market) * item.qty; },

    totals: function () {
      var m = state.market, cfg = CONFIG[m];
      var subtotal = state.items.reduce(function (s, i) { return s + unitPrice(i, m) * i.qty; }, 0);
      var discountRate = state.promo && cfg.promo[state.promo] ? cfg.promo[state.promo] : 0;
      var discount = subtotal * discountRate;
      var afterDisc = subtotal - discount;
      var gift = state.giftWrap ? cfg.giftWrap : 0;
      var freeShip = afterDisc >= cfg.freeShip || state.items.length === 0;
      var ship = freeShip ? 0 : cfg.ship;
      var total = afterDisc + gift + ship;
      return {
        market: m, currency: cfg.cur,
        subtotal: subtotal, discount: discount, discountRate: discountRate,
        gift: gift, ship: ship, freeShip: freeShip, freeShipThreshold: cfg.freeShip,
        remainingToFree: Math.max(0, cfg.freeShip - afterDisc), total: total,
        fmt: function (n) { return fmt(n, m); },
      };
    },

    /* ---- write ---- */
    /* product: a CATALOG/SPICE object; weight: "50g"|"100g"|"250g"; form: "Whole"|"Ground" */
    add: function (product, weight, form, qty) {
      weight = weight || "100g"; qty = qty || 1;
      form = form || product.form || "Whole";
      var id = product.name + "|" + weight + "|" + form;
      var existing = state.items.find(function (i) { return i.id === id; });
      if (existing) {
        existing.qty += qty;
        // sync qty increase to server if we already have a server item ID
        if (existing.serverItemId && window.AranyaAPI) {
          window.AranyaAPI.updateCartItem(existing.serverItemId, existing.qty)
            .catch(function (e) { console.warn("[AranyaCart] sync inc:", e.message); });
        }
      } else {
        // find matching variant (productId + variantId) from live API data
        var productId = product.id || null;
        var variantId = null;
        if (product.variants && product.variants.length) {
          var currency = state.market === "local" ? "LKR" : "USD";
          var w = parseInt(weight);
          var variant = product.variants.find(function (v) { return v.weight === w && v.currency === currency; })
                     || product.variants.find(function (v) { return v.weight === w; });
          if (variant) { variantId = variant.id; }
        }
        var newItem = {
          id: id, name: product.name, latin: product.latin || "",
          weight: weight, form: form,
          color: product.color, base: product.base, deep: product.deep, surface: product.surface,
          base100Usd: num(product.usd), base100Lkr: num(product.lkr),
          qty: qty,
          productId: productId, variantId: variantId, serverItemId: null,
        };
        state.items.push(newItem);
        // sync new item to server when we have both IDs
        if (productId && variantId && window.AranyaAPI) {
          (function (item, pid, vid) {
            window.AranyaAPI.addCartItem({ productId: pid, variantId: vid, quantity: qty })
              .then(function (r) {
                if (r && r.item && r.item.id) { item.serverItemId = r.item.id; persist(); }
              })
              .catch(function (e) { console.warn("[AranyaCart] sync add:", e.message); });
          })(newItem, productId, variantId);
        }
      }
      persist(); emit();
      return id;
    },
    setQty: function (id, qty) {
      var it = state.items.find(function (i) { return i.id === id; });
      if (!it) return;
      it.qty = Math.max(1, qty);
      if (it.serverItemId && window.AranyaAPI) {
        window.AranyaAPI.updateCartItem(it.serverItemId, it.qty)
          .catch(function (e) { console.warn("[AranyaCart] sync setQty:", e.message); });
      }
      persist(); emit();
    },
    inc: function (id) {
      var it = state.items.find(function (i) { return i.id === id; });
      if (it) {
        it.qty++;
        if (it.serverItemId && window.AranyaAPI) {
          window.AranyaAPI.updateCartItem(it.serverItemId, it.qty)
            .catch(function (e) { console.warn("[AranyaCart] sync inc:", e.message); });
        }
        persist(); emit();
      }
    },
    dec: function (id) {
      var it = state.items.find(function (i) { return i.id === id; });
      if (it) {
        it.qty = Math.max(1, it.qty - 1);
        if (it.serverItemId && window.AranyaAPI) {
          window.AranyaAPI.updateCartItem(it.serverItemId, it.qty)
            .catch(function (e) { console.warn("[AranyaCart] sync dec:", e.message); });
        }
        persist(); emit();
      }
    },
    remove: function (id) {
      var it = state.items.find(function (i) { return i.id === id; });
      if (it && it.serverItemId && window.AranyaAPI) {
        window.AranyaAPI.updateCartItem(it.serverItemId, 0)
          .catch(function (e) { console.warn("[AranyaCart] sync remove:", e.message); });
      }
      state.items = state.items.filter(function (i) { return i.id !== id; });
      persist(); emit();
    },
    clear: function () { state.items = []; state.giftWrap = false; state.giftNote = ""; state.promo = ""; persist(); emit(); },

    setMarket: function (m) { state.market = m; persist(); emit(); },
    setGiftWrap: function (b) { state.giftWrap = !!b; emit(); },
    setGiftNote: function (s) { state.giftNote = s; emit(); },
    applyPromo: function (code) {
      code = (code || "").trim().toUpperCase();
      var cfg = CONFIG[state.market];
      if (cfg.promo[code]) { state.promo = code; emit(); return true; }
      return false;
    },
    clearPromo: function () { state.promo = ""; emit(); },

    /* ---- subscribe ---- */
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
  };

  window.AranyaCart = AranyaCart;
})();
