/* Aranya Ceylon — MOBILE FLOW core.
   A self-contained, per-instance purchase flow that runs inside one iOS device frame:
   Home → Catalog → Product → Cart → Checkout → Confirmation.
   Uses a LOCAL React cart (not the global store) so multiple device instances on the
   same page stay independent. Pricing mirrors cart-store.js.
   Depends on shared.jsx (Seal, Icon), mobile.jsx (SAFE_TOP). Screens live in
   mobile-flow-shop.jsx + mobile-flow-buy.jsx and are read off window at render time. */
const { useState: fUse, useEffect: fEffect, useRef: fRef } = React;

/* ---- pricing (mirrors cart-store.js) ---- */
const FLOW_MULT = { "50g": 0.6, "100g": 1, "250g": 2.3 };
const FLOW_CFG = {
  intl:  { cur: "USD", freeShip: 60,   ship: 8.5 },
  local: { cur: "LKR", freeShip: 5000, ship: 650 },
};
function flowNum(p) { return typeof p === "number" ? p : parseFloat(String(p).replace(/[^0-9.]/g, "")); }
function flowFmt(n, market) {
  if (market === "local") return "Rs " + Math.round(n).toLocaleString("en-US");
  return "$" + (Math.round(n * 100) / 100).toFixed(2);
}
function flowUnit(item, market) {
  const base = market === "local" ? flowNum(item.spice.lkr) : flowNum(item.spice.usd);
  return base * (FLOW_MULT[item.weight] || 1);
}
function flowTotals(items, market) {
  const cfg = FLOW_CFG[market];
  const subtotal = items.reduce((s, i) => s + flowUnit(i, market) * i.qty, 0);
  const freeShip = subtotal >= cfg.freeShip || items.length === 0;
  const ship = freeShip ? 0 : cfg.ship;
  return { subtotal, ship, freeShip, threshold: cfg.freeShip, remaining: Math.max(0, cfg.freeShip - subtotal), total: subtotal + ship };
}

/* ---- local per-instance cart ---- */
function useFlowCart(initial) {
  const [items, setItems] = fUse(() => initial || []);
  const add = (spice, weight, form, qty = 1) => setItems((prev) => {
    const id = spice.name + "|" + weight + "|" + form;
    const ex = prev.find((i) => i.id === id);
    if (ex) return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i));
    return [...prev, { id, spice, weight, form, qty }];
  });
  const inc = (id) => setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  const dec = (id) => setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i)));
  const remove = (id) => setItems((p) => p.filter((i) => i.id !== id));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.qty, 0);
  return { items, add, inc, dec, remove, clear, count };
}

