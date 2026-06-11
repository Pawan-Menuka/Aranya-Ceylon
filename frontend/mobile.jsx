/* Aranya Ceylon — MOBILE components. Designed for ~402px device width. */
const { useState: mUseState, useEffect: mUseEffect, useRef: mUseRef } = React;
const M_LINKS = [
  { label: "Shop", href: "Catalog.html" },
  { label: "Categories", href: "Categories.html" },
  { label: "Blog", href: "Journal.html" },
  { label: "About", href: "About.html" },
];
const SAFE_TOP = 50; // clear the status bar / notch

function mPrice(s, market) { return market === "local" ? s.lkr : s.usd; }

function MHeart({ light = false, size = 18 }) {
  const [on, setOn] = mUseState(false);
  return (
    <button aria-label="Save" onClick={(e) => { e.stopPropagation(); setOn(!on); }} style={{
      width: 34, height: 34, borderRadius: 999, border: light ? "1px solid rgba(253,250,245,.4)" : "1px solid var(--line)",
      background: light ? "rgba(20,20,20,.32)" : "rgba(253,250,245,.94)", backdropFilter: "blur(3px)", cursor: "pointer",
      display: "grid", placeItems: "center" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "#BA7517" : "none"} stroke={on ? "#BA7517" : (light ? "#FDFAF5" : "var(--muted)")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

/* ---------- Mobile top bar ---------- */
function MobileNav({ market = "intl", heroMode = false, onMenu, scrolled }) {
  const solid = heroMode ? scrolled : true;
  const light = "#FDFAF5";
  const bg = solid ? "rgba(15,110,86,.96)" : "rgba(15,110,86,.18)";
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ background: bg, backdropFilter: "blur(12px)", paddingTop: SAFE_TOP,
        borderBottom: `1px solid rgba(253,250,245,${solid ? .14 : .2})`, transition: "background .3s" }}>
        <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
          <button aria-label="Menu" onClick={onMenu} style={{ background: "none", border: 0, padding: 8, cursor: "pointer", display: "grid", placeItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={light} strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <a href="Home.html" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Seal size={30} tone="light" />
            <span className="disp" style={{ fontSize: 21, color: light, letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button aria-label="Search" style={{ background: "none", border: 0, padding: 8, cursor: "pointer" }}><Icon name="search" size={20} stroke={light} /></button>
            <button aria-label="Cart" style={{ position: "relative", background: "none", border: 0, padding: 8, cursor: "pointer" }}>
              <Icon name="bag" size={20} stroke={light} />
              <span style={{ position: "absolute", top: 2, right: 2, minWidth: 15, height: 15, padding: "0 3px", background: "var(--accent)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>3</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Slide-in drawer ---------- */
function MobileDrawer({ open, onClose, market, setMarket }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 90, pointerEvents: open ? "auto" : "none" }}>
      {/* scrim */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,12,8,.5)", opacity: open ? 1 : 0, transition: "opacity .3s" }} />
      {/* panel */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 320, background: "var(--brand)", color: "#FDFAF5",
        transform: `translateX(${open ? 0 : -100}%)`, transition: "transform .34s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column",
        boxShadow: "8px 0 40px rgba(0,0,0,.3)", paddingTop: SAFE_TOP }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Seal size={30} tone="light" />
            <span className="disp" style={{ fontSize: 21, color: "#FDFAF5", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ background: "none", border: 0, padding: 6, cursor: "pointer" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FDFAF5" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {/* search */}
        <div style={{ padding: "0 18px 8px" }}>
          <form onSubmit={(e) => { e.preventDefault(); const q = e.currentTarget.q.value.trim(); window.location.href = "Search.html" + (q ? "?q=" + encodeURIComponent(q) : ""); }}
            style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(253,250,245,.12)", border: "1px solid rgba(253,250,245,.24)", borderRadius: 12, padding: "12px 14px" }}>
            <button type="submit" aria-label="Search" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <Icon name="search" size={18} stroke="rgba(253,250,245,.85)" />
            </button>
            <input name="q" placeholder="Search spices…" style={{ background: "transparent", border: 0, outline: 0, color: "#FDFAF5", fontFamily: "var(--font-ui)", fontSize: 15, width: "100%" }} />
          </form>
        </div>
        {/* links */}
        <nav style={{ padding: "10px 0", flex: 1 }}>
          {M_LINKS.map((l) => (
            <a key={l.label} href={l.href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px",
              fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "#FDFAF5", borderBottom: "1px solid rgba(253,250,245,.1)" }}>
              {l.label}<Icon name="chevron" size={18} stroke="rgba(253,250,245,.6)" />
            </a>
          ))}
        </nav>
        {/* account + market */}
        <div style={{ padding: "16px 20px 24px", borderTop: "1px solid rgba(253,250,245,.14)" }}>
          <a href="Account.html" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0 16px", fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, color: "#FDFAF5" }}>
            <Icon name="user" size={19} stroke="#FDFAF5" /> Sign in / Create account
          </a>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(253,250,245,.55)", marginBottom: 10 }}>Shipping to</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMarket("intl")} style={{ flex: 1, padding: "11px", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
              border: market === "intl" ? "1.5px solid #E6B860" : "1.5px solid rgba(253,250,245,.22)", background: market === "intl" ? "rgba(230,184,96,.16)" : "transparent", color: "#FDFAF5" }}>International · USD</button>
            <button onClick={() => setMarket("local")} style={{ flex: 1, padding: "11px", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
              border: market === "local" ? "1.5px solid #E6B860" : "1.5px solid rgba(253,250,245,.22)", background: market === "local" ? "rgba(230,184,96,.16)" : "transparent", color: "#FDFAF5" }}>Sri Lanka · LKR</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Compact 2-up catalog card (mobile C) ---------- */
function CardCMobile({ spice, market = "intl" }) {
  return (
    <div className="aranya" style={{ background: "var(--surface)", borderRadius: 6, overflow: "hidden", borderTop: `5px solid ${spice.color}`, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ position: "relative", padding: 10 }}>
        <div style={{ borderRadius: 3, overflow: "hidden" }}><SpicePhoto spice={spice} ratio="1 / 1" label={false} /></div>
        <div style={{ position: "absolute", top: 16, right: 16 }}><MHeart size={16} /></div>
      </div>
      <div style={{ padding: "2px 12px 14px" }}>
        <div className="eyebrow" style={{ color: spice.deep, fontSize: 9.5, display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span style={{ width: 10, height: 2, background: spice.color }} />{spice.badge}
        </div>
        <h3 className="disp" style={{ fontSize: 19, color: "var(--ink)", margin: "0 0 1px", lineHeight: 1.08 }}>{spice.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 12.5, color: "var(--muted)", margin: "0 0 9px" }}>{spice.latin}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{mPrice(spice, market)}</span>
          <button aria-label="Add to cart" style={{ width: 38, height: 38, borderRadius: 9, cursor: "pointer", display: "grid", placeItems: "center",
            background: market === "local" ? "var(--brand)" : "var(--accent)", border: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M12 12v4M10 14h4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileNav, MobileDrawer, CardCMobile, MHeart, SAFE_TOP });
