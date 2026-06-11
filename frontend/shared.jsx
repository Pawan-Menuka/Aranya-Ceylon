/* Aranya Ceylon — shared React primitives (exported to window) */

/* ---- Heritage seal / emblem placeholder ---- */
function Seal({ size = 52, tone = "brand" }) {
  const ink = tone === "light" ? "#FDFAF5" : "var(--brand)";
  const gold = "#C9A24B";
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Aranya Ceylon">
      <defs>
        <path id={"ring" + id} d="M50,50 m-39,0 a39,39 0 1,1 78,0 a39,39 0 1,1 -78,0" />
      </defs>
      <circle cx="50" cy="50" r="47.5" fill="none" stroke={gold} strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="none" stroke={ink} strokeWidth="2" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={gold} strokeWidth=".75" opacity=".8" />
      {/* circular text */}
      <text fill={ink} style={{ fontFamily: "var(--font-ui)", fontSize: "7.4px", fontWeight: 600, letterSpacing: "2.1px" }}>
        <textPath href={"#ring" + id} startOffset="2%">ARANYA CEYLON · FOREST SOURCED ·</textPath>
      </text>
      {/* central mark: stylised cinnamon quill + leaf */}
      <g stroke={ink} strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50,68 C50,56 50,44 50,34" />
        <path d="M50,46 C44,42 40,36 40,29 C47,30 51,35 50,46" fill={ink} stroke="none" opacity=".92" />
        <path d="M50,40 C56,36 60,30 60,23 C53,24 49,30 50,40" fill={gold} stroke="none" opacity=".85" />
      </g>
      <circle cx="50" cy="72.5" r="1.7" fill={gold} />
    </svg>
  );
}

/* ---- Star rating ---- */
function Stars({ rating = 4.8, reviews, size = 13, showNum = true }) {
  const full = Math.floor(rating);
  const frac = rating - full;
  const star = (fill) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <defs>
        <linearGradient id={"g" + fill} x1="0" x2="1" y1="0" y2="0">
          <stop offset={fill} stopColor="#BA7517" />
          <stop offset={fill} stopColor="#D9CDBA" />
        </linearGradient>
      </defs>
      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 18l-6 3.4 1.4-6.8L2.3 9.9l6.9-.8z"
        fill={fill === "100%" ? "#BA7517" : fill === "0%" ? "#D9CDBA" : `url(#g${fill})`} />
    </svg>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const f = i < full ? "100%" : i === full && frac > 0 ? Math.round(frac * 100) + "%" : "0%";
          return <span key={i}>{star(f)}</span>;
        })}
      </div>
      {showNum && (
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
          {rating.toFixed(1)}{reviews != null && <span style={{ fontWeight: 500 }}> ({reviews})</span>}
        </span>
      )}
    </div>
  );
}

/* ---- Badge ---- */
function Badge({ kind = "In Stock", solid = false }) {
  const map = {
    "Bestseller":   { bg: "#BA7517", fg: "#fff", line: "#BA7517", dot: "#fff" },
    "GI Certified": { bg: "#0F6E56", fg: "#fff", line: "#0F6E56", dot: "#fff" },
    "In Stock":     { bg: "#1D9E75", fg: "#fff", line: "#1D9E75", dot: "#fff" },
    "New":          { bg: "#1A1A1A", fg: "#fff", line: "#1A1A1A", dot: "#fff" },
  };
  const c = map[kind] || map["In Stock"];
  const base = {
    fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em",
    textTransform: "uppercase", padding: "5px 9px", borderRadius: 999, display: "inline-flex",
    alignItems: "center", gap: 5, lineHeight: 1, whiteSpace: "nowrap",
  };
  if (solid) return <span style={{ ...base, background: c.bg, color: c.fg }}>
    {kind === "In Stock" && <span style={{ width: 5, height: 5, borderRadius: 9, background: c.dot }} />}{kind}</span>;
  return <span style={{ ...base, background: "rgba(253,250,245,.92)", color: c.line, border: `1px solid ${c.line}`, backdropFilter: "blur(2px)" }}>
    {kind === "In Stock" && <span style={{ width: 5, height: 5, borderRadius: 9, background: c.line }} />}{kind}</span>;
}

/* ---- Styled spice-photo placeholder (top-down pile on linen) ---- */
function SpicePhoto({ spice, ratio = "1 / 1", round = 0, label = true }) {
  return (
    <div className="grain" style={{
      position: "relative", width: "100%", aspectRatio: ratio, borderRadius: round, overflow: "hidden",
      background:
        `radial-gradient(120% 100% at 50% 120%, ${spice.deep}33 0%, transparent 55%),` +
        `radial-gradient(80% 70% at 50% 42%, ${spice.base} 0%, ${spice.base} 30%, ${spice.deep} 78%, ${spice.deep} 100%),` +
        `linear-gradient(180deg, ${spice.surface} 0%, ${spice.surface} 100%)`,
    }}>
      {/* linen ground showing at edges */}
      <div style={{ position: "absolute", inset: 0,
        background: `radial-gradient(68% 56% at 50% 44%, transparent 0%, transparent 52%, ${spice.surface} 73%)` }} />
      {/* pile highlight */}
      <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)",
        width: "46%", height: "40%", borderRadius: "50%",
        background: `radial-gradient(closest-side, rgba(255,255,255,.28), transparent 70%)`, filter: "blur(4px)" }} />
      {/* soft scatter dots to suggest whole spice */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {Array.from({ length: 26 }).map((_, i) => {
          const a = (i * 137.5) * Math.PI / 180, r = 8 + (i % 5) * 5.5;
          const x = 50 + Math.cos(a) * r * (0.7 + (i % 3) * .12);
          const y = 44 + Math.sin(a) * r * (0.55 + (i % 4) * .1);
          return <circle key={i} cx={x} cy={y} r={0.9 + (i % 3) * .5} fill={i % 2 ? spice.deep : "#000"} opacity={i % 2 ? .35 : .14} />;
        })}
      </svg>
      {/* vignette */}
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 60px rgba(40,28,12,.18)" }} />
      {label && (
        <span style={{ position: "absolute", left: 10, bottom: 9, fontFamily: "var(--font-ui)", fontSize: 9,
          letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.62)", fontWeight: 600 }}>
          Photography placeholder
        </span>
      )}
    </div>
  );
}

/* small icon set (stroke) */
function Icon({ name, size = 19, stroke = "currentColor", w = 1.7 }) {
  const p = {
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
    bag: <><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    chevron: <path d="M6 9l6 6 6-6" />,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></>,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{p}</svg>
  );
}

Object.assign(window, { Seal, Stars, Badge, SpicePhoto, Icon });
