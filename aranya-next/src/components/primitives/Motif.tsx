// Liyawel — geometric creeper-scroll divider (ported from home-common.jsx).
export function Liyawel({
  width = 260,
  color = "var(--gold-line)",
  accent = "var(--accent)",
  style = {},
}: {
  width?: number;
  color?: string;
  accent?: string;
  style?: React.CSSProperties;
}) {
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

// Eyebrow label with flanking gold rule (ported from home-common.jsx).
export function Eyebrow({
  children,
  color = "var(--accent)",
  center = false,
  light = false,
}: {
  children: React.ReactNode;
  color?: string;
  center?: boolean;
  light?: boolean;
}) {
  const line = light ? "rgba(230,184,96,.6)" : color;
  return (
    <div className="eyebrow" style={{ color: light ? "#E6B860" : color, display: "inline-flex", alignItems: "center", gap: 10, justifyContent: center ? "center" : "flex-start" }}>
      <span style={{ width: 24, height: 1, background: line }} />
      {children}
      {center && <span style={{ width: 24, height: 1, background: line }} />}
    </div>
  );
}
