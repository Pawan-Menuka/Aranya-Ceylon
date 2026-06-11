/* Aranya Ceylon — MOBILE PAGES: shared chrome + primitives for the standalone
   content-page mobile ports (Categories, Search, Gifts, Journal/Article, Recipes/Detail, About).
   Self-contained — does NOT depend on the purchase-flow files. Each page renders inside an
   IOSDevice; the device's content area already scrolls, so pages use normal flowing content
   with a sticky MPageBar at the top.
   Depends on: mobile.jsx (SAFE_TOP), shared.jsx (Seal, Icon, SpicePhoto), home-common.jsx (Eyebrow, Liyawel). */
const { useState: mpUse, useMemo: mpMemo, useRef: mpRef, useEffect: mpEffect } = React;

function mpPrice(p, market) { return market === "local" ? p.lkr : p.usd; }

/* ---------- sticky top chrome (forest, optional back) ---------- */
function MPageBar({ title, eyebrow, onBack, right, light = "#FDFAF5" }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ background: "rgba(15,110,86,.98)", backdropFilter: "blur(12px)", paddingTop: SAFE_TOP, borderBottom: "1px solid rgba(253,250,245,.16)" }}>
        <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", gap: 8 }}>
          <div style={{ width: 56, display: "flex", justifyContent: "flex-start" }}>
            {onBack && (
              <button aria-label="Back" onClick={onBack} style={{ background: "none", border: 0, padding: 8, cursor: "pointer", display: "grid", placeItems: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={light} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            {eyebrow && <div style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(230,184,96,.95)", lineHeight: 1, marginBottom: 2 }}>{eyebrow}</div>}
            <div className="disp" style={{ fontSize: 20, color: light, lineHeight: 1.05, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          </div>
          <div style={{ width: 56, display: "flex", justifyContent: "flex-end" }}>{right}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- forest page header (eyebrow + Liyawel + title + lede) ---------- */
function MPageHero({ eyebrow, title, lede, motif = true }) {
  return (
    <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden", padding: "30px 22px 34px", textAlign: "center" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        {motif && <Liyawel width={130} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ marginBottom: 16 }} />}
        <Eyebrow center light>{eyebrow}</Eyebrow>
        <h1 className="disp" style={{ fontSize: "clamp(34px,9vw,42px)", lineHeight: 1.02, margin: "12px 0 0", fontWeight: 600, letterSpacing: ".005em" }}>{title}</h1>
        {lede && <p className="prose" style={{ fontSize: 15, color: "rgba(253,250,245,.82)", margin: "14px auto 0", maxWidth: 320 }}>{lede}</p>}
      </div>
    </header>
  );
}

/* ---------- compact catalog card (CardCFinal flavour, mobile) ---------- */
function MProductCard({ p, market, accent = "var(--accent)" }) {
  const [added, setAdded] = mpUse(false);
  const price = mpPrice(p, market);
  return (
    <div style={{ background: "var(--surface)", borderRadius: 7, overflow: "hidden", borderTop: `5px solid ${p.color}`, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ padding: 10 }}>
        <div style={{ borderRadius: 4, overflow: "hidden" }}><SpicePhoto spice={p} ratio="1 / 1" label={false} /></div>
      </div>
      <div style={{ padding: "2px 12px 13px" }}>
        <div className="eyebrow" style={{ color: p.deep, fontSize: 9, display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span style={{ width: 10, height: 2, background: p.color }} />{p.badge}
        </div>
        <h3 className="disp" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.14 }}>{p.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 11.5, color: "var(--muted)", margin: "0 0 11px", lineHeight: 1.2 }}>{p.latin}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span className="disp" style={{ fontSize: 19, color: "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{price}</span>
          <button onClick={() => { setAdded(true); setTimeout(() => setAdded(false), 1100); }}
            style={{ flex: "0 0 auto", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, padding: "8px 13px", borderRadius: 8, cursor: "pointer",
              border: `1.5px solid ${accent}`, background: added ? accent : "transparent", color: added ? "#fff" : accent, transition: "background .15s, color .15s" }}>
            {added ? "Added ✓" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- forest CTA footer strip (closes each standalone page) ---------- */
function MPageFooter({ market }) {
  return (
    <footer style={{ background: "#1A1A1A", color: "#FDFAF5", padding: "36px 24px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 70% at 50% 0%, rgba(15,110,86,.22), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <Liyawel width={150} color="rgba(230,184,96,.5)" style={{ marginBottom: 18 }} />
        <div className="disp" style={{ fontSize: 23, color: "#FDFAF5", letterSpacing: ".02em" }}>Aranya Ceylon</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, letterSpacing: ".32em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 6 }}>Forest Sourced Spices</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 22 }}>
          {["Shop", "Journal", "About", "Contact"].map((l) => <span key={l} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.7)" }}>{l}</span>)}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(253,250,245,.5)", marginTop: 22 }}>© 2026 Aranya Ceylon</div>
      </div>
    </footer>
  );
}

Object.assign(window, { MPageBar, MPageHero, MProductCard, MPageFooter, mpPrice });
