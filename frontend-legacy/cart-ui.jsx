/* Aranya Ceylon — cart UI: hooks + slide-in CartDrawer + SignIn modal.
   Depends on cart-store.js (window.AranyaCart), shared.jsx (SpicePhoto, Icon, Seal).
   Exports: useCart, useMarket, CartDrawer, SignInModal, money helpers. */
const { useState: cuUse, useEffect: cuEffect, useRef: cuRef } = React;

/* re-render whenever the store changes; returns the store API */
function useCart() {
  const [, force] = cuUse(0);
  cuEffect(() => window.AranyaCart.subscribe(() => force((n) => n + 1)), []);
  return window.AranyaCart;
}
/* market that reads/writes the shared store (persists across pages) */
function useMarket() {
  const cart = useCart();
  return [cart.market(), (m) => cart.setMarket(m)];
}

/* small round line-item thumbnail from the spice colour fields */
function LineThumb({ item, size = 62 }) {
  return (
    <div style={{ width: size, height: size, flex: "0 0 auto", borderRadius: 7, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
      <SpicePhoto spice={item} ratio="1 / 1" label={false} />
    </div>
  );
}

/* qty stepper used in the drawer */
function MiniQty({ item }) {
  const cart = window.AranyaCart;
  const b = (t, fn, dis) => (
    <button onClick={fn} disabled={dis} aria-label={t === "−" ? "Decrease" : "Increase"} style={{
      width: 30, height: 32, border: 0, background: "none", cursor: dis ? "default" : "pointer",
      fontFamily: "var(--font-ui)", fontSize: 16, color: dis ? "var(--line)" : "var(--ink)", lineHeight: 1 }}>{t}</button>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, background: "#fff" }}>
      {b("−", () => cart.dec(item.id), item.qty <= 1)}
      <span style={{ width: 24, textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700 }}>{item.qty}</span>
      {b("+", () => cart.inc(item.id), false)}
    </div>
  );
}

