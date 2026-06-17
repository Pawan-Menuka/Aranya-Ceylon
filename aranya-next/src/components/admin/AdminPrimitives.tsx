"use client";

import * as React from "react";
import { Spark, ShareBar } from "./AdminCharts";

// Aranya Ceylon — ADMIN icons + shared atoms (ported from admin-shell.jsx).

/* ============================ ICONS ============================ */
export function AIcon({ name, size = 18, stroke = "currentColor", w = 1.7, fill = "none" }: {
  name: string; size?: number; stroke?: string; w?: number; fill?: string;
}) {
  const map: Record<string, React.ReactNode> = {
    dashboard: (<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
    orders: (<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>),
    products: (<><path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.6a2 2 0 0 1 1.4.6l7.8 7.8a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" fill={stroke} stroke="none" /></>),
    blog: (<><path d="M4 4h11l5 5v11a0 0 0 0 1 0 0H4z" /><path d="M15 4v5h5" /><path d="M8 13h8M8 17h5" /></>),
    audit: (<><path d="M5 3h11l3 3v15H5z" /><path d="M9 8h6M9 12h6M9 16h4" /></>),
    bell: (<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
    cog: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>),
    logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>),
    search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
    chevron: <path d="M6 9l6 6 6-6" />,
    chevronR: <path d="M9 6l6 6-6 6" />,
    chevronL: <path d="M15 6l-6 6 6 6" />,
    up: <path d="M7 14l5-5 5 5" />,
    down: <path d="M7 10l5 5 5-5" />,
    arrowUp: (<><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>),
    arrowDown: (<><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>),
    plus: (<><path d="M12 5v14M5 12h14" /></>),
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />,
    dots: (<><circle cx="5" cy="12" r="1.4" fill={stroke} stroke="none" /><circle cx="12" cy="12" r="1.4" fill={stroke} stroke="none" /><circle cx="19" cy="12" r="1.4" fill={stroke} stroke="none" /></>),
    truck: (<><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>),
    refund: (<><path d="M3 8a9 9 0 1 1-1 5" /><path d="M3 4v4h4" /></>),
    alert: (<><path d="M12 3l9.5 17H2.5L12 3z" /><path d="M12 10v4M12 17.5v.2" /></>),
    handshake: (<><path d="M11 17l-2 2a1.4 1.4 0 0 1-2-2l4-4 2 2 3-3 4 4" /><path d="M3 12l4-4 4 1 3-2 6 5" /></>),
    user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
    users: (<><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.6 2.9-5.6 6.5-5.6S15.5 16.4 15.5 20" /><path d="M16 5a3.4 3.4 0 0 1 0 6.6M18 14.6c2.6.5 4 2.4 4 5.4" /></>),
    calendar: (<><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>),
    eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
    image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="M21 16l-5-5L5 20" /></>),
    trash: <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13" />,
    check: <path d="M5 12l5 5L20 6" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    external: (<><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>),
    download: (<><path d="M12 3v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>),
    money: (<><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9v6M18 9v6" /></>),
    box: (<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /></>),
    tag: (<><path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.6a2 2 0 0 1 1.4.6l7.8 7.8a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" /></>),
    star: <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 18l-6 3.4 1.4-6.8L2.3 9.9l6.9-.8z" />,
    pin: (<><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></>),
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    edit: (<><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>),
    copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>),
  };
  const p = map[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={w}
      strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p}</svg>
  );
}

/* ============================ ATOMS ============================ */
export function Delta({ value, suffix = "%", invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={"delta " + (Math.abs(value) < 0.05 ? "flat" : good ? "up" : "down")}>
      <AIcon name={up ? "arrowUp" : "arrowDown"} size={13} w={2.4} />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

export function Pill({ status }: { status: string }) {
  return <span className={"pill " + status}><span className="pd" />{status}</span>;
}

export function MarketTag({ market }: { market: string }) {
  return <span className={"mkt " + market}>{market === "intl" ? "USD" : "LKR"}</span>;
}

export function Avatar({ name, color }: { name: string; color?: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["#0F6E56", "#BA7517", "#5E7587", "#7C9A5A", "#B5651D", "#7A4A2A"];
  const bg = color || palette[(name.charCodeAt(0) + name.length) % palette.length];
  return <span className="av" style={{ background: bg }}>{initials}</span>;
}

export function Swatch({ p, size = 30 }: { p: { base: string; deep: string }; size?: number }) {
  return <span className="swatch" style={{ width: size, height: size, background: `radial-gradient(70% 70% at 50% 35%, ${p.base} 0%, ${p.deep} 95%)` }} />;
}

export function SectionCard({ title, action, children, pad = true, style, bodyStyle }: {
  title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
  pad?: boolean; style?: React.CSSProperties; bodyStyle?: React.CSSProperties;
}) {
  return (
    <div className="ad-card" style={style}>
      {(title || action) && (
        <div className="ad-card-h">
          <div className="ad-card-t">{title}</div>
          {action}
        </div>
      )}
      <div style={{ ...(pad ? { padding: 18 } : null), ...bodyStyle }}>{children}</div>
    </div>
  );
}

/* StatCard with optional sparkline */
export function StatCard({ label, icon, value, delta, deltaInvert, spark, sparkColor = "#0F6E56", accentBar, big = false, sub }: {
  label: React.ReactNode; icon?: string; value: React.ReactNode; delta?: number; deltaInvert?: boolean;
  spark?: number[]; sparkColor?: string; accentBar?: string; big?: boolean; sub?: React.ReactNode;
}) {
  return (
    <div className="stat">
      {accentBar && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: accentBar }} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div className="lab">{icon && <AIcon name={icon} size={14} stroke="var(--ad-faint)" w={1.9} />}{label}</div>
        {delta != null && <Delta value={delta} invert={deltaInvert} />}
      </div>
      <div className={"val" + (big ? "" : " sm")}>{value}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: spark ? 6 : 0, gap: 8 }}>
        {sub && <div style={{ fontSize: 12, color: "var(--ad-muted)", fontWeight: 500 }}>{sub}</div>}
        {spark && <div style={{ marginLeft: "auto" }}><Spark data={spark} stroke={sparkColor} /></div>}
      </div>
    </div>
  );
}

/* Inventory stock meter (products table) */
export function StockMeter({ stock, threshold = 25 }: { stock: number; threshold?: number }) {
  const max = Math.max(threshold * 4, stock);
  const pct = Math.min(100, (stock / max) * 100);
  const color = stock === 0 ? "var(--neg)" : stock < threshold ? "var(--warn)" : "var(--pos)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span className="tnum" style={{ fontWeight: 700, width: 34, color, fontSize: 13.5 }}>{stock}</span>
      <div style={{ width: 60 }}><ShareBar value={Math.max(4, pct)} color={color} h={6} /></div>
    </div>
  );
}

/* toggle + label row (editor drawers) */
export function FlagRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--ad-faint)" }}>{sub}</div>
      </div>
      <button className={"ad-toggle" + (value ? " on" : "")} onClick={() => onChange(!value)} />
    </div>
  );
}

export function RoleTag({ role }: { role: string }) {
  const map: Record<string, { c: string; bg: string }> = {
    ADMIN: { c: "#0F6E56", bg: "rgba(15,110,86,.1)" },
    SUPERADMIN: { c: "#BA7517", bg: "rgba(186,117,23,.12)" },
    JOB: { c: "#5E7587", bg: "rgba(94,117,135,.12)" },
  };
  const s = map[role] || map.ADMIN;
  return <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: s.c, background: s.bg, padding: "2px 7px", borderRadius: 5 }}>{role}</span>;
}
