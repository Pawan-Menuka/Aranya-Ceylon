"use client";

import * as React from "react";
import Link from "next/link";
import type { Spice, Market, Product } from "@/lib/types";
import { SpicePhoto } from "../primitives/SpicePhoto";
import { Stars } from "../primitives/Stars";
import { Badge } from "../primitives/Badge";
import { pdContent, pdPrice } from "@/lib/pd-content";
import { useCart } from "../CartContext";

// Product-detail buy side (ported from product-detail.jsx):
// Breadcrumb · Gallery · Qty · BuyBox.

export function Breadcrumb({ spice }: { spice: Spice }) {
  const sep = <span style={{ color: "var(--line)", margin: "0 9px" }}>/</span>;
  const link = (t: string, href: string) => (
    <Link href={href} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".02em" }}>{t}</Link>
  );
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 40px 0", display: "flex", alignItems: "center" }}>
      {link("Shop", "/products")}{sep}{link("Whole Spices", "/products?cat=Whole+Spices")}{sep}
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{spice.name}</span>
    </div>
  );
}

export function Gallery({ spice }: { spice: Spice }) {
  const variants: Spice[] = [
    spice,
    { ...spice, base: spice.deep, deep: spice.color },
    { ...spice, surface: "#EFE7D8", base: spice.color, deep: spice.deep },
    { ...spice, base: spice.surface, deep: spice.base, surface: spice.surface },
  ];
  const labels = ["Whole quills", "Detail", "Milled", "In the jar"];
  const [i, setI] = React.useState(0);
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 78, flex: "0 0 auto" }}>
        {variants.map((v, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={labels[k]} style={{ padding: 0, border: k === i ? "2px solid var(--brand)" : "1px solid var(--line)", borderRadius: 5, overflow: "hidden", cursor: "pointer", background: "none", boxShadow: k === i ? "var(--shadow-sm)" : "none" }}>
            <SpicePhoto spice={v} ratio="1 / 1" label={false} />
          </button>
        ))}
      </div>
      <div style={{ position: "relative", flex: 1, borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
        <SpicePhoto spice={variants[i]} ratio="1 / 1" label={true} />
        <div style={{ position: "absolute", top: 16, left: 16 }}><Badge kind={spice.badge} solid /></div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: spice.color }} />
        <div style={{ position: "absolute", bottom: 14, right: 16, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>{labels[i]}</div>
      </div>
    </div>
  );
}

function Qty({ q, setQ }: { q: number; setQ: (n: number) => void }) {
  const btn = (t: string, fn: () => void, dis: boolean) => (
    <button onClick={fn} disabled={dis} aria-label={t === "−" ? "Decrease" : "Increase"} style={{ width: 42, height: 46, border: 0, background: "none", cursor: dis ? "default" : "pointer", fontFamily: "var(--font-ui)", fontSize: 19, color: dis ? "var(--line)" : "var(--ink)", lineHeight: 1 }}>{t}</button>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, background: "#fff" }}>
      {btn("−", () => setQ(Math.max(1, q - 1)), q <= 1)}
      <span style={{ width: 34, textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700 }}>{q}</span>
      {btn("+", () => setQ(Math.min(99, q + 1)), false)}
    </div>
  );
}

function resolveVariant(product: Product, weightStr: string, market: Market) {
  const grams = parseInt(weightStr, 10);
  const wantCurrency = market === "local" ? "LKR" : "USD";
  const byWeight = product.variants.filter((v) => v.weight === grams);
  const pool = byWeight.length ? byWeight : product.variants;
  // prefer exact currency match, then BOTH, then any
  return (
    pool.find((v) => v.currency === wantCurrency) ??
    pool.find((v) => v.market === "BOTH") ??
    pool[0]
  );
}

