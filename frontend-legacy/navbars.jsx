/* Aranya Ceylon — Navbar variations */

const NAV_LINKS = ["Shop", "Categories", "Blog", "About"];

function CartBtn({ count = 3, tone = "ink" }) {
  const col = tone === "light" ? "#FDFAF5" : "var(--ink)";
  return (
    <button aria-label="Cart" style={{ position: "relative", background: "none", border: 0, cursor: "pointer", padding: 4, color: col, display: "grid", placeItems: "center" }}>
      <Icon name="bag" size={20} stroke={col} />
      <span style={{ position: "absolute", top: -3, right: -4, minWidth: 16, height: 16, padding: "0 4px",
        background: "var(--accent)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)",
        fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>{count}</span>
    </button>
  );
}

function IconBtn({ name, label, tone = "ink", size = 19 }) {
  const col = tone === "light" ? "#FDFAF5" : "var(--ink)";
  return (
    <button aria-label={label} style={{ background: "none", border: 0, cursor: "pointer", padding: 4, color: col, display: "grid", placeItems: "center" }}>
      <Icon name={name} size={size} stroke={col} />
    </button>
  );
}

function NavLink({ children, tone = "ink", active = false }) {
  const [h, setH] = React.useState(false);
  const base = tone === "light" ? "#FDFAF5" : "var(--ink)";
  const hot = tone === "light" ? "#FFFFFF" : "var(--brand)";
  return (
    <a href="#" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, letterSpacing: ".02em",
        color: active || h ? hot : base, position: "relative", padding: "6px 0", transition: "color .15s",
        display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
      <span style={{ position: "absolute", left: 0, right: 0, bottom: -2, height: 1.5, background: "var(--accent)",
        transform: `scaleX(${active || h ? 1 : 0})`, transformOrigin: "left", transition: "transform .22s ease" }} />
    </a>
  );
}

function Announce({ children, bg = "var(--brand)", fg = "#FDFAF5", currency = "USD" }) {
  return (
    <div style={{ background: bg, color: fg, height: 38, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: ".04em", fontWeight: 500, display: "inline-flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "#D9B775" }}>✦</span>{children}
      </span>
      <div style={{ position: "absolute", right: 22, top: 0, height: "100%", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, opacity: .85, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="globe" size={13} stroke={fg} /> Ship to: {currency === "USD" ? "International" : "Sri Lanka"}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 3 }}>
          {currency} <Icon name="chevron" size={12} stroke={fg} />
        </span>
      </div>
    </div>
  );
}

/* ============ NAV A — Symmetric cream, centered seal ============ */
function NavA({ currency = "USD" }) {
  return (
    <div className="aranya" style={{ width: "100%", background: "var(--bg)" }}>
      <Announce currency={currency}>Complimentary worldwide shipping on orders over $60</Announce>
      <div style={{ borderBottom: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 84, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 40px" }}>
          <nav style={{ display: "flex", gap: 30 }}>
            {NAV_LINKS.map((l, i) => <NavLink key={l} active={i === 0}>{l === "Shop" && <Icon name="chevron" size={13} />}{l}</NavLink>)}
          </nav>
          <a href="#" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Seal size={40} />
              <span className="disp" style={{ fontSize: 30, color: "var(--brand)", letterSpacing: ".02em", lineHeight: 1 }}>Aranya</span>
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, letterSpacing: ".42em", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", marginLeft: 4 }}>Ceylon Spices</span>
          </a>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 18 }}>
            <IconBtn name="search" label="Search" />
            <IconBtn name="user" label="Account" />
            <span style={{ width: 1, height: 20, background: "var(--line)" }} />
            <CartBtn count={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ NAV B — Deep forest bar, inline search ============ */
function NavB({ currency = "USD" }) {
  return (
    <div className="aranya" style={{ width: "100%" }}>
      <div style={{ background: "#0B5343", color: "#FDFAF5", height: 36, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, letterSpacing: ".05em", display: "inline-flex", gap: 18 }}>
          <span>Direct from the hill country farms of Sri Lanka</span>
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, display: "inline-flex", gap: 16, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={13} stroke="#FDFAF5" /> {currency === "USD" ? "International" : "Sri Lanka"}</span>
          <span style={{ fontWeight: 700, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 3 }}>{currency} <Icon name="chevron" size={12} stroke="#FDFAF5" /></span>
        </span>
      </div>
      <div style={{ background: "var(--brand)", boxShadow: "var(--shadow-md)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 76, display: "flex", alignItems: "center", gap: 36, padding: "0 36px" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <Seal size={42} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 27, color: "#FDFAF5", letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: ".34em", color: "#D9B775", fontWeight: 600, textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap" }}>Forest Sourced Spices</span>
            </span>
          </a>
          <nav style={{ display: "flex", gap: 26, marginLeft: 8 }}>
            {NAV_LINKS.map((l, i) => <NavLink key={l} tone="light" active={i === 0}>{l}{l === "Shop" && <Icon name="chevron" size={13} stroke="#FDFAF5" />}</NavLink>)}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(253,250,245,.12)", border: "1px solid rgba(253,250,245,.28)", borderRadius: 999, padding: "9px 14px", width: 230 }}>
              <Icon name="search" size={17} stroke="rgba(253,250,245,.85)" />
              <input placeholder="Search spices…" style={{ background: "transparent", border: 0, outline: 0, color: "#FDFAF5", fontFamily: "var(--font-ui)", fontSize: 13, width: "100%" }} />
            </label>
            <IconBtn name="user" label="Account" tone="light" />
            <CartBtn count={3} tone="light" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ NAV C — Two-tier editorial ============ */
function NavC({ currency = "USD" }) {
  return (
    <div className="aranya" style={{ width: "100%", background: "var(--bg)" }}>
      <div style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", letterSpacing: ".04em", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: "var(--accent)" }}>✦</span> Single-origin · Harvested 2026 · GI &amp; Organic certified
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
            <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={13} stroke="var(--muted)" /> {currency === "USD" ? "International" : "Sri Lanka"} · {currency}</a>
            <span style={{ width: 1, height: 13, background: "var(--line)" }} />
            <a href="#">Track order</a>
            <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="user" size={14} stroke="var(--muted)" /> Sign in</a>
          </div>
        </div>
      </div>
      <div style={{ borderBottom: "2px solid var(--brand)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 82, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 40px" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 12, justifySelf: "start" }}>
            <Seal size={46} />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 29, color: "var(--brand)", letterSpacing: ".02em" }}>Aranya Ceylon</span>
            </span>
          </a>
          <nav style={{ display: "flex", gap: 30, justifySelf: "center" }}>
            {NAV_LINKS.map((l, i) => <NavLink key={l} active={i === 0}>{l}{l === "Shop" && <Icon name="chevron" size={13} />}</NavLink>)}
          </nav>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, justifySelf: "end" }}>
            <IconBtn name="search" label="Search" />
            <IconBtn name="heart" label="Wishlist" />
            <span style={{ width: 1, height: 20, background: "var(--line)" }} />
            <CartBtn count={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NavA, NavB, NavC });
