"use client";

import * as React from "react";
import Link from "next/link";
import type { Spice, Market } from "@/lib/types";
import { SpicePhoto } from "../primitives/SpicePhoto";
import { Stars } from "../primitives/Stars";
import { Badge } from "../primitives/Badge";
import { Icon } from "../primitives/Icon";
import { useCart } from "../CartContext";

// Product cards (ported from cards.jsx). The two locked variants:
//   • CardCFinal — default catalog card (surface + 5px spice stripe, ghost CTA)
//   • CardB      — featured card (photo-forward, name overlaid), used selectively
// Each takes { spice, market }.

function useHover(): [boolean, { onMouseEnter: () => void; onMouseLeave: () => void }] {
  const [h, setH] = React.useState(false);
  return [h, { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false) }];
}
function price(spice: Spice, market: Market) {
  return market === "local" ? spice.lkr : spice.usd;
}
function ctaClass(market: Market) {
  return market === "local" ? "btn btn-local" : "btn btn-intl";
}
function pdHref(spice: Spice) {
  return `/products/${spice.slug ?? encodeURIComponent(spice.name.toLowerCase().replace(/\s+/g, "-"))}`;
}

// price-by-weight (mirrors the cart weight multipliers) so the card price
// tracks the selector.
const WMULT: Record<string, number> = { "50g": 0.6, "100g": 1, "250g": 2.3 };
function wNum(p: string) {
  return parseFloat(String(p).replace(/[^0-9.]/g, ""));
}
function wPrice(spice: Spice, market: Market, wt: string) {
  const n = wNum(market === "local" ? spice.lkr : spice.usd) * (WMULT[wt] || 1);
  return market === "local" ? "Rs " + Math.round(n).toLocaleString("en-US") : "$" + n.toFixed(2);
}

// Cart wiring (lib/api/cart connects this to POST /cart/items in production).
// The shared CartContext owns the optimistic line + drawer.

function Wish() {
  const [on, setOn] = React.useState(false);
  return (
    <button
      aria-label="Save"
      onClick={() => setOn(!on)}
      style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid var(--line)", background: "rgba(253,250,245,.94)", backdropFilter: "blur(3px)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={on ? "#BA7517" : "none"} stroke={on ? "#BA7517" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

function WeightSeg({ market, value, onChange }: { market: Market; value?: string; onChange?: (w: string) => void }) {
  const ws = ["50g", "100g", "250g"];
  const [iLocal, setILocal] = React.useState(1);
  const i = value != null ? Math.max(0, ws.indexOf(value)) : iLocal;
  const set = (k: number) => {
    if (onChange) onChange(ws[k]);
    else setILocal(k);
  };
  return (
    <div className={"seg " + (market === "local" ? "local" : "intl")}>
      {ws.map((w, k) => (
        <button key={w} className={k === i ? "on" : ""} onClick={() => set(k)}>{w}</button>
      ))}
    </div>
  );
}

// ============ CARD B — full-bleed immersive, slide-up actions ============
export function CardB({ spice, market = "intl" }: { spice: Spice; market?: Market }) {
  const cart = useCart();
  const [h, hp] = useHover();
  const [wt, setWt] = React.useState("100g");
  const [added, setAdded] = React.useState(false);
  const onAdd = () => {
    cart.add(spice, wt, "Whole", 1);
    cart.openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  };
  return (
    <div className="aranya" {...hp} style={{ width: "100%", background: "var(--surface)", borderRadius: 6, overflow: "hidden", boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)", transition: "box-shadow .22s, transform .22s", transform: h ? "translateY(-4px)" : "none" }}>
      <div style={{ position: "relative" }}>
        <SpicePhoto spice={spice} ratio="4 / 5" label={false} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.18) 0%, transparent 26%, transparent 58%, rgba(0,0,0,.45) 100%)" }} />
        <div style={{ position: "absolute", top: 12, left: 12 }}><Badge kind={spice.badge} solid /></div>
        <div style={{ position: "absolute", top: 12, right: 12 }}><Wish /></div>
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "#fff" }}>
          <div className="eyebrow" style={{ color: "rgba(255,255,255,.82)", marginBottom: 4 }}>{spice.origin}</div>
          <h3 className="disp" style={{ fontSize: 26, margin: 0, lineHeight: 1.05, color: "#fff", textShadow: "0 1px 12px rgba(0,0,0,.35)" }}>{spice.name}</h3>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: spice.color }} />
        <Link href={pdHref(spice)} style={{ position: "absolute", left: "50%", top: "44%", transform: `translate(-50%,-50%) scale(${h ? 1 : 0.9})`, opacity: h ? 1 : 0, transition: "all .22s", background: "rgba(253,250,245,.95)", color: "var(--ink)", border: 0, borderRadius: 999, padding: "11px 20px", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>
          <Icon name="eye" size={15} /> Quick view
        </Link>
      </div>
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
          <Stars rating={spice.rating} reviews={spice.reviews} />
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--muted)" }}>{spice.latin}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="disp" style={{ fontSize: 27, color: "var(--accent)", lineHeight: 1, fontWeight: 600 }}>{wPrice(spice, market, wt)}</div>
          <WeightSeg market={market} value={wt} onChange={setWt} />
        </div>
        <button className={ctaClass(market)} onClick={onAdd}>{added ? "Added to basket ✓" : "Add to Cart"}</button>
      </div>
    </div>
  );
}

