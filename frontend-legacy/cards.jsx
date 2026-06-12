/* Aranya Ceylon — Product card variations. Each takes {spice, market:"intl"|"local"} */

function useHover() {
  const [h, setH] = React.useState(false);
  return [h, { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false) }];
}
function price(spice, market) { return market === "local" ? spice.lkr : spice.usd; }
function ctaClass(market) { return market === "local" ? "btn btn-local" : "btn btn-intl"; }
function pdHref(spice) { return "Product Detail.html?product=" + encodeURIComponent(spice.name); }

/* price-by-weight (mirrors cart-store MULT) so the card price tracks the selector */
const WMULT = { "50g": 0.6, "100g": 1, "250g": 2.3 };
function wNum(p) { return parseFloat(String(p).replace(/[^0-9.]/g, "")); }
function wPrice(spice, market, wt) {
  const n = wNum(market === "local" ? spice.lkr : spice.usd) * (WMULT[wt] || 1);
  return market === "local" ? "Rs " + Math.round(n).toLocaleString("en-US") : "$" + n.toFixed(2);
}
/* add to cart + open the drawer if the host wired one */
function addToCart(spice, wt, form) {
  if (window.AranyaCart) window.AranyaCart.add(spice, wt, form || spice.form || "Whole");
  if (window.__openCart) window.__openCart();
}

