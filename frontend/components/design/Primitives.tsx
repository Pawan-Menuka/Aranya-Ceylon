"use client";

import { useId } from "react";

// Design primitives ported faithfully from the prototype (shared.jsx,
// home-common.jsx). Marked "use client" so they can be rendered from both
// server and client components without RSC import friction.

// ---- Heritage seal / emblem ----
export function Seal({ size = 52, tone = "brand" }: { size?: number; tone?: "brand" | "light" }) {
  const ink = tone === "light" ? "#FDFAF5" : "var(--brand)";
  const gold = "#C9A24B";
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Aranya Ceylon">
      <defs>
        <path id={"ring" + id} d="M50,50 m-39,0 a39,39 0 1,1 78,0 a39,39 0 1,1 -78,0" />
      </defs>
      <circle cx="50" cy="50" r="47.5" fill="none" stroke={gold} strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="none" stroke={ink} strokeWidth="2" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={gold} strokeWidth=".75" opacity=".8" />
      <text fill={ink} style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: "7.4px", fontWeight: 600, letterSpacing: "2.1px" }}>
        <textPath href={"#ring" + id} startOffset="2%">ARANYA CEYLON · FOREST SOURCED ·</textPath>
      </text>
      <g stroke={ink} strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50,68 C50,56 50,44 50,34" />
        <path d="M50,46 C44,42 40,36 40,29 C47,30 51,35 50,46" fill={ink} stroke="none" opacity=".92" />
        <path d="M50,40 C56,36 60,30 60,23 C53,24 49,30 50,40" fill={gold} stroke="none" opacity=".85" />
      </g>
      <circle cx="50" cy="72.5" r="1.7" fill={gold} />
    </svg>
  );
}

// ---- Stroke icon set ----
const ICON_PATHS: Record<string, React.ReactNode> = {
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
  bag: (<><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></>),
};

export function Icon({ name, size = 19, stroke = "currentColor", w = 1.7 }: { name: keyof typeof ICON_PATHS | string; size?: number; stroke?: string; w?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name as string]}
    </svg>
  );
}

// ---- Eyebrow label with flanking gold rule ----
export function Eyebrow({ children, color = "var(--accent)", center = false, light = false }: { children: React.ReactNode; color?: string; center?: boolean; light?: boolean }) {
  const line = light ? "rgba(230,184,96,.6)" : color;
  return (
    <div className="eyebrow" style={{ color: light ? "#E6B860" : color, display: "inline-flex", alignItems: "center", gap: 10, justifyContent: center ? "center" : "flex-start" }}>
      <span style={{ width: 24, height: 1, background: line }} />
      {children}
      {center && <span style={{ width: 24, height: 1, background: line }} />}
    </div>
  );
}

// ---- Liyawel — geometric creeper-scroll divider (brand signature) ----
export function Liyawel({ width = 260, color = "var(--gold-line)", accent = "var(--accent)", style = {} }: { width?: number; color?: string; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", ...style }}>
      <svg width={width} height={width * (34 / 260)} viewBox="0 0 260 34" fill="none" role="presentation" stroke={color} strokeWidth="1.1" strokeLinecap="round">
        <g stroke={accent} strokeWidth="1.3">
          <path d="M130 7 C126 13 126 19 130 24 C134 19 134 13 130 7 Z" />
          <path d="M130 11 C128 15 128 20 130 24 C132 20 132 15 130 11 Z" fill={accent} fillOpacity=".14" />
        </g>
        <circle cx="130" cy="28" r="1.3" fill={accent} stroke="none" />
        <path d="M134 22 C150 22 150 10 166 12 C180 14 178 24 190 22" />
        <path d="M190 22 C202 20 200 12 212 14 C222 16 222 22 232 20" />
        <path d="M166 12 C170 7 176 7 178 11" />
        <path d="M212 14 C216 9 222 10 223 14" />
        <circle cx="232" cy="20" r="1.5" fill={color} stroke="none" />
        <path d="M126 22 C110 22 110 10 94 12 C80 14 82 24 70 22" />
        <path d="M70 22 C58 20 60 12 48 14 C38 16 38 22 28 20" />
        <path d="M94 12 C90 7 84 7 82 11" />
        <path d="M48 14 C44 9 38 10 37 14" />
        <circle cx="28" cy="20" r="1.5" fill={color} stroke="none" />
        <path d="M232 20 C238 19 240 23 238 26" />
        <path d="M28 20 C22 19 20 23 22 26" />
      </svg>
    </div>
  );
}

// ---- Badge ----
const BADGE_MAP: Record<string, { bg: string; fg: string; line: string }> = {
  Bestseller: { bg: "#BA7517", fg: "#fff", line: "#BA7517" },
  "GI Certified": { bg: "#0F6E56", fg: "#fff", line: "#0F6E56" },
  "In Stock": { bg: "#1D9E75", fg: "#fff", line: "#1D9E75" },
  New: { bg: "#1A1A1A", fg: "#fff", line: "#1A1A1A" },
};

export function Badge({ kind = "In Stock", solid = false }: { kind?: string; solid?: boolean }) {
  const c = BADGE_MAP[kind] ?? BADGE_MAP["In Stock"]!;
  const base: React.CSSProperties = {
    fontFamily: "var(--font-ui), sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em",
    textTransform: "uppercase", padding: "5px 9px", borderRadius: 999, display: "inline-flex",
    alignItems: "center", gap: 5, lineHeight: 1, whiteSpace: "nowrap",
  };
  const dot = kind === "In Stock";
  if (solid) {
    return <span style={{ ...base, background: c.bg, color: c.fg }}>{dot && <span style={{ width: 5, height: 5, borderRadius: 9, background: c.fg }} />}{kind}</span>;
  }
  return (
    <span style={{ ...base, background: "rgba(253,250,245,.92)", color: c.line, border: `1px solid ${c.line}`, backdropFilter: "blur(2px)" }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: 9, background: c.line }} />}{kind}
    </span>
  );
}
