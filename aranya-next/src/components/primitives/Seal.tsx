import * as React from "react";

// ---- Heritage seal / emblem (ported from shared.jsx) ----
export function Seal({ size = 52, tone = "brand" }: { size?: number; tone?: "brand" | "light" }) {
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
      <text fill={ink} style={{ fontFamily: "var(--font-ui)", fontSize: "7.4px", fontWeight: 600, letterSpacing: "2.1px" }}>
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