// ============ CARD C-FINAL — brand-compliant: surface + 5px spice stripe ============
export function CardCFinal({ spice, market = "intl" }: { spice: Spice; market?: Market }) {
  const cart = useCart();
  const [h, hp] = useHover();
  const [wt, setWt] = React.useState("100g");
  const [added, setAdded] = React.useState(false);
  const onAdd = () => {
    cart.add(spice, wt, "Whole", 1);
    cart.openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  };
  return (
    <div className="aranya" {...hp} style={{ width: "100%", background: "var(--surface)", borderRadius: 6, overflow: "hidden", borderTop: `5px solid ${spice.color}`, display: "flex", flexDirection: "column", boxShadow: h ? "var(--shadow-md)" : "var(--shadow-sm)", transition: "box-shadow .2s, transform .2s", transform: h ? "translateY(-3px)" : "none" }}>
      <div style={{ position: "relative", padding: "20px 20px 6px" }}>
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}><Wish /></div>
        <Link href={pdHref(spice)} style={{ display: "block", borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)" }}>
          <SpicePhoto spice={spice} ratio="1 / 1" label={false} />
        </Link>
        <div style={{ textAlign: "center", height: 22, marginTop: 10 }}>
          <Link href={pdHref(spice)} style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--brand)", opacity: h ? 1 : 0, transition: "opacity .2s", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="eye" size={14} stroke="var(--brand)" /> Quick view
          </Link>
        </div>
      </div>
      <div style={{ padding: "4px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span className="eyebrow" style={{ color: spice.deep, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 14, height: 2, background: spice.color }} />{spice.badge}
          </span>
          <Stars rating={spice.rating} showNum reviews={null} size={12} />
        </div>
        <h3 className="disp" style={{ fontSize: 24, color: "var(--ink)", margin: "0 0 3px", lineHeight: 1.08, letterSpacing: ".01em" }}>{spice.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--muted)", margin: "0 0 16px" }}>{spice.latin}</p>
        <div style={{ height: 1, background: "var(--line)", marginBottom: 15, marginTop: "auto" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15 }}>
          <div className="disp" style={{ fontSize: 29, color: "var(--ink)", lineHeight: 1, fontWeight: 600 }}>{wPrice(spice, market, wt)}</div>
          <WeightSeg market={market} value={wt} onChange={setWt} />
        </div>
        <button
          className={market === "local" ? "btn btn-local" : "btn btn-intl"}
          onClick={onAdd}
          style={{ background: added ? (market === "local" ? "var(--brand)" : "var(--accent)") : "transparent", color: added ? "#fff" : market === "local" ? "var(--brand)" : "var(--accent)", border: `1.5px solid ${market === "local" ? "var(--brand)" : "var(--accent)"}`, transition: "background .15s, color .15s" }}
          onMouseEnter={(e) => {
            if (added) return;
            e.currentTarget.style.background = market === "local" ? "var(--brand)" : "var(--accent)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            if (added) return;
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = market === "local" ? "var(--brand)" : "var(--accent)";
          }}
        >
          {added ? "Added to basket ✓" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