/* ============ Cart Drawer ============ */
function CartDrawer({ open, onClose, checkoutHref = "Checkout.html" }) {
  const cart = useCart();
  const items = cart.items();
  const t = cart.totals();
  const market = cart.market();
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const [promoInput, setPromoInput] = cuUse("");
  const [promoErr, setPromoErr] = cuUse(false);
  const [showNote, setShowNote] = cuUse(false);

  cuEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const pct = t.freeShip ? 100 : Math.min(100, (1 - t.remainingToFree / t.freeShipThreshold) * 100);

  return (
    <React.Fragment>
      {/* backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 120, background: "rgba(20,16,12,.46)", backdropFilter: "blur(2px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s" }} />
      {/* panel */}
      <aside className="aranya" style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 121, width: "min(440px, 100vw)", background: "var(--bg)",
        boxShadow: "-18px 0 50px rgba(0,0,0,.25)", transform: `translateX(${open ? 0 : 100}%)`,
        transition: "transform .36s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column" }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 className="disp" style={{ fontSize: 26, color: "var(--ink)", margin: 0 }}>Your Basket</h2>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{cart.count()} {cart.count() === 1 ? "item" : "items"}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {items.length === 0 ? (
          /* empty state */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
            <div style={{ opacity: .5, marginBottom: 18 }}><Seal size={64} /></div>
            <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "0 0 8px" }}>Your basket is empty</h3>
            <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 22px", maxWidth: 280 }}>Fresh-milled spice, sealed at peak aroma — start with a hill-country bestseller.</p>
            <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "13px 30px" }} onClick={onClose}>Browse spices</button>
          </div>
        ) : (
          <React.Fragment>
            {/* free-ship progress */}
            <div style={{ padding: "16px 24px 14px", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink)", marginBottom: 8, fontWeight: 600 }}>
                {t.freeShip
                  ? <span style={{ color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      You've unlocked free shipping</span>
                  : <span>Add <b style={{ color: accent }}>{t.fmt(t.remainingToFree)}</b> more for free shipping</span>}
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(26,26,26,.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", borderRadius: 999, background: accent, transition: "width .35s" }} />
              </div>
            </div>

            {/* line items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
              {items.map((it) => (
                <div key={it.id} style={{ display: "flex", gap: 14, padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
                  <LineThumb item={it} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <h4 className="disp" style={{ fontSize: 19, color: "var(--ink)", margin: 0, lineHeight: 1.12 }}>{it.name}</h4>
                      <button onClick={() => cart.remove(it.id)} aria-label="Remove" style={{ background: "none", border: 0, cursor: "pointer", padding: 2, flex: "0 0 auto", height: 22 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                      </button>
                    </div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: ".03em", margin: "3px 0 11px" }}>
                      {it.weight} · {it.form}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <MiniQty item={it} />
                      <span className="disp" style={{ fontSize: 21, color: "var(--ink)", fontWeight: 600 }}>{cart.fmt(cart.linePrice(it))}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* gift + promo */}
              <div style={{ padding: "18px 0 8px", display: "flex", flexDirection: "column", gap: 14 }}>
                {/* gift wrap */}
                <label style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
                  <span onClick={() => cart.setGiftWrap(!cart.get().giftWrap)} style={{ width: 19, height: 19, flex: "0 0 auto", borderRadius: 5, border: cart.get().giftWrap ? "none" : "1.5px solid var(--line)", background: cart.get().giftWrap ? "var(--brand)" : "#fff", display: "grid", placeItems: "center" }}>
                    {cart.get().giftWrap && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  </span>
                  <span onClick={() => cart.setGiftWrap(!cart.get().giftWrap)} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink)", fontWeight: 600, flex: 1 }}>Add gift wrapping</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>+{cart.fmt(cart.config().giftWrap)}</span>
                </label>
                {cart.get().giftWrap && (
                  <React.Fragment>
                    {!showNote
                      ? <button onClick={() => setShowNote(true)} style={{ alignSelf: "flex-start", background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3, paddingLeft: 30 }}>+ Add a gift note</button>
                      : <textarea value={cart.get().giftNote} onChange={(e) => cart.setGiftNote(e.target.value)} placeholder="Write your gift note…" rows={2} style={{ marginLeft: 30, fontFamily: "var(--font-read)", fontSize: 14, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 7, padding: "10px 12px", resize: "vertical", background: "#fff", outline: "none" }} />}
                  </React.Fragment>
                )}
                {/* promo */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={promoInput} onChange={(e) => { setPromoInput(e.target.value); setPromoErr(false); }} placeholder="Promo code" style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)", border: promoErr ? "1px solid #C0531F" : "1px solid var(--line)", borderRadius: 7, padding: "10px 12px", background: "#fff", outline: "none", textTransform: "uppercase" }} />
                  <button onClick={() => { if (!cart.applyPromo(promoInput)) setPromoErr(true); }} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--ink)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 7, padding: "0 16px", cursor: "pointer" }}>Apply</button>
                </div>
                {cart.get().promo && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--brand)", fontWeight: 600 }}>Code {cart.get().promo} applied — {Math.round(t.discountRate * 100)}% off</div>}
                {promoErr && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "#C0531F", fontWeight: 600, marginTop: -6 }}>That code isn't valid. Try CEYLON10.</div>}
              </div>
            </div>

            {/* footer / totals */}
            <div style={{ padding: "18px 24px 22px", borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                <Row label="Subtotal" val={t.fmt(t.subtotal)} />
                {t.discount > 0 && <Row label={"Discount (" + cart.get().promo + ")"} val={"−" + t.fmt(t.discount)} accent />}
                {t.gift > 0 && <Row label="Gift wrapping" val={t.fmt(t.gift)} />}
                <Row label="Shipping" val={t.freeShip ? "Free" : t.fmt(t.ship)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <span className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>Total</span>
                <span className="disp" style={{ fontSize: 30, color: "var(--ink)", fontWeight: 600 }}>{t.fmt(t.total)}</span>
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", margin: "6px 0 14px", textAlign: "right" }}>
                {market === "local" ? "Inclusive of taxes" : "Duty & taxes calculated at customs"}
              </p>
              <a href={checkoutHref} className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                Checkout — {t.fmt(t.total)}
              </a>
              <button onClick={onClose} style={{ width: "100%", background: "none", border: 0, cursor: "pointer", marginTop: 10, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Continue shopping</button>
            </div>
          </React.Fragment>
        )}
      </aside>
    </React.Fragment>
  );
}

function Row({ label, val, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
      <span style={{ color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent ? "var(--brand)" : "var(--ink)", fontWeight: 700 }}>{val}</span>
    </div>
  );
}

/* ============ Sign-in modal (guest + optional account) ============ */
function SignInModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = cuUse("in"); // "in" | "up"
  const [name, setName] = cuUse("");
  const [email, setEmail] = cuUse("");
  const [password, setPassword] = cuUse("");
  const [loading, setLoading] = cuUse(false);
  const [error, setError] = cuUse(null);

  cuEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset form when modal opens or mode switches
  cuEffect(() => { setError(null); setLoading(false); }, [open, mode]);

  if (!open) return null;

  const switchMode = (m) => { setMode(m); setError(null); };

  const submit = async () => {
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    setLoading(true); setError(null);
    try {
      if (mode === "in") {
        await window.AranyaAPI.login(email.trim(), password);
      } else {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        await window.AranyaAPI.register({ name: name.trim(), email: email.trim(), password });
      }
      setName(""); setEmail(""); setPassword("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      setError((e.data && e.data.message) || e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const field = (label, type, ph, value, onChange) => (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} placeholder={ph} value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }} />
    </label>
  );

  return (
    <div className="aranya" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(20,16,12,.5)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 100%)", background: "var(--bg)", borderRadius: 14, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        <div style={{ background: "var(--brand)", padding: "26px 30px 24px", textAlign: "center", color: "#FDFAF5" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Seal size={48} tone="light" /></div>
          <h2 className="disp" style={{ fontSize: 27, margin: 0 }}>{mode === "in" ? "Welcome back" : "Create your account"}</h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.78)", margin: "5px 0 0" }}>{mode === "in" ? "Sign in to track orders & reorder favourites" : "Save your details for faster checkout"}</p>
        </div>
        <div style={{ padding: "26px 30px 30px" }}>
          {error && <div style={{ background: "rgba(192,83,31,.08)", border: "1px solid rgba(192,83,31,.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: "var(--font-ui)", fontSize: 13, color: "#C0531F", fontWeight: 600 }}>{error}</div>}
          {mode === "up" && field("Full name", "text", "Your name", name, setName)}
          {field("Email", "email", "you@example.com", email, setEmail)}
          {field("Password", "password", "••••••••", password, setPassword)}
          <button className="btn btn-intl" style={{ marginTop: 4, opacity: loading ? .7 : 1 }} onClick={submit} disabled={loading}>
            {loading ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>
            {mode === "in" ? "New to Aranya? " : "Already have an account? "}
            <button onClick={() => switchMode(mode === "in" ? "up" : "in")} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>{mode === "in" ? "Create an account" : "Sign in"}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>or</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <button onClick={onClose} style={{ width: "100%", background: "transparent", border: "1.5px solid var(--brand)", color: "var(--brand)", borderRadius: 999, padding: "13px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700 }}>Continue as guest</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { useCart, useMarket, CartDrawer, SignInModal });
