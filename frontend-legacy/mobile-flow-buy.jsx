/* Aranya Ceylon — MOBILE FLOW: buy screens (Cart, Checkout, Confirmation).
   Read off window by the MobileFlow controller. Depends on shared.jsx (SpicePhoto, Seal, Icon),
   support-common.jsx (SIcon), mobile-flow.jsx (FlowShipMeter, FlowMarketSeg). */
const { useState: bfUse } = React;

/* ---- cart line item ---- */
function CartLine({ item, market, cart, flowFmt, flowUnit }) {
  const line = flowUnit(item, market) * item.qty;
  return (
    <div style={{ display: "flex", gap: 13, padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ width: 70, height: 70, flex: "0 0 auto", borderRadius: 8, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
        <SpicePhoto spice={item.spice} ratio="1 / 1" label={false} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <h3 className="disp" style={{ fontSize: 19, color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>{item.spice.name}</h3>
          <button aria-label="Remove" onClick={() => cart.remove(item.id)} style={{ background: "none", border: 0, padding: 2, cursor: "pointer", flex: "0 0 auto", height: 22 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{item.weight} · {item.form}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
          <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 7, background: "#fff" }}>
            <button onClick={() => cart.dec(item.id)} aria-label="Decrease" disabled={item.qty <= 1} style={{ width: 34, height: 34, border: 0, background: "none", cursor: item.qty <= 1 ? "default" : "pointer", fontSize: 17, color: item.qty <= 1 ? "var(--line)" : "var(--ink)" }}>−</button>
            <span style={{ width: 26, textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700 }}>{item.qty}</span>
            <button onClick={() => cart.inc(item.id)} aria-label="Increase" style={{ width: 34, height: 34, border: 0, background: "none", cursor: "pointer", fontSize: 17, color: "var(--ink)" }}>+</button>
          </div>
          <span className="disp" style={{ fontSize: 21, color: "var(--ink)", fontWeight: 600 }}>{flowFmt(line, market)}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================= CART ============================= */
function CartScreen({ cart, market, accent, nav, flowFmt, flowUnit, flowTotals }) {
  if (cart.items.length === 0) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 34px" }}>
        <div style={{ width: 70, height: 70, borderRadius: 999, background: "var(--surface)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: 20 }}>
          <Icon name="bag" size={30} stroke="var(--brand)" />
        </div>
        <h2 className="disp" style={{ fontSize: 27, color: "var(--ink)", margin: "0 0 8px" }}>Your cart is empty</h2>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 24px", maxWidth: 260 }}>Fresh-milled Ceylon spice is just a tap away.</p>
        <button onClick={nav.goCatalog} className="btn" style={{ background: accent, color: "#fff", width: "auto", padding: "14px 28px" }}>Shop the harvest</button>
      </div>
    );
  }
  const t = flowTotals(cart.items, market);
  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding: "18px 20px 4px" }}><FlowShipMeter items={cart.items} market={market} accent={accent} /></div>
      <div style={{ padding: "4px 20px 0" }}>
        {cart.items.map((it) => <CartLine key={it.id} item={it} market={market} cart={cart} flowFmt={flowFmt} flowUnit={flowUnit} />)}
      </div>
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", marginBottom: 10 }}>
          <span>Subtotal</span><span style={{ color: "var(--ink)", fontWeight: 600 }}>{flowFmt(t.subtotal, market)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)" }}>
          <span>Shipping</span><span style={{ color: t.freeShip ? "var(--brand)" : "var(--ink)", fontWeight: 600 }}>{t.freeShip ? "Free" : flowFmt(t.ship, market)}</span>
        </div>
      </div>
      <div style={{ position: "sticky", bottom: 0, marginTop: 18, padding: "13px 18px calc(13px + 26px)", background: "rgba(253,250,245,.94)", backdropFilter: "blur(10px)", borderTop: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", lineHeight: 1 }}>Total</div>
          <div className="disp" style={{ fontSize: 24, color: "var(--ink)", fontWeight: 600, lineHeight: 1.1 }}>{flowFmt(t.total, market)}</div>
        </div>
        <button onClick={nav.goCheckout} className="btn" style={{ background: accent, color: "#fff", flex: 1, padding: "15px", fontSize: 15 }}>Checkout</button>
      </div>
    </div>
  );
}

/* ---- checkout field ---- */
function CkField({ label, ph, type = "text", value, onChange, half }) {
  return (
    <label style={{ display: "block", flex: half ? "1 1 0" : "1 1 100%", minWidth: 0 }}>
      <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{label}</span>
      <input type={type} placeholder={ph} value={value} onChange={onChange} style={{ width: "100%", padding: "13px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink)", outline: "none" }}
        onFocus={(e) => e.target.style.borderColor = "var(--brand)"} onBlur={(e) => e.target.style.borderColor = "var(--line)"} />
    </label>
  );
}
function CkSection({ n, title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 24, height: 24, borderRadius: 999, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 800, flex: "0 0 auto" }}>{n}</span>
        <h2 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ============================= CHECKOUT ============================= */
function CheckoutScreen({ cart, market, setMarket, accent, nav, flowFmt, flowUnit, flowTotals }) {
  const [email, setEmail] = bfUse("");
  const [name, setName] = bfUse("");
  const [addr, setAddr] = bfUse("");
  const [city, setCity] = bfUse("");
  const [postal, setPostal] = bfUse("");
  const [delivery, setDelivery] = bfUse("standard");
  const [open, setOpen] = bfUse(false);
  const t = flowTotals(cart.items, market);
  const expressFee = market === "local" ? 950 : 24;
  const total = t.total + (delivery === "express" ? expressFee : 0);

  const deliveries = [
    ["standard", market === "local" ? "Standard · islandwide" : "Standard · tracked", market === "local" ? "2–4 working days" : "7–14 working days", t.freeShip ? "Free" : flowFmt(t.ship, market)],
    ["express", market === "local" ? "Express · Colombo" : "Express · courier", market === "local" ? "1–2 working days" : "3–6 working days", flowFmt(expressFee, market)],
  ];

  const place = () => nav.placeOrder({
    email: email || "you@example.com", name: name || "Your name",
    items: cart.items.map((i) => ({ name: i.spice.name, weight: i.weight, form: i.form, qty: i.qty, spice: i.spice })),
    total, market, number: "AC-" + Math.floor(100000 + Math.random() * 899999),
  });

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding: "16px 20px 0" }}>
        <FlowMarketSeg market={market} setMarket={setMarket} />
      </div>
      <div style={{ padding: "22px 20px 0" }}>
        <CkSection n="1" title="Contact">
          <CkField label="Email" ph="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </CkSection>

        <CkSection n="2" title="Ship to">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <CkField label="Full name" ph="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <CkField label="Address" ph="Street address" value={addr} onChange={(e) => setAddr(e.target.value)} />
            <div style={{ display: "flex", gap: 12 }}>
              <CkField label="City" ph="City" value={city} onChange={(e) => setCity(e.target.value)} half />
              <CkField label="Postal" ph="Postal code" value={postal} onChange={(e) => setPostal(e.target.value)} half />
            </div>
          </div>
        </CkSection>

        <CkSection n="3" title="Delivery">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deliveries.map(([key, t1, t2, price]) => {
              const on = delivery === key;
              return (
                <button key={key} onClick={() => setDelivery(key)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "14px", borderRadius: 12, cursor: "pointer",
                  border: on ? "1.5px solid var(--brand)" : "1.5px solid var(--line)", background: on ? "rgba(15,110,86,.06)" : "#fff" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, border: on ? "6px solid var(--brand)" : "2px solid var(--line)", flex: "0 0 auto", transition: "border .15s" }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{t1}</span>
                    <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{t2}</span>
                  </span>
                  <span className="disp" style={{ fontSize: 18, color: "var(--brand)", fontWeight: 600 }}>{price}</span>
                </button>
              );
            })}
          </div>
        </CkSection>

        <CkSection n="4" title="Payment">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <CkField label="Card number" ph="1234  5678  9012  3456" value="" onChange={() => {}} />
            <div style={{ display: "flex", gap: 12 }}>
              <CkField label="Expiry" ph="MM / YY" value="" onChange={() => {}} half />
              <CkField label="CVC" ph="123" value="" onChange={() => {}} half />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)" }}>
            <SIcon name="shield" size={15} stroke="var(--brand)" />Encrypted &amp; secure — you won't be charged in this demo.
          </div>
        </CkSection>

        {/* order summary */}
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
          <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 16px", background: "var(--surface)", border: 0, cursor: "pointer" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Order summary · {cart.count} item{cart.count !== 1 ? "s" : ""}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="disp" style={{ fontSize: 19, color: "var(--ink)", fontWeight: 600 }}>{flowFmt(total, market)}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </button>
          {open && (
            <div style={{ padding: "4px 16px 14px", background: "#fff" }}>
              {cart.items.map((it) => (
                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
                  <span style={{ color: "var(--ink)" }}>{it.qty} × {it.spice.name} <span style={{ color: "var(--muted)" }}>· {it.weight}</span></span>
                  <span style={{ color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>{flowFmt(flowUnit(it, market) * it.qty, market)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                <span>Total</span><span>{flowFmt(total, market)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "sticky", bottom: 0, padding: "13px 18px calc(13px + 26px)", background: "rgba(253,250,245,.94)", backdropFilter: "blur(10px)", borderTop: "1px solid var(--line)" }}>
        <button onClick={place} className="btn" style={{ background: accent, color: "#fff", padding: "16px", fontSize: 15.5 }}>Place order · {flowFmt(total, market)}</button>
      </div>
    </div>
  );
}

/* ============================= CONFIRMATION ============================= */
function ConfirmScreen({ order, market, accent, nav, flowFmt }) {
  const o = order || { number: "AC-000000", email: "you@example.com", items: [], total: 0, market };
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <div style={{ textAlign: "center", padding: "44px 28px 26px" }}>
        <div style={{ width: 74, height: 74, borderRadius: 999, background: "var(--brand)", display: "grid", placeItems: "center", margin: "0 auto 22px", boxShadow: "0 10px 30px rgba(15,110,86,.3)" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 10 }}>Order confirmed</div>
        <h1 className="disp" style={{ fontSize: 32, color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.08 }}>Your spices are on their way</h1>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 auto", maxWidth: 300, lineHeight: 1.62 }}>We've emailed a confirmation to <b style={{ color: "var(--ink)" }}>{o.email}</b>. Each order is sealed within 24 hours.</p>
      </div>

      <div style={{ padding: "0 20px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>Order number</span>
            <span className="disp" style={{ fontSize: 20, color: "var(--brand)", fontWeight: 600 }}>{o.number}</span>
          </div>
          <div style={{ padding: "14px 0 4px" }}>
            {o.items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
                <span style={{ color: "var(--ink)" }}>{it.qty} × {it.name} <span style={{ color: "var(--muted)" }}>· {it.weight}</span></span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, marginTop: 8, borderTop: "1px solid var(--line)", fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
            <span>Total paid</span><span>{flowFmt(o.total, o.market || market)}</span>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 11 }}>
          <button onClick={nav.goHome} className="btn" style={{ background: accent, color: "#fff", padding: "15px", fontSize: 15 }}>Continue shopping</button>
          <button onClick={nav.goHome} className="btn btn-ghost" style={{ padding: "14px", fontSize: 14.5 }}>Track your order</button>
        </div>
        <p style={{ textAlign: "center", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 16, color: "var(--muted)", margin: "26px 0 0" }}>Istuti — thank you, from the hill country.</p>
      </div>
    </div>
  );
}

Object.assign(window, { CartScreen, CheckoutScreen, ConfirmScreen, CartLine });
