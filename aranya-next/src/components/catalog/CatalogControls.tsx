"use client";

import * as React from "react";
import { Liyawel, Eyebrow } from "../primitives/Motif";

// Editorial catalog banner (forest green) — ported from catalog.jsx.
export function CatalogBanner() {
  return (
    <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "136px 40px 52px", position: "relative" }}>
        <Liyawel width={150} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ opacity: 0.9, marginBottom: 22, justifyContent: "flex-start" }} />
        <Eyebrow color="rgba(253,250,245,.62)">The full harvest</Eyebrow>
        <h1 className="disp" style={{ fontSize: 60, lineHeight: 1.02, margin: "16px 0 14px", fontWeight: 600, letterSpacing: ".005em", maxWidth: 760 }}>
          Every spice, single-origin &amp; shipped at peak aroma
        </h1>
        <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: 0, maxWidth: 560 }}>
          Whole quills, hand-ground powders and estate blends — graded for export, sealed within weeks of harvest, never left to fade on a shelf.
        </p>
      </div>
    </header>
  );
}

// Dropdown popover (multi-select facet or single-select sort) — ported.
export function Dropdown({
  label,
  options,
  selected,
  onToggle,
  single = false,
  align = "left",
}: {
  label: string;
  options: string[] | [string, string][];
  selected: string | string[];
  onToggle: (val: string) => void;
  single?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const count = single ? 0 : (selected as string[]).length;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: count ? "rgba(15,110,86,.07)" : "#fff", border: count ? "1px solid var(--brand)" : "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, color: count ? "var(--brand)" : "var(--ink)" }}
      >
        {label}
        {count > 0 && <span style={{ background: "var(--brand)", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "1px 7px", lineHeight: 1.5 }}>{count}</span>}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", opacity: 0.6 }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", [align]: 0, zIndex: 40, minWidth: single ? 210 : 200, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 7 }}>
          {(options as (string | [string, string])[]).map((opt) => {
            const optVal = single ? (opt as [string, string])[0] : (opt as string);
            const optLabel = single ? (opt as [string, string])[1] : (opt as string);
            const on = single ? selected === optVal : (selected as string[]).includes(optVal);
            return (
              <button
                key={optVal}
                onClick={() => {
                  onToggle(optVal);
                  if (single) setOpen(false);
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: 0, cursor: "pointer", padding: "9px 10px", borderRadius: 7, textAlign: "left", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? "var(--brand)" : "var(--ink)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                {!single && (
                  <span style={{ width: 17, height: 17, borderRadius: 5, flex: "0 0 auto", border: on ? "none" : "1.5px solid var(--line)", background: on ? "var(--brand)" : "#fff", display: "grid", placeItems: "center" }}>
                    {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  </span>
                )}
                {single && <span style={{ width: 7, height: 7, borderRadius: 9, flex: "0 0 auto", background: on ? "var(--brand)" : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--line)" }} />}
                {optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Category quick-link chips — ported.
export function CategoryChips({ value, onChange, categories }: { value: string; onChange: (c: string) => void; categories: string[] }) {
  const items = ["All", ...categories];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
      {items.map((c) => {
        const on = value === c;
        return (
          <button key={c} onClick={() => onChange(c)} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "9px 17px", borderRadius: 999, transition: "all .15s", border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)" }}>
            {c}
          </button>
        );
      })}
    </div>
  );
}
