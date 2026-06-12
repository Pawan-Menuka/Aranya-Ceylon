/* Aranya Ceylon — Hero + Navbar previews on the real hero frame */
const HERO = "assets/hero-spices.png";
const LINKS = ["Shop", "Categories", "Blog", "About"];

function HNavLink({ children, tone, active }) {
  const [h, setH] = React.useState(false);
  const base = tone === "light" ? "rgba(253,250,245,.92)" : "var(--ink)";
  const hot = tone === "light" ? "#fff" : "var(--brand)";
  return (
    <a href="#" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, letterSpacing: ".02em",
        color: active || h ? hot : base, position: "relative", padding: "6px 0", transition: "color .15s",
        display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      {children}
      <span style={{ position: "absolute", left: 0, right: 0, bottom: -2, height: 1.5, background: "var(--accent)",
        transform: `scaleX(${active || h ? 1 : 0})`, transformOrigin: "left", transition: "transform .22s ease" }} />
    </a>
  );
}
function Cart({ tone }) {
  const col = tone === "light" ? "#FDFAF5" : "var(--ink)";
  return (
    <button aria-label="Cart" style={{ position: "relative", background: "none", border: 0, cursor: "pointer", padding: 4, color: col, display: "grid", placeItems: "center" }}>
      <Icon name="bag" size={20} stroke={col} />
      <span style={{ position: "absolute", top: -3, right: -4, minWidth: 16, height: 16, padding: "0 4px",
        background: "var(--accent)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>3</span>
    </button>
  );
}
function IBtn({ name, label, tone, size = 19 }) {
  const col = tone === "light" ? "#FDFAF5" : "var(--ink)";
  return <button aria-label={label} style={{ background: "none", border: 0, cursor: "pointer", padding: 4, color: col, display: "grid", placeItems: "center" }}><Icon name={name} size={size} stroke={col} /></button>;
}

function HeroCopy({ tone = "light" }) {
  const ink = tone === "light" ? "#FDFAF5" : "var(--ink)";
  const mut = tone === "light" ? "rgba(253,250,245,.74)" : "var(--muted)";
  return (
    <div style={{ maxWidth: 540 }}>
      <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 26, height: 1, background: "#E6B860" }} />Single-Origin Ceylon · Est. 2026
      </div>
      <h1 className="disp" style={{ fontSize: 64, lineHeight: 1.02, color: ink, margin: 0, fontWeight: 600, letterSpacing: ".005em" }}>
        Spice, as the<br />forest intended.
      </h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 16, lineHeight: 1.6, color: mut, margin: "20px 0 30px", maxWidth: 430 }}>
        Hand-harvested from the hill country of Sri Lanka and shipped at peak aroma — never sitting in a warehouse, never blended down.
      </p>
      <div style={{ display: "flex", gap: 14 }}>
        <button className="btn btn-intl" style={{ width: "auto", padding: "14px 26px" }}>Shop the Harvest</button>
        <button className="btn" style={{ width: "auto", padding: "14px 26px", background: "transparent",
          border: `1.5px solid ${tone === "light" ? "rgba(253,250,245,.55)" : "var(--brand)"}`, color: ink }}>Our Story</button>
      </div>
    </div>
  );
}