/* ---- top chrome bar (forest, glass-over-hero or solid) ---- */
function FlowBar({ title, onBack, onMenu, market, cartCount = 0, onCart, solid = true }) {
  const light = "#FDFAF5";
  const bg = solid ? "rgba(15,110,86,.97)" : "rgba(15,110,86,.16)";
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ background: bg, backdropFilter: "blur(12px)", paddingTop: SAFE_TOP,
        borderBottom: `1px solid rgba(253,250,245,${solid ? .14 : .22})`, transition: "background .3s" }}>
        <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", gap: 8 }}>
          <div style={{ width: 60, display: "flex", justifyContent: "flex-start" }}>
            {onBack ? (
              <button aria-label="Back" onClick={onBack} style={{ background: "none", border: 0, padding: 8, cursor: "pointer", display: "grid", placeItems: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={light} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            ) : onMenu ? (
              <button aria-label="Menu" onClick={onMenu} style={{ background: "none", border: 0, padding: 8, cursor: "pointer", display: "grid", placeItems: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={light} strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              </button>
            ) : null}
          </div>
          {typeof title === "string"
            ? <span className="disp" style={{ flex: 1, textAlign: "center", minWidth: 0, fontSize: 21, color: light, lineHeight: 1, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            : <a onClick={(e) => { e.preventDefault(); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Seal size={28} tone="light" />
                <span className="disp" style={{ fontSize: 20, color: light, whiteSpace: "nowrap" }}>Aranya Ceylon</span>
              </a>}
          <div style={{ width: 60, display: "flex", justifyContent: "flex-end" }}>
            <button aria-label="Cart" onClick={onCart} style={{ position: "relative", background: "none", border: 0, padding: 8, cursor: "pointer" }}>
              <Icon name="bag" size={21} stroke={light} />
              {cartCount > 0 && <span style={{ position: "absolute", top: 1, right: 1, minWidth: 16, height: 16, padding: "0 4px", background: "var(--accent)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center", lineHeight: 1 }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- free-shipping progress meter ---- */
function FlowShipMeter({ items, market, accent }) {
  const t = flowTotals(items, market);
  const pct = t.freeShip ? 100 : Math.min(100, (t.subtotal / t.threshold) * 100);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "13px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 9 }}>
        {t.freeShip
          ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Free shipping unlocked</>
          : <span>Add <b style={{ color: accent }}>{flowFmt(t.remaining, market)}</b> more for free shipping</span>}
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(26,26,26,.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 999, background: t.freeShip ? "var(--brand)" : accent, transition: "width .4s" }} />
      </div>
    </div>
  );
}

/* ---- toast ---- */
function FlowToast({ show, children }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, display: "flex", justifyContent: "center", zIndex: 80, pointerEvents: "none",
      opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(10px)", transition: "opacity .28s, transform .28s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#1A1A1A", color: "#FDFAF5", borderRadius: 999, padding: "11px 18px", boxShadow: "0 12px 34px rgba(0,0,0,.34)", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E6B860" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        {children}
      </div>
    </div>
  );
}

/* ---- in-flow market segmented control ---- */
function FlowMarketSeg({ market, setMarket, light = false }) {
  const opt = (key, label) => {
    const on = market === key;
    return (
      <button onClick={() => setMarket(key)} style={{ flex: 1, padding: "9px 8px", borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, transition: "background .15s, color .15s",
        border: 0, background: on ? (light ? "#E6B860" : "var(--brand)") : "transparent", color: on ? (light ? "#1A1A1A" : "#fff") : (light ? "rgba(253,250,245,.8)" : "var(--muted)") }}>{label}</button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 11, background: light ? "rgba(253,250,245,.12)" : "#fff", border: light ? "1px solid rgba(253,250,245,.22)" : "1px solid var(--line)" }}>
      {opt("intl", "International · USD")}
      {opt("local", "Sri Lanka · LKR")}
    </div>
  );
}

/* ---- flow controller: holds screen + cart + market, renders chrome + active screen ---- */
function MobileFlow({ initialScreen = "home", initialCartSeed = null, initialOrder = null, initialSpice = null, market: market0 = "intl" }) {
  const W = window;
  const cart = useFlowCart(initialCartSeed ? initialCartSeed() : []);
  const [market, setMarket] = fUse(market0);
  const [screen, setScreen] = fUse(initialScreen);
  const [current, setCurrent] = fUse(initialSpice || window.SPICES[0]);
  const [drawer, setDrawer] = fUse(false);
  const [order, setOrder] = fUse(initialOrder);
  const [toast, setToast] = fUse("");
  const [scrolled, setScrolled] = fUse(false);
  const [history, setHistory] = fUse([]);
  const scroller = fRef(null);
  const toastT = fRef(null);

  const resetScroll = () => { if (scroller.current) scroller.current.scrollTop = 0; setScrolled(false); };
  const flash = (msg) => { setToast(msg); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), 1700); };
  const go = (s) => { setHistory((h) => [...h, screen]); setScreen(s); resetScroll(); };
  const back = () => { const prev = history.length ? history[history.length - 1] : "home"; setHistory(history.slice(0, -1)); setScreen(prev); resetScroll(); };
  const openProduct = (spice) => { setCurrent(spice); go("product"); };
  const addToCart = (spice, weight, form, qty) => { cart.add(spice, weight, form, qty); flash("Added to cart"); };
  const placeOrder = (o) => { setOrder(o); cart.clear(); setHistory([]); setScreen("confirm"); resetScroll(); };

  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const onScroll = () => { if (scroller.current) setScrolled(scroller.current.scrollTop > 30); };

  // bar config per screen
  const titles = { catalog: "Shop", product: current.name, cart: "Your cart", checkout: "Checkout", confirm: "Order placed" };
  const heroBar = screen === "home";
  const showBack = screen !== "home" && screen !== "confirm";

  const nav = {
    go, back, openProduct, addToCart, placeOrder,
    goHome: () => go("home"), goCatalog: () => go("catalog"), goCart: () => go("cart"),
    goCheckout: () => go("checkout"), flash,
  };

  const Screen = (() => {
    const { HomeScreen, CatalogScreen, ProductScreen, CartScreen, CheckoutScreen, ConfirmScreen } = W;
    const common = { cart, market, setMarket, accent, nav, flowFmt, flowUnit, flowTotals, FLOW_MULT };
    switch (screen) {
      case "home":     return <HomeScreen {...common} onMenu={() => setDrawer(true)} />;
      case "catalog":  return <CatalogScreen {...common} />;
      case "product":  return <ProductScreen {...common} spice={current} />;
      case "cart":     return <CartScreen {...common} />;
      case "checkout": return <CheckoutScreen {...common} />;
      case "confirm":  return <ConfirmScreen {...common} order={order} />;
      default:         return null;
    }
  })();

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "var(--bg)" }}>
      <div ref={scroller} onScroll={onScroll} className="noscroll" style={{ position: "absolute", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <FlowBar
          title={heroBar ? null : titles[screen]}
          onBack={showBack ? back : null}
          onMenu={heroBar ? () => setDrawer(true) : null}
          market={market} cartCount={cart.count} onCart={() => go("cart")}
          solid={heroBar ? scrolled : true} />
        {Screen}
      </div>

      <FlowToast show={!!toast}>{toast}</FlowToast>
      {W.FlowDrawer && <FlowDrawer open={drawer} onClose={() => setDrawer(false)} market={market} setMarket={setMarket} nav={nav} />}
    </div>
  );
}

Object.assign(window, {
  MobileFlow, FlowBar, FlowShipMeter, FlowToast, FlowMarketSeg,
  useFlowCart, flowFmt, flowUnit, flowTotals, flowNum, FLOW_MULT, FLOW_CFG,
});
