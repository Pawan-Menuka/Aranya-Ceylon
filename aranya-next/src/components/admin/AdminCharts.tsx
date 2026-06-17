"use client";

import * as React from "react";

// Aranya Ceylon — ADMIN chart primitives (ported from admin-shell.jsx).
// SVG charts: revenue area+line, sparkline, donut, share bar, + the light area
// chart used on the editorial dark hero.

/* Revenue area+line chart. data: [{label, value}]. */
export function AreaChart({
  data, height = 220, stroke = "#0F6E56", fill = "#0F6E56", accent = "#BA7517",
  showGrid = true, valuePrefix = "$", compact = false,
}: {
  data: { label: string; value: number }[];
  height?: number; stroke?: string; fill?: string; accent?: string;
  showGrid?: boolean; valuePrefix?: string; compact?: boolean;
}) {
  const W = 760, H = height, padL = compact ? 8 : 46, padR = 10, padT = 14, padB = 26;
  const xs = data.map((d) => d.value);
  const max = Math.max(...xs) * 1.12, min = 0;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i: number) => padL + (i / (data.length - 1)) * iw;
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${(padT + ih).toFixed(1)} L${padL},${(padT + ih).toFixed(1)} Z`;
  const rid = React.useId().replace(/:/g, "");
  const gid = "ag" + rid;
  const ticks = compact ? [] : [0, 0.5, 1].map((t) => Math.round(max * t));
  const lastI = data.length - 1;
  const fmtTick = (v: number) => (v >= 1000 ? valuePrefix + (v / 1000).toFixed(0) + "k" : valuePrefix + v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.20" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {showGrid && ticks.map((t, i) => {
        const yy = y(t);
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#EBE4D7" strokeWidth="1" />
            <text x={padL - 8} y={yy + 3.5} textAnchor="end" fontFamily="var(--font-ui)" fontSize="10" fontWeight="600" fill="#988C7C">{fmtTick(t)}</text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(lastI)} cy={y(data[lastI].value)} r="4.5" fill="#fff" stroke={accent} strokeWidth="2.4" />
      {!compact && data.map((d, i) => (i % Math.ceil(data.length / 7) === 0 || i === lastI) && (
        <text key={i} x={x(i)} y={H - 7} textAnchor={i === lastI ? "end" : i === 0 ? "start" : "middle"}
          fontFamily="var(--font-ui)" fontSize="10" fontWeight="600" fill="#988C7C">{d.label}</text>
      ))}
    </svg>
  );
}

/* Sparkline */
export function Spark({ data, width = 92, height = 30, stroke = "#0F6E56", fillTone = true }: {
  data: number[]; width?: number; height?: number; stroke?: string; fillTone?: boolean;
}) {
  const max = Math.max(...data), min = Math.min(...data);
  const x = (i: number) => (i / (data.length - 1)) * width;
  const y = (v: number) => height - 2 - ((v - min) / Math.max(1, max - min)) * (height - 4);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d).toFixed(1)}`).join(" ");
  const gid = "sp" + React.useId().replace(/:/g, "");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity=".22" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
      {fillTone && <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Donut for market split. segs:[{value,color,label}] */
export function Donut({ segs, size = 132, thickness = 18, centerTop, centerSub }: {
  segs: { value: number; color: string; label?: string }[];
  size?: number; thickness?: number; centerTop?: React.ReactNode; centerSub?: React.ReactNode;
}) {
  const r = (size - thickness) / 2, c = size / 2, circ = 2 * Math.PI * r;
  const total = segs.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#EFE9DD" strokeWidth={thickness} />
        {segs.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} strokeLinecap="butt" />
          );
          acc += len;
          return el;
        })}
      </svg>
      {centerTop != null && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div className="disp" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: "var(--ad-ink)" }}>{centerTop}</div>
            {centerSub && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ad-faint)", marginTop: 4 }}>{centerSub}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* Horizontal share bar */
export function ShareBar({ value, color, track = "#EFE9DD", h = 7 }: { value: number; color: string; track?: string; h?: number }) {
  return (
    <div style={{ height: h, borderRadius: 999, background: track, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: value + "%", background: color, borderRadius: 999 }} />
    </div>
  );
}

/* light area chart for the dark hero */
export function AreaChartLight({ data }: { data: { label: string; value: number }[] }) {
  const W = 700, H = 132, padT = 8, padB = 6;
  const max = Math.max(...data.map((d) => d.value)) * 1.12;
  const iw = W, ih = H - padT - padB;
  const x = (i: number) => (i / (data.length - 1)) * iw;
  const y = (v: number) => padT + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${padT + ih} L0,${padT + ih} Z`;
  const gid = "agl" + React.useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#E6B860" stopOpacity=".34" /><stop offset="100%" stopColor="#E6B860" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="#E6B860" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r="4.5" fill="#0B5343" stroke="#E6B860" strokeWidth="2.6" />
    </svg>
  );
}