function HeroStage({ children, copyTone = "light" }) {
  return (
    <div style={{ position: "relative", width: "100%", height: 620, overflow: "hidden", background: "#1a1a1a" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${HERO})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      {/* left scrim for text legibility */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(12,10,8,.82) 0%, rgba(12,10,8,.5) 34%, rgba(12,10,8,0) 60%)" }} />
      {children}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, display: "flex", alignItems: "center", pointerEvents: "none" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", width: "100%" }}>
          <div style={{ pointerEvents: "auto" }}><HeroCopy tone={copyTone} /></div>
        </div>
      </div>
    </div>
  );
}

/* ===== Option B — glassy forest overlay nav floating on the hero ===== */
function HeroNavB() {
  return (
    <div className="aranya" style={{ position: "relative" }}>
      <HeroStage copyTone="light">
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5 }}>
          {/* thin top strip */}
          <div style={{ background: "rgba(11,83,67,.55)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(253,250,245,.12)", color: "#FDFAF5", height: 34, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, letterSpacing: ".05em" }}>Direct from the hill country farms of Sri Lanka</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, display: "inline-flex", gap: 16, alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={13} stroke="#FDFAF5" /> International</span>
              <span style={{ fontWeight: 700, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 3 }}>USD <Icon name="chevron" size={12} stroke="#FDFAF5" /></span>
            </span>
          </div>
          {/* main glass bar */}
          <div style={{ background: "rgba(15,110,86,.32)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(253,250,245,.14)" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", height: 74, display: "flex", alignItems: "center", gap: 36, padding: "0 36px" }}>
              <a href="#" style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Seal size={42} tone="light" />
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                  <span className="disp" style={{ fontSize: 27, color: "#FDFAF5", letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap" }}>Forest Sourced Spices</span>
                </span>
              </a>
              <nav style={{ display: "flex", gap: 26, marginLeft: 8 }}>
                {LINKS.map((l, i) => <HNavLink key={l} tone="light" active={i === 0}>{l}{l === "Shop" && <Icon name="chevron" size={13} stroke="#FDFAF5" />}</HNavLink>)}
              </nav>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(253,250,245,.14)", border: "1px solid rgba(253,250,245,.3)", borderRadius: 999, padding: "9px 14px", width: 220 }}>
                  <Icon name="search" size={17} stroke="rgba(253,250,245,.85)" />
                  <input placeholder="Search spices…" style={{ background: "transparent", border: 0, outline: 0, color: "#FDFAF5", fontFamily: "var(--font-ui)", fontSize: 13, width: "100%" }} />
                </label>
                <IBtn name="user" label="Account" tone="light" />
                <Cart tone="light" />
              </div>
            </div>
          </div>
        </div>
      </HeroStage>
    </div>
  );
}

/* ===== Option C — editorial solid bar ABOVE the hero (true to design) ===== */
function HeroNavC() {
  return (
    <div className="aranya">
      <div style={{ background: "var(--bg)" }}>
        <div style={{ borderBottom: "1px solid var(--line)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", letterSpacing: ".04em", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: "var(--accent)" }}>✦</span> Single-origin · Harvested 2026 · GI &amp; Organic certified
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
              <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={13} stroke="var(--muted)" /> International · USD</a>
              <span style={{ width: 1, height: 13, background: "var(--line)" }} />
              <a href="#">Track order</a>
              <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="user" size={14} stroke="var(--muted)" /> Sign in</a>
            </div>
          </div>
        </div>
        <div style={{ borderBottom: "2px solid var(--brand)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", height: 80, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 40px" }}>
            <a href="#" style={{ display: "flex", alignItems: "center", gap: 12, justifySelf: "start" }}>
              <Seal size={46} />
              <span className="disp" style={{ fontSize: 29, color: "var(--brand)", letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
            </a>
            <nav style={{ display: "flex", gap: 30, justifySelf: "center" }}>
              {LINKS.map((l, i) => <HNavLink key={l} active={i === 0}>{l}{l === "Shop" && <Icon name="chevron" size={13} />}</HNavLink>)}
            </nav>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, justifySelf: "end" }}>
              <IBtn name="search" label="Search" />
              <IBtn name="heart" label="Wishlist" />
              <span style={{ width: 1, height: 20, background: "var(--line)" }} />
              <Cart />
            </div>
          </div>
        </div>
      </div>
      <HeroStage copyTone="light" />
    </div>
  );
}

/* ===== Option C′ — editorial nav inverted to light, floating on the hero ===== */
function HeroNavCInv() {
  return (
    <div className="aranya" style={{ position: "relative" }}>
      <HeroStage copyTone="light">
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5 }}>
          <div style={{ borderBottom: "1px solid rgba(253,250,245,.16)" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "rgba(253,250,245,.8)", letterSpacing: ".04em", display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#E6B860" }}>✦</span> Single-origin · Harvested 2026 · GI &amp; Organic certified
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "rgba(253,250,245,.8)", fontWeight: 600 }}>
                <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={13} stroke="rgba(253,250,245,.8)" /> International · USD</a>
                <span style={{ width: 1, height: 13, background: "rgba(253,250,245,.25)" }} />
                <a href="#">Track order</a>
                <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="user" size={14} stroke="rgba(253,250,245,.8)" /> Sign in</a>
              </div>
            </div>
          </div>
          <div style={{ borderBottom: "2px solid #E6B860" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", height: 80, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 40px" }}>
              <a href="#" style={{ display: "flex", alignItems: "center", gap: 12, justifySelf: "start" }}>
                <Seal size={46} tone="light" />
                <span className="disp" style={{ fontSize: 29, color: "#FDFAF5", letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
              </a>
              <nav style={{ display: "flex", gap: 30, justifySelf: "center" }}>
                {LINKS.map((l, i) => <HNavLink key={l} tone="light" active={i === 0}>{l}{l === "Shop" && <Icon name="chevron" size={13} stroke="#FDFAF5" />}</HNavLink>)}
              </nav>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, justifySelf: "end" }}>
                <IBtn name="search" label="Search" tone="light" />
                <IBtn name="heart" label="Wishlist" tone="light" />
                <span style={{ width: 1, height: 20, background: "rgba(253,250,245,.25)" }} />
                <Cart tone="light" />
              </div>
            </div>
          </div>
        </div>
      </HeroStage>
    </div>
  );
}

Object.assign(window, { HeroNavB, HeroNavC, HeroNavCInv });