function Wish() {
  const [on, setOn] = React.useState(false);
  return (
    <button aria-label="Save" onClick={() => setOn(!on)} style={{
      width: 34, height: 34, borderRadius: 999, border: "1px solid var(--line)", background: "rgba(253,250,245,.94)",
      backdropFilter: "blur(3px)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill={on ? "#BA7517" : "none"} stroke={on ? "#BA7517" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

function WeightSeg({ market, value, onChange }) {
  const ws = ["50g", "100g", "250g"];
  const [iLocal, setILocal] = React.useState(1);
  const i = value != null ? Math.max(0, ws.indexOf(value)) : iLocal;
  const set = (k) => { if (onChange) onChange(ws[k]); else setILocal(k); };
  return (
    <div className={"seg " + (market === "local" ? "local" : "intl")}>
      {ws.map((w, k) => <button key={w} className={k === i ? "on" : ""} onClick={() => set(k)}>{w}</button>)}
    </div>
  );
}

/* ============ CARD A — Editorial Classic (brand-doc literal) ============ */
function CardA({ spice, market = "intl" }) {
  const [h, hp] = useHover();
  return (
    <div className="aranya" {...hp} style={{
      width: "100%", background: "var(--surface)", borderRadius: 6, overflow: "hidden",
      boxShadow: h ? "var(--shadow-md)" : "var(--shadow-sm)", transition: "box-shadow .2s, transform .2s",
      transform: h ? "translateY(-3px)" : "none", borderTop: `5px solid ${spice.color}` }}>
      <div style={{ padding: 14 }}>
        <div style={{ position: "relative", borderRadius: 4, overflow: "hidden" }}>
          <SpicePhoto spice={spice} ratio="1 / 1" label={false} />
          <div style={{ position: "absolute", top: 10, left: 10 }}><Badge kind={spice.badge} /></div>
          <div style={{ position: "absolute", top: 10, right: 10 }}><Wish /></div>
          {/* quick view on hover */}
          <button style={{ position: "absolute", left: 10, right: 10, bottom: 10, opacity: h ? 1 : 0, transform: `translateY(${h ? 0 : 8}px)`,
            transition: "all .2s", background: "rgba(26,26,26,.86)", color: "#fff", border: 0, borderRadius: 4, padding: "10px",
            fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, letterSpacing: ".03em", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, backdropFilter: "blur(2px)" }} onClick={() => { window.location.href = pdHref(spice); }}>
            <Icon name="eye" size={15} stroke="#fff" /> Quick view
          </button>
        </div>
      </div>
      <div style={{ padding: "2px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 9, background: spice.color }} />
          <span className="eyebrow" style={{ color: "var(--muted)" }}>{spice.origin}</span>
        </div>
        <h3 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>{spice.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15, color: "var(--muted)", margin: "2px 0 10px" }}>{spice.latin}</p>
        <div style={{ marginBottom: 14 }}><Stars rating={spice.rating} reviews={spice.reviews} /></div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>From</div>
            <div className="disp" style={{ fontSize: 28, color: "var(--accent)", lineHeight: 1, fontWeight: 600 }}>{price(spice, market)}</div>
          </div>
          <WeightSeg market={market} />
        </div>
        <button className={ctaClass(market)}>Add to Cart</button>
      </div>
    </div>
  );
}

/* ============ CARD B — Full-bleed immersive, slide-up actions ============ */
function CardB({ spice, market = "intl" }) {
  const [h, hp] = useHover();
  const [wt, setWt] = React.useState("100g");
  const [added, setAdded] = React.useState(false);
  const onAdd = () => { addToCart(spice, wt); setAdded(true); setTimeout(() => setAdded(false), 1300); };
  return (
    <div className="aranya" {...hp} style={{
      width: "100%", background: "var(--surface)", borderRadius: 6, overflow: "hidden",
      boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)", transition: "box-shadow .22s, transform .22s",
      transform: h ? "translateY(-4px)" : "none" }}>
      <div style={{ position: "relative" }}>
        <SpicePhoto spice={spice} ratio="4 / 5" label={false} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.18) 0%, transparent 26%, transparent 58%, rgba(0,0,0,.45) 100%)" }} />
        <div style={{ position: "absolute", top: 12, left: 12 }}><Badge kind={spice.badge} solid /></div>
        <div style={{ position: "absolute", top: 12, right: 12 }}><Wish /></div>
        {/* name overlay on image */}
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "#fff" }}>
          <div className="eyebrow" style={{ color: "rgba(255,255,255,.82)", marginBottom: 4 }}>{spice.origin}</div>
          <h3 className="disp" style={{ fontSize: 26, margin: 0, lineHeight: 1.05, color: "#fff", textShadow: "0 1px 12px rgba(0,0,0,.35)" }}>{spice.name}</h3>
        </div>
        {/* spice colour seam */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: spice.color }} />
        {/* quick view slides up */}
        <button style={{ position: "absolute", left: "50%", top: "44%", transform: `translate(-50%,-50%) scale(${h ? 1 : .9})`,
          opacity: h ? 1 : 0, transition: "all .22s", background: "rgba(253,250,245,.95)", color: "var(--ink)", border: 0,
          borderRadius: 999, padding: "11px 20px", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }} onClick={() => { window.location.href = pdHref(spice); }}>
          <Icon name="eye" size={15} /> Quick view
        </button>
      </div>
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
          <Stars rating={spice.rating} reviews={spice.reviews} />
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--muted)" }}>{spice.latin}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="disp" style={{ fontSize: 27, color: "var(--accent)", lineHeight: 1, fontWeight: 600 }}>
            {wPrice(spice, market, wt)}
          </div>
          <WeightSeg market={market} value={wt} onChange={setWt} />
        </div>
        <button className={ctaClass(market)} onClick={onAdd}>{added ? "Added to basket ✓" : "Add to Cart"}</button>
      </div>
    </div>
  );
}