export function BuyBox({ spice, market, product }: { spice: Spice; market: Market; product?: Product }) {
  const c = pdContent(spice);
  const cart = useCart();
  const [weight, setWeight] = React.useState("100g");
  const [grind, setGrind] = React.useState("Whole");
  const [q, setQ] = React.useState(1);
  const [saved, setSaved] = React.useState(false);
  const [added, setAdded] = React.useState(false);
  const onAdd = () => {
    const backendIds = product
      ? (() => {
          const v = resolveVariant(product, weight, market);
          return v ? { productId: product.id, variantId: v.id } : undefined;
        })()
      : undefined;
    cart.add(spice, weight, grind, q, backendIds);
    cart.openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };
  const isLocal = market === "local";
  const accent = isLocal ? "var(--brand)" : "var(--accent)";
  const weights = ["50g", "100g", "250g"];

  return (
    <div className="aranya" style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: 9, background: spice.color }} />
        <span className="eyebrow" style={{ color: "var(--muted)" }}>{spice.origin}</span>
      </div>
      <h1 className="disp" style={{ fontSize: 46, color: "var(--ink)", margin: 0, lineHeight: 1.02, letterSpacing: ".005em" }}>{spice.name}</h1>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 19, color: "var(--muted)", margin: "4px 0 16px" }}>{spice.latin}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Stars rating={spice.rating} reviews={spice.reviews} size={16} />
        <a href="#reviews" style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>Read reviews</a>
      </div>

      <p className="prose" style={{ fontSize: 16.5, color: "var(--ink)", margin: "0 0 22px", maxWidth: 460 }}>{c.tagline}</p>
      <div style={{ height: 1, background: "var(--line)", margin: "0 0 22px" }} />

      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 22 }}>
        <span className="disp" style={{ fontSize: 42, color: "var(--ink)", lineHeight: 0.9, fontWeight: 600 }}>{pdPrice(spice, market, weight)}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600, paddingBottom: 5 }}>/ {weight} · {isLocal ? "incl. tax" : "duty-free export"}</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow" style={{ color: "var(--ink)", marginBottom: 10 }}>Weight</div>
        <div style={{ display: "flex", gap: 10 }}>
          {weights.map((w) => {
            const on = w === weight;
            return (
              <button key={w} onClick={() => setWeight(w)} style={{ flex: 1, padding: "12px 8px", borderRadius: 7, cursor: "pointer", textAlign: "center", border: on ? "1.5px solid " + accent : "1px solid var(--line)", background: on ? (isLocal ? "rgba(15,110,86,.06)" : "rgba(186,117,23,.07)") : "#fff", transition: "all .15s" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: on ? accent : "var(--ink)" }}>{w}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{pdPrice(spice, market, w)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ color: "var(--ink)", marginBottom: 10 }}>Cut</div>
        <div className={"seg " + (isLocal ? "local" : "intl")}>
          {["Whole", "Ground"].map((g) => (
            <button key={g} className={g === grind ? "on" : ""} onClick={() => setGrind(g)}>{g === "Whole" ? "Whole quills" : "Freshly ground"}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <Qty q={q} setQ={setQ} />
        <button onClick={onAdd} className={isLocal ? "btn btn-local" : "btn btn-intl"} style={{ flex: 1 }}>
          {added ? "Added to basket ✓" : "Add to Cart — " + pdPrice(spice, market, weight)}
        </button>
        <button onClick={() => setSaved(!saved)} aria-label="Save" style={{ width: 46, height: 46, flex: "0 0 auto", borderRadius: 6, border: "1.5px solid " + (saved ? accent : "var(--line)"), background: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? accent : "none"} stroke={saved ? accent : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        {[
          ["Ships in 24 hours", isLocal ? "Island-wide courier, 1–3 days" : "Tracked & insured worldwide"],
          [isLocal ? "Free over Rs 5,000" : "Free shipping over $60", "Sealed at peak aroma"],
          ["GI Protected origin", "Verified single-estate harvest"],
        ].map((t) => (
          <div key={t[0]} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{t[0]}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>· {t[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
