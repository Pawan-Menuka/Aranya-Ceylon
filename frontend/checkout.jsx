/* Aranya Ceylon — single-page Checkout + order confirmation.
   Depends on cart-store.js, cart-ui.jsx (useCart/useMarket), shared.jsx (Seal, Icon, SpicePhoto). */
const { useState: ckUse, useEffect: ckEffect } = React;

/* ---------- minimal branded checkout header ---------- */
function CheckoutHeader({ market, onMarket }) {
  return (
    <header style={{ background: "var(--brand)", color: "#FDFAF5", borderBottom: "1px solid rgba(253,250,245,.14)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", height: 76, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="Catalog.html" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <Seal size={40} tone="light" />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span className="disp" style={{ fontSize: 25, color: "#FDFAF5", letterSpacing: ".02em" }}>Aranya Ceylon</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 3 }}>Forest Sourced Spices</span>
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, color: "rgba(253,250,245,.85)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E6B860" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Secure checkout
          </span>
          <div style={{ display: "inline-flex", border: "1px solid rgba(253,250,245,.28)", borderRadius: 999, overflow: "hidden" }}>
            {[["intl", "USD"], ["local", "LKR"]].map(([m, l]) => (
              <button key={m} onClick={() => onMarket(m)} style={{ background: market === m ? "rgba(253,250,245,.95)" : "transparent", color: market === m ? "var(--brand)" : "rgba(253,250,245,.85)", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, padding: "7px 14px" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- form primitives ---------- */
function Field({ label, type = "text", ph, value, onChange, full, half }) {
  return (
    <label style={{ display: "block", flex: half ? "1 1 0" : "1 1 100%", minWidth: 0 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} placeholder={ph} value={value} onChange={onChange} style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }}
        onFocus={(e) => e.target.style.borderColor = "var(--brand)"} onBlur={(e) => e.target.style.borderColor = "var(--line)"} />
    </label>
  );
}
function Section({ n, title, sub, children }) {
  return (
    <section style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 12, padding: "26px 28px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: sub ? 4 : 20 }}>
        <span style={{ width: 28, height: 28, borderRadius: 999, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, flex: "0 0 auto" }}>{n}</span>
        <h2 className="disp" style={{ fontSize: 26, color: "var(--ink)", margin: 0, lineHeight: 1 }}>{title}</h2>
      </div>
      {sub && <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: "0 0 18px", paddingLeft: 40 }}>{sub}</p>}
      <div style={{ paddingLeft: 40 }}>{children}</div>
    </section>
  );
}

/* ---------- delivery method selector ---------- */
function DeliveryOptions({ market, value, onChange, standardLabel }) {
  const opts = market === "local"
    ? [["standard", "Island-wide courier", "1–3 working days", standardLabel], ["express", "Express (Colombo metro)", "Next day", "Rs 1,500"]]
    : [["standard", "Tracked international", "7–12 working days", standardLabel], ["express", "Express courier (DHL)", "3–5 working days", "$18.00"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {opts.map(([id, title, eta, price]) => {
        const on = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer",
            border: on ? "1.5px solid var(--brand)" : "1px solid var(--line)", background: on ? "rgba(15,110,86,.05)" : "#fff", borderRadius: 9, padding: "14px 16px" }}>
            <span style={{ width: 18, height: 18, borderRadius: 999, flex: "0 0 auto", border: on ? "5px solid var(--brand)" : "1.5px solid var(--line)", background: "#fff", transition: "border .15s" }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{title}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>{eta}</span>
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: price === "Free" ? "var(--brand)" : "var(--ink)" }}>{price}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- payment methods (market-aware) ---------- */
function PaymentMethods({ market, value, onChange }) {
  const methods = market === "local"
    ? [["card", "Credit / Debit card"]]
    : [["card", "Credit / Debit card"], ["paypal", "PayPal"], ["wallet", "Apple Pay / Google Pay"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {methods.map(([id, label]) => {
          const on = value === id;
          return (
            <div key={id} style={{ border: on ? "1.5px solid var(--brand)" : "1px solid var(--line)", borderRadius: 9, overflow: "hidden", background: on ? "rgba(15,110,86,.04)" : "#fff" }}>
              <button onClick={() => onChange(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, textAlign: "left", cursor: "pointer", background: "none", border: 0, padding: "14px 16px" }}>
                <span style={{ width: 18, height: 18, borderRadius: 999, flex: "0 0 auto", border: on ? "5px solid var(--brand)" : "1.5px solid var(--line)", background: "#fff" }} />
                <span style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
                {id === "card" && <span style={{ display: "inline-flex", gap: 5 }}>{["#1A1F71", "#EB001B", "#006FCF"].map((c, k) => <span key={k} style={{ width: 30, height: 19, borderRadius: 3, background: c, opacity: .9 }} />)}</span>}
                {id === "paypal" && <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, fontWeight: 700, color: "#003087" }}>Pay<span style={{ color: "#009cde" }}>Pal</span></span>}
              </button>
              {on && id === "card" && (
                <div style={{ padding: "4px 16px 18px", display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <Field label="Card number" ph="1234 5678 9012 3456" />
                  <Field label="Expiry" ph="MM / YY" half />
                  <Field label="CVC" ph="123" half />
                  <Field label="Name on card" ph="As printed on card" />
                </div>
              )}
              {on && id === "paypal" && <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: 0, padding: "0 16px 16px" }}>You'll be redirected to PayPal to complete payment securely.</p>}
              {on && id === "wallet" && <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: 0, padding: "0 16px 16px" }}>Confirm with Face ID / fingerprint after placing your order.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- sticky order summary ---------- */
function OrderSummary({ market, deliv, expressFee }) {
  const cart = window.AranyaCart;
  const items = cart.items();
  const t = cart.totals();
  const shipShown = deliv === "express" ? expressFee : t.ship;
  const totalShown = t.subtotal - t.discount + t.gift + shipShown;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "24px 24px 26px", position: "sticky", top: 24 }}>
      <h3 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 18px" }}>Order summary</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "0 -4px 18px", padding: "9px 4px 0", maxHeight: 289, overflowY: "auto" }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ position: "relative", flex: "0 0 auto" }}>
              <div style={{ width: 52, height: 52, borderRadius: 7, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}><SpicePhoto spice={it} ratio="1 / 1" label={false} /></div>
              <span style={{ position: "absolute", top: -7, right: -7, minWidth: 19, height: 19, padding: "0 5px", background: "var(--brand)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{it.qty}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="disp" style={{ fontSize: 16.5, color: "var(--ink)", lineHeight: 1.1 }}>{it.name}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{it.weight} · {it.form}</div>
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{cart.fmt(cart.linePrice(it))}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <SumRow label="Subtotal" val={t.fmt(t.subtotal)} />
        {t.discount > 0 && <SumRow label={"Discount (" + cart.get().promo + ")"} val={"−" + t.fmt(t.discount)} accent />}
        {t.gift > 0 && <SumRow label="Gift wrapping" val={t.fmt(t.gift)} />}
        <SumRow label="Shipping" val={shipShown === 0 ? "Free" : t.fmt(shipShown)} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <span className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>Total</span>
        <span className="disp" style={{ fontSize: 30, color: "var(--ink)", fontWeight: 600 }}>{t.fmt(totalShown)}</span>
      </div>
      {cart.get().giftNote && (
        <div style={{ marginTop: 16, padding: "12px 14px", background: "#fff", border: "1px dashed var(--line)", borderRadius: 8 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Gift note</div>
          <div className="prose" style={{ fontSize: 14, color: "var(--ink)", fontStyle: "italic" }}>“{cart.get().giftNote}”</div>
        </div>
      )}
    </div>
  );
}
function SumRow({ label, val, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
      <span style={{ color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent ? "var(--brand)" : "var(--ink)", fontWeight: 700 }}>{val}</span>
    </div>
  );
}

/* ---------- order confirmation ---------- */
function OrderConfirmation({ order }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "70px 40px 100px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </div>
      <div className="eyebrow" style={{ color: "var(--accent)", justifyContent: "center", display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <span style={{ width: 24, height: 1, background: "var(--accent)" }} />Order confirmed<span style={{ width: 24, height: 1, background: "var(--accent)" }} />
      </div>
      <h1 className="disp" style={{ fontSize: 46, color: "var(--brand)", margin: "0 0 14px", lineHeight: 1.05 }}>Thank you — your spices are on their way</h1>
      <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 8px" }}>
        We've emailed a confirmation to <b>{order.email || "your inbox"}</b>. Each order is sealed within 24 hours, fresh from the hill country.
      </p>
      <div style={{ display: "inline-flex", gap: 28, margin: "26px 0 32px", padding: "18px 30px", background: "var(--surface)", borderRadius: 12 }}>
        <div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Order no.</div><div className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>{order.id}</div></div>
        <div style={{ width: 1, background: "var(--line)" }} />
        <div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Total</div><div className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>{order.total}</div></div>
      </div>
      <div>
        <a href="Catalog.html" className="btn btn-intl" style={{ display: "inline-flex", width: "auto", padding: "14px 34px", textDecoration: "none" }}>Continue shopping</a>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
function CheckoutPage() {
  const cart = useCart();
  const [market, setMarket] = useMarket();
  const items = cart.items();
  const [deliv, setDeliv] = ckUse("standard");
  const [pay, setPay] = ckUse("card");
  const [email, setEmail] = ckUse("");
  const [order, setOrder] = ckUse(null);
  // address fields wired to API payload
  const [addrLine, setAddrLine] = ckUse("");
  const [addrCity, setAddrCity] = ckUse("");
  const [addrPostal, setAddrPostal] = ckUse("");
  const [addrCountry, setAddrCountry] = ckUse("");
  const [fName, setFName] = ckUse("");
  const [lName, setLName] = ckUse("");
  const [phone, setPhone] = ckUse("");
  const [submitting, setSubmitting] = ckUse(false);
  const [checkoutError, setCheckoutError] = ckUse(null);

  // valid payment method for the active market
  ckEffect(() => { if (market === "local" && pay !== "card") setPay("card"); }, [market]);

  const expressFee = market === "local" ? 1500 : 18;
  const t = cart.totals();
  const shipShown = deliv === "express" ? expressFee : t.ship;
  const totalShown = t.subtotal - t.discount + t.gift + shipShown;

  const placeOrder = async () => {
    setCheckoutError(null);
    if (!window.AranyaAPI) { placeFallback(); return; }
    if (!window.AranyaAPI.isAuthed()) {
      setCheckoutError("Please sign in to complete your order. Use the sign-in link above.");
      return;
    }
    const line1 = (addrLine || "—").trim();
    const city = (addrCity || "—").trim();
    const country = market === "local" ? "LK" : ((addrCountry || "US").trim().toUpperCase().slice(0, 2) || "US");
    const postalCode = (addrPostal || "00000").trim();
    setSubmitting(true);
    try {
      const res = await window.AranyaAPI.createCheckoutIntent({
        shippingAddress: { line1, city, country, postalCode },
        shippingMethod: deliv === "express" ? "EXPRESS" : "STANDARD",
        saveAddress: false,
        customerName: ((fName + " " + lName).trim()) || undefined,
        customerPhone: phone || undefined,
      });
      setOrder({ id: res.orderId, email, total: t.fmt(totalShown), gateway: res.gateway });
      cart.clear();
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        setCheckoutError("Please sign in to complete your order.");
      } else if (e.status === 400 && e.data && e.data.error) {
        setCheckoutError(e.data.error);
      } else {
        setCheckoutError(e.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const placeFallback = () => {
    const id = "AC-" + Math.floor(100000 + Math.random() * 900000);
    setOrder({ id, email, total: t.fmt(totalShown) });
    cart.clear();
    window.scrollTo({ top: 0 });
  };

  if (order) {
    return (
      <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <CheckoutHeader market={market} onMarket={setMarket} />
        <OrderConfirmation order={order} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <CheckoutHeader market={market} onMarket={setMarket} />
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "90px 40px 120px", textAlign: "center" }}>
          <div style={{ opacity: .5, marginBottom: 20, display: "flex", justifyContent: "center" }}><Seal size={70} /></div>
          <h1 className="disp" style={{ fontSize: 38, color: "var(--ink)", margin: "0 0 12px" }}>Your basket is empty</h1>
          <p className="prose" style={{ fontSize: 16.5, color: "var(--muted)", margin: "0 0 26px" }}>Add a few spices before checking out — start with a hill-country bestseller.</p>
          <a href="Catalog.html" className="btn btn-intl" style={{ display: "inline-flex", width: "auto", padding: "14px 32px", textDecoration: "none" }}>Browse the catalogue</a>
        </div>
      </div>
    );
  }

  const standardLabel = t.freeShip ? "Free" : t.fmt(cart.config().ship);

  return (
    <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <CheckoutHeader market={market} onMarket={setMarket} />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 40px 90px" }}>
        <a href="Catalog.html" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)", textDecoration: "none", marginBottom: 22 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to shopping
        </a>
        <h1 className="disp" style={{ fontSize: 44, color: "var(--brand)", margin: "0 0 26px", lineHeight: 1.02 }}>Checkout</h1>
        <div className="ck-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 40, alignItems: "start" }}>
          {/* left: forms */}
          <div>
            <Section n="1" title="Contact" sub="We'll send your order confirmation and tracking here.">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <Field label="Email" type="email" ph="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Field label="Phone" type="tel" ph={market === "local" ? "07X XXX XXXX" : "+1 555 000 0000"} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", margin: "14px 0 0" }}>
                Have an account? <a href="#" onClick={(e) => { e.preventDefault(); window.__openSignIn && window.__openSignIn(); }} style={{ color: "var(--brand)", fontWeight: 700 }}>Sign in</a> for a faster checkout — or continue as a guest.
              </p>
            </Section>

            <Section n="2" title="Shipping address">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <Field label="First name" ph="First" half value={fName} onChange={(e) => setFName(e.target.value)} />
                <Field label="Last name" ph="Last" half value={lName} onChange={(e) => setLName(e.target.value)} />
                <Field label="Address" ph="Street address" value={addrLine} onChange={(e) => setAddrLine(e.target.value)} />
                <Field label="Apartment, suite (optional)" ph="Apt, unit, etc." />
                <Field label="City" ph="City" half value={addrCity} onChange={(e) => setAddrCity(e.target.value)} />
                {market === "local"
                  ? <Field label="District" ph="e.g. Colombo" half />
                  : <Field label="Postal code" ph="ZIP / postal" half value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} />}
                {market === "local"
                  ? <Field label="Postal code" ph="Postal code" half value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} />
                  : <Field label="Country (2-letter code)" ph="US / GB / AU …" half value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)} />}
              </div>
            </Section>

            <Section n="3" title="Delivery method">
              <DeliveryOptions market={market} value={deliv} onChange={setDeliv} standardLabel={standardLabel} />
            </Section>

            <Section n="4" title="Payment" sub="All transactions are encrypted and secure.">
              <PaymentMethods market={market} value={pay} onChange={setPay} />
            </Section>

            {checkoutError && (
              <div style={{ background: "rgba(192,83,31,.08)", border: "1px solid rgba(192,83,31,.3)", borderRadius: 9, padding: "12px 16px", marginBottom: 12, fontFamily: "var(--font-ui)", fontSize: 13.5, color: "#C0531F", fontWeight: 600 }}>
                {checkoutError}
              </div>
            )}
            <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} onClick={placeOrder} disabled={submitting} style={{ marginTop: 4, opacity: submitting ? .7 : 1 }}>
              {submitting ? "Placing order…" : "Place order — " + t.fmt(totalShown)}
            </button>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", textAlign: "center", margin: "12px 0 0" }}>
              By placing your order you agree to our terms & privacy policy.
            </p>
          </div>

          {/* right: summary */}
          <OrderSummary market={market} deliv={deliv} expressFee={expressFee} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CheckoutPage });