/* ============ CARD C — Minimal luxury, type-led ============ */
function CardC({ spice, market = "intl" }) {
  const [h, hp] = useHover();
  return (
    <div className="aranya" {...hp} style={{
      width: "100%", background: "#FFFDF9", borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)",
      boxShadow: h ? "var(--shadow-md)" : "none", transition: "box-shadow .2s, transform .2s", transform: h ? "translateY(-3px)" : "none" }}>
      <div style={{ position: "relative", padding: "22px 22px 6px" }}>
        <div style={{ position: "absolute", top: 18, right: 18, zIndex: 2 }}><Wish /></div>
        <div style={{ borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.04)" }}>
          <SpicePhoto spice={spice} ratio="1 / 1" label={false} />
        </div>
        {/* quick view text link reveals */}
        <div style={{ textAlign: "center", height: 22, marginTop: 10 }}>
          <a href={pdHref(spice)} style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
            color: "var(--brand)", opacity: h ? 1 : 0, transition: "opacity .2s", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="eye" size={14} stroke="var(--brand)" /> Quick view
          </a>
        </div>
      </div>
      <div style={{ padding: "4px 24px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span className="eyebrow" style={{ color: spice.color, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 14, height: 2, background: spice.color }} />{spice.badge}
          </span>
          <Stars rating={spice.rating} showNum={true} reviews={null} size={12} />
        </div>
        <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "0 0 3px", lineHeight: 1.08, letterSpacing: ".01em" }}>{spice.name}</h3>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", margin: "0 0 18px", letterSpacing: ".02em" }}>{spice.origin}</p>
        <div style={{ height: 1, background: "var(--line)", marginBottom: 16 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="disp" style={{ fontSize: 30, color: "var(--ink)", lineHeight: 1, fontWeight: 600 }}>
            {price(spice, market)}
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}> · 100g</span>
          </div>
          <WeightSeg market={market} />
        </div>
        <button className={market === "local" ? "btn btn-local" : "btn btn-intl"}
          style={{ background: "transparent", color: market === "local" ? "var(--brand)" : "var(--accent)",
            border: `1.5px solid ${market === "local" ? "var(--brand)" : "var(--accent)"}` }}
          onMouseEnter={(e) => { e.currentTarget.style.background = market === "local" ? "var(--brand)" : "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = market === "local" ? "var(--brand)" : "var(--accent)"; }}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}

/* ============ CARD C-FINAL — brand-compliant: #F4F0E8 surface + 5px spice stripe ============ */
function CardCFinal({ spice, market = "intl" }) {
  const [h, hp] = useHover();
  const [wt, setWt] = React.useState("100g");
  const [added, setAdded] = React.useState(false);
  const onAdd = () => { addToCart(spice, wt); setAdded(true); setTimeout(() => setAdded(false), 1300); };
  return (
    <div className="aranya" {...hp} style={{
      width: "100%", background: "var(--surface)", borderRadius: 6, overflow: "hidden",
      borderTop: `5px solid ${spice.color}`, display: "flex", flexDirection: "column",
      boxShadow: h ? "var(--shadow-md)" : "var(--shadow-sm)", transition: "box-shadow .2s, transform .2s", transform: h ? "translateY(-3px)" : "none" }}>
      <div style={{ position: "relative", padding: "20px 20px 6px" }}>
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}><Wish /></div>
        <a href={pdHref(spice)} style={{ display: "block", borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)" }}>
          <SpicePhoto spice={spice} ratio="1 / 1" label={false} />
        </a>
        <div style={{ textAlign: "center", height: 22, marginTop: 10 }}>
          <a href={pdHref(spice)} style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
            color: "var(--brand)", opacity: h ? 1 : 0, transition: "opacity .2s", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="eye" size={14} stroke="var(--brand)" /> Quick view
          </a>
        </div>
      </div>
      <div style={{ padding: "4px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span className="eyebrow" style={{ color: spice.deep, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 14, height: 2, background: spice.color }} />{spice.badge}
          </span>
          <Stars rating={spice.rating} showNum={true} reviews={null} size={12} />
        </div>
        <h3 className="disp" style={{ fontSize: 24, color: "var(--ink)", margin: "0 0 3px", lineHeight: 1.08, letterSpacing: ".01em" }}>{spice.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--muted)", margin: "0 0 16px" }}>{spice.latin}</p>
        <div style={{ height: 1, background: "var(--line)", marginBottom: 15, marginTop: "auto" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15 }}>
          <div className="disp" style={{ fontSize: 29, color: "var(--ink)", lineHeight: 1, fontWeight: 600 }}>
            {wPrice(spice, market, wt)}
          </div>
          <WeightSeg market={market} value={wt} onChange={setWt} />
        </div>
        <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} onClick={onAdd}
          style={{ background: added ? (market === "local" ? "var(--brand)" : "var(--accent)") : "transparent", color: added ? "#fff" : (market === "local" ? "var(--brand)" : "var(--accent)"),
            border: `1.5px solid ${market === "local" ? "var(--brand)" : "var(--accent)"}`, transition: "background .15s, color .15s" }}
          onMouseEnter={(e) => { if (added) return; e.currentTarget.style.background = market === "local" ? "var(--brand)" : "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { if (added) return; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = market === "local" ? "var(--brand)" : "var(--accent)"; }}>
          {added ? "Added to basket ✓" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { CardA, CardB, CardC, CardCFinal });
