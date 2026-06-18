/* Aranya Ceylon — scroll-driven hero prototype.
   Simulates the 300vh pinned frame-sequence with one frame + scroll-driven
   transforms, so we can evaluate how the navbar behaves through the animation. */
const { useState, useEffect, useRef } = React;
const HERO_IMG = "assets/hero-spices.png";
const LINKS = ["Shop", "Categories", "Blog", "About"];

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

/* ---------- Navbar (all three behaviours in one component) ---------- */
function ProtoNav({ variant, p, dir, atTop, pastHero }) {
  // solidness: 0 = glass over dark, 1 = solid forest bar
  let solid = 0, hidden = false;
  if (variant === "fixed") {
    solid = 0;                         // always glass — the "naive" approach
  } else if (variant === "adaptive") {
    solid = smooth(0.30, 0.62, p);     // glass → solid as the frame brightens
    if (pastHero) solid = 1;
  } else { // autohide (recommended)
    solid = pastHero ? 1 : 0;
    hidden = !atTop && !pastHero && dir !== "up"; // clear the stage while scrolling through
  }
  const bgGlass = "rgba(15,110,86,.30)";
  const bg = solid > 0 ? `rgba(15,110,86,${0.30 + solid * 0.7})` : bgGlass;
  const shadow = solid > 0.5 ? "0 6px 22px rgba(0,0,0,.22)" : "none";
  const borderCol = `rgba(253,250,245,${0.14 + solid * 0.06})`;

  const linkColor = "rgba(253,250,245,.92)";
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      transform: `translateY(${hidden ? -110 : 0}%)`, transition: "transform .5s cubic-bezier(.4,0,.2,1)", willChange: "transform" }}>
      {/* utility strip */}
      <div style={{ height: 32, background: `rgba(11,83,67,${0.55 + solid * 0.45})`, backdropFilter: "blur(8px)",
        color: "#FDFAF5", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px",
        borderBottom: `1px solid ${borderCol}` }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".05em" }}>Direct from the hill country farms of Sri Lanka</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, display: "inline-flex", gap: 14, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={12} stroke="#FDFAF5" /> International</span>
          <span style={{ fontWeight: 700, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 3 }}>USD <Icon name="chevron" size={11} stroke="#FDFAF5" /></span>
        </span>
      </div>
      {/* main bar */}
      <div style={{ background: bg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${borderCol}`, boxShadow: shadow, transition: "background .35s, box-shadow .35s" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 70, display: "flex", alignItems: "center", gap: 34, padding: "0 32px" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Seal size={38} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 25, color: "#FDFAF5", letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap" }}>Forest Sourced Spices</span>
            </span>
          </a>
          <nav style={{ display: "flex", gap: 24, marginLeft: 6 }}>
            {LINKS.map((l, i) => (
              <a key={l} href="#" style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, color: i === 0 ? "#fff" : linkColor, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                {l}{l === "Shop" && <Icon name="chevron" size={12} stroke={i === 0 ? "#fff" : linkColor} />}
              </a>
            ))}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(253,250,245,.14)", border: "1px solid rgba(253,250,245,.3)", borderRadius: 999, padding: "8px 13px", width: 200 }}>
              <Icon name="search" size={16} stroke="rgba(253,250,245,.85)" />
              <input placeholder="Search spices…" style={{ background: "transparent", border: 0, outline: 0, color: "#FDFAF5", fontFamily: "var(--font-ui)", fontSize: 12.5, width: "100%" }} />
            </label>
            <button aria-label="Account" style={{ background: "none", border: 0, cursor: "pointer", padding: 3 }}><Icon name="user" size={18} stroke="#FDFAF5" /></button>
            <button aria-label="Cart" style={{ position: "relative", background: "none", border: 0, cursor: "pointer", padding: 3 }}>
              <Icon name="bag" size={19} stroke="#FDFAF5" />
              <span style={{ position: "absolute", top: -4, right: -5, minWidth: 15, height: 15, padding: "0 3px", background: "var(--accent)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>3</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- The pinned hero stage ---------- */
function HeroStage({ p }) {
  const scale = 1 + p * 0.72;
  const bright = 1 + p * 0.34;
  const sat = 1 + p * 0.25;
  const blur = Math.max(0, (p - 0.82)) * 7;
  const brandFade = 1 - smooth(0.42, 0.78, p);  // brand mark recedes as it "explodes"
  const scrollFade = 1 - smooth(0.02, 0.12, p);
  const glow = smooth(0.25, 1, p) * 0.7;
  return (
    <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#1A1A1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center",
        transform: `scale(${scale})`, filter: `brightness(${bright}) saturate(${sat}) blur(${blur}px)`, transformOrigin: "50% 46%", transition: "filter .1s linear" }} />
      {/* amber explosion glow */}
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: glow,
        background: "radial-gradient(40% 40% at 50% 46%, rgba(230,160,60,.85), rgba(186,117,23,.25) 45%, transparent 70%)" }} />
      {/* depth vignette grows at the end */}
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${120 + p * 180}px rgba(0,0,0,${0.4 + p * 0.3})`, pointerEvents: "none" }} />
      {/* dark→cream hand-off at the very bottom edge */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 160, background: "linear-gradient(180deg, transparent, #FDFAF5)", opacity: smooth(0.9, 1, p) }} />

      {/* Brand overlay — centred low */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "16%", display: "flex", flexDirection: "column", alignItems: "center", opacity: brandFade, transition: "opacity .1s linear", pointerEvents: "none" }}>
        <div style={{ width: 40, height: 1.5, background: "var(--accent)", marginBottom: 22 }} />
        <div className="disp" style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 600, color: "#FDFAF5", letterSpacing: ".12em", lineHeight: 1 }}>ARANYA</div>
        <div className="disp" style={{ fontStyle: "italic", fontSize: "clamp(14px,2vw,20px)", color: "var(--accent)", letterSpacing: ".28em", marginTop: 14 }}>CEYLON</div>
        <div style={{ width: 40, height: 1.5, background: "var(--accent)", marginTop: 22 }} />
      </div>

      {/* Scroll indicator */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: scrollFade, pointerEvents: "none" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(253,250,245,.5)", fontWeight: 500 }}>Scroll</span>
        <div style={{ width: 22, height: 34, borderRadius: 12, border: "1.5px solid rgba(253,250,245,.45)", position: "relative" }}>
          <span className="proto-scrolldot" style={{ position: "absolute", left: "50%", top: 6, width: 3.5, height: 3.5, borderRadius: 9, background: "rgba(253,250,245,.8)", transform: "translateX(-50%)" }} />
        </div>
      </div>

      {/* progress readout (prototype affordance) */}
      <div style={{ position: "absolute", top: 90, right: 24, fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(253,250,245,.4)", letterSpacing: ".08em" }}>
        FRAME {Math.round(1 + p * 191)} / 192
      </div>
    </div>
  );
}

/* ---------- Behaviour switcher (prototype control) ---------- */
function Switcher({ variant, setVariant }) {
  const opts = [
    ["autohide", "Auto-hide", "Recommended"],
    ["adaptive", "Adaptive", "Glass → solid"],
    ["fixed", "Fixed glass", "The naive way"],
  ];
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 22, transform: "translateX(-50%)", zIndex: 80,
      background: "rgba(20,18,16,.86)", backdropFilter: "blur(12px)", border: "1px solid rgba(253,250,245,.16)",
      borderRadius: 14, padding: 8, display: "flex", gap: 6, boxShadow: "0 12px 40px rgba(0,0,0,.4)" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(253,250,245,.5)", display: "flex", alignItems: "center", padding: "0 10px" }}>Navbar<br />behaviour</div>
      {opts.map(([k, t, s]) => (
        <button key={k} onClick={() => setVariant(k)} style={{
          background: variant === k ? "var(--accent)" : "rgba(253,250,245,.06)", color: variant === k ? "#fff" : "rgba(253,250,245,.85)",
          border: variant === k ? "1px solid var(--accent)" : "1px solid rgba(253,250,245,.14)", borderRadius: 9, padding: "8px 14px",
          cursor: "pointer", fontFamily: "var(--font-ui)", textAlign: "left", lineHeight: 1.25, transition: "all .15s" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div>
          <div style={{ fontSize: 10, opacity: .7, marginTop: 2 }}>{s}</div>
        </button>
      ))}
    </div>
  );
}

/* ---------- Content section below the hero ---------- */
function Below() {
  const P = [window.SPICES[0], window.SPICES[1], window.SPICES[5]];
  return (
    <section style={{ background: "var(--bg)", padding: "84px 40px 100px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", marginBottom: 44 }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 14 }}>The 2026 Harvest</div>
        <h2 className="disp" style={{ fontSize: 44, color: "var(--brand)", margin: 0, lineHeight: 1.05 }}>Freshly lifted from the forest floor</h2>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", maxWidth: 540, margin: "16px auto 0", lineHeight: 1.6 }}>
          Scroll back up and watch the navbar — this is where it settles into its solid forest state, legible on cream.
        </p>
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
        {P.map((s) => <CardA key={s.name} spice={s} market="intl" />)}
      </div>
    </section>
  );
}

function App() {
  const [variant, setVariant] = useState("autohide");
  const [p, setP] = useState(0);
  const [dir, setDir] = useState("down");
  const [pastHero, setPast] = useState(false);
  const last = useRef(0);
  const heroRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vh = window.innerHeight;
        const span = vh * 2;                      // 300vh section → 200vh of travel
        const y = window.scrollY;
        const prog = Math.min(1, Math.max(0, y / span));
        setP(prog);
        setPast(y > span + 4);
        const d = y > last.current ? "down" : "up";
        if (Math.abs(y - last.current) > 2) setDir(d);
        last.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const atTop = p < 0.02;
  return (
    <div className="aranya">
      <ProtoNav variant={variant} p={p} dir={dir} atTop={atTop} pastHero={pastHero} />
      <div ref={heroRef} style={{ height: "300vh", position: "relative" }}>
        <HeroStage p={p} />
      </div>
      <Below />
      <Switcher variant={variant} setVariant={setVariant} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
