/* Aranya Ceylon — CANONICAL NAVBAR (locked: Option B glass + auto-hide)
   <AranyaNavbar market="intl"|"local" heroMode={true|false} />
   - heroMode: glassy forest overlay over a dark hero; auto-hides while
     scrolling down through the hero, returns SOLID on scroll-up / past hero.
   - non-hero pages: solid forest bar, sticky, hide-on-scroll-down / show-on-up.
   Single source of truth — import on every page. */
const { useState, useEffect, useRef } = React;
const NAV_LINKS = [
  { label: "Shop", href: "Catalog.html", match: ["Catalog.html"] },
  { label: "Categories", href: "Categories.html", match: ["Categories.html"] },
  { label: "Blog", href: "Journal.html", match: ["Journal.html", "Article.html"] },
  { label: "About", href: "About.html", match: ["About.html"] },
];
function _curFile() { try { return (location.pathname.split("/").pop() || "").split("?")[0]; } catch (e) { return ""; } }
function _smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function AranyaNavbar({ market = "intl", heroMode = false, heroSelector = "[data-hero]", cartCount = 3, onCartClick, onAccountClick }) {
  const [p, setP] = useState(0);          // hero scroll progress 0..1 (heroMode only)
  const [dir, setDir] = useState("up");
  const [y, setY] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cur = window.scrollY;
        setY(cur);
        if (Math.abs(cur - last.current) > 2) setDir(cur > last.current ? "down" : "up");
        if (heroMode) {
          const hero = document.querySelector(heroSelector);
          const span = hero ? hero.offsetHeight - window.innerHeight : window.innerHeight * 2;
          setP(Math.min(1, Math.max(0, cur / Math.max(1, span))));
        }
        last.current = cur;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [heroMode, heroSelector]);

  // ---- derive presentation ----
  const atTop = y < 8;
  const pastHero = heroMode ? p > 0.992 : true;
  let solid, hidden;
  if (heroMode) {
    solid = pastHero ? 1 : 0;                       // glass over hero, solid after
    hidden = !atTop && !pastHero && dir !== "up";   // clear the stage during the animation
  } else {
    solid = 1;                                      // always solid forest on normal pages
    hidden = dir === "down" && y > 120;             // hide on scroll-down, reveal on scroll-up
  }

  const market_ = market === "local"
    ? { ship: "Sri Lanka", cur: "LKR" }
    : { ship: "International", cur: "USD" };

  const glassBg = "rgba(15,110,86,.30)";
  const barBg = solid ? `rgba(15,110,86,${0.3 + solid * 0.7})` : glassBg;
  const stripBg = `rgba(11,83,67,${0.55 + solid * 0.45})`;
  const border = `rgba(253,250,245,${0.14 + solid * 0.06})`;
  const shadow = solid > 0.5 ? "0 6px 22px rgba(0,0,0,.18)" : "none";
  const light = "#FDFAF5";
  const linkCol = "rgba(253,250,245,.92)";

  return (
    <div className="aranya" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60,
      transform: `translateY(${hidden ? -112 : 0}%)`, transition: "transform .5s cubic-bezier(.4,0,.2,1)", willChange: "transform" }}>
      {/* legibility scrim — only while glassy over the hero */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 168, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(10,8,6,.55) 0%, rgba(10,8,6,.28) 45%, transparent 100%)",
        opacity: 1 - solid, transition: "opacity .35s" }} />
      {/* utility strip */}
      <div style={{ height: 34, background: stripBg, backdropFilter: "blur(8px)", color: light,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px",
        borderBottom: `1px solid ${border}`, transition: "background .35s" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, letterSpacing: ".05em" }}>Direct from the hill country farms of Sri Lanka</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, display: "inline-flex", gap: 16, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={13} stroke={light} /> {market_.ship}</span>
          <span style={{ fontWeight: 700, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 3 }}>{market_.cur} <Icon name="chevron" size={12} stroke={light} /></span>
        </span>
      </div>
      {/* main bar */}
      <div style={{ background: barBg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${border}`, boxShadow: shadow, transition: "background .35s, box-shadow .35s" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 72, display: "flex", alignItems: "center", gap: 34, padding: "0 34px" }}>
          <a href="Home.html" style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <Seal size={40} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 26, color: light, letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap" }}>Forest Sourced Spices</span>
            </span>
          </a>
          <nav style={{ display: "flex", gap: 25, marginLeft: 6 }}>
            {NAV_LINKS.map((l) => {
              const cur = _curFile();
              const active = l.match.indexOf(cur) !== -1;
              return <NavItem key={l.label} href={l.href} active={active} light={light} hot="#fff" linkCol={linkCol}>{l.label}</NavItem>;
            })}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15 }}>
            <form onSubmit={(e) => { e.preventDefault(); const q = e.currentTarget.q.value.trim(); window.location.href = "Search.html" + (q ? "?q=" + encodeURIComponent(q) : ""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(253,250,245,.14)", border: "1px solid rgba(253,250,245,.3)", borderRadius: 999, padding: "9px 14px", width: 210 }}>
              <button type="submit" aria-label="Search" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name="search" size={17} stroke="rgba(253,250,245,.85)" />
              </button>
              <input name="q" placeholder="Search spices…" style={{ background: "transparent", border: 0, outline: 0, color: light, fontFamily: "var(--font-ui)", fontSize: 13, width: "100%" }} />
            </form>
            <a href="Account.html" aria-label="Account" onClick={(e) => { if (_curFile() === "Account.html") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }} style={{ display: "grid", placeItems: "center", padding: 3 }}><Icon name="user" size={19} stroke={light} /></a>
            <button aria-label="Cart" onClick={onCartClick} style={{ position: "relative", background: "none", border: 0, cursor: "pointer", padding: 3 }}>
              <Icon name="bag" size={20} stroke={light} />
              {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -5, minWidth: 16, height: 16, padding: "0 4px", background: "var(--accent)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ children, href = "#", active, light, hot, linkCol }) {
  const [h, setH] = useState(false);
  return (
    <a href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, letterSpacing: ".02em",
        color: active || h ? hot : linkCol, position: "relative", padding: "6px 0",
        display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", transition: "color .15s" }}>
      {children}{children === "Shop" && <Icon name="chevron" size={13} stroke={active || h ? hot : linkCol} />}
      <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 1.5, background: "var(--accent)",
        transform: `scaleX(${active || h ? 1 : 0})`, transformOrigin: "left", transition: "transform .22s ease" }} />
    </a>
  );
}

Object.assign(window, { AranyaNavbar });
