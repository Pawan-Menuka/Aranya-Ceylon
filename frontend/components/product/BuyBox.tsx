"use client";

import { useState } from "react";
import type { Market } from "@/lib/market";
import type { ProductDetailView } from "@/lib/api/types";
import { useCart } from "../CartProvider";
import { Stars } from "../Stars";

// Purchase panel ported from product-detail.jsx BuyBox: origin + name + latin,
// stars, tagline, weight price-cards, quantity stepper, add-to-cart (wired to
// the cart), save toggle, and trust microcopy. Variants are the live ones.
export function BuyBox({ product, market }: { product: ProductDetailView; market: Market }) {
  const { addItem } = useCart();
  const isLocal = market === "LOCAL";
  const accent = isLocal ? "var(--brand)" : "var(--accent)";

  const variants = product.variants;
  const defaultIdx = Math.max(0, variants.findIndex((v) => v.weight === 100));
  const [idx, setIdx] = useState(defaultIdx === -1 ? 0 : defaultIdx);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");

  const selected = variants[idx];
  const outOfStock = !!selected && selected.stock <= 0;

  const onAdd = async () => {
    if (!selected) return;
    setStatus("adding");
    const res = await addItem({ productId: product.id, variantId: selected.id, quantity: qty });
    if (res.ok) {
      setStatus("added");
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setStatus("idle");
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: 9, background: product.color }} />
        <span className="eyebrow" style={{ color: "var(--muted)" }}>{product.origin}</span>
      </div>
      <h1 className="disp" style={{ fontSize: "clamp(34px,4.5vw,46px)", color: "var(--ink)", margin: 0, lineHeight: 1.02, letterSpacing: ".005em" }}>
        {product.name}
      </h1>
      {product.latin && (
        <p className="disp" style={{ fontStyle: "italic", fontSize: 19, color: "var(--muted)", margin: "4px 0 16px" }}>{product.latin}</p>
      )}

      {product.reviewCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <Stars rating={product.rating} size={16} />
          <a href="#reviews" style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>
            {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}
          </a>
        </div>
      )}

      {product.certifications.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {product.certifications.map((c) => (
            <span key={c} className="eyebrow" style={{ color: "var(--brand)", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 12px" }}>{c}</span>
          ))}
        </div>
      )}

      <div style={{ height: 1, background: "var(--line)", margin: "0 0 22px" }} />

      {selected && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 22 }}>
          <span className="disp" style={{ fontSize: 42, color: "var(--ink)", lineHeight: 0.9, fontWeight: 600 }}>{selected.price}</span>
          <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, color: outOfStock ? "#B23B3B" : "var(--muted)", fontWeight: 600, paddingBottom: 5 }}>
            / {selected.weight}g · {outOfStock ? "out of stock" : isLocal ? "incl. tax" : "duty-free export"}
          </span>
        </div>
      )}

      {/* weight cards */}
      {variants.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="eyebrow" style={{ color: "var(--ink)", marginBottom: 10 }}>Weight</div>
          <div style={{ display: "flex", gap: 10 }}>
            {variants.map((v, i) => {
              const on = i === idx;
              return (
                <button
                  key={v.id}
                  onClick={() => setIdx(i)}
                  style={{
                    flex: 1,
                    padding: "12px 8px",
                    borderRadius: 7,
                    cursor: "pointer",
                    textAlign: "center",
                    border: on ? `1.5px solid ${accent}` : "1px solid var(--line)",
                    background: on ? (isLocal ? "rgba(15,110,86,.06)" : "rgba(186,117,23,.07)") : "#fff",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 700, color: on ? accent : "var(--ink)" }}>{v.label}</div>
                  <div style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{v.price}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* qty + CTA */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, background: "#fff" }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease" style={{ width: 42, height: 46, border: 0, background: "none", cursor: qty <= 1 ? "default" : "pointer", fontSize: 19, color: qty <= 1 ? "var(--line)" : "var(--ink)" }}>−</button>
          <span style={{ width: 34, textAlign: "center", fontFamily: "var(--font-ui), sans-serif", fontSize: 15, fontWeight: 700 }}>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Increase" style={{ width: 42, height: 46, border: 0, background: "none", cursor: "pointer", fontSize: 19, color: "var(--ink)" }}>+</button>
        </div>
        <button
          onClick={onAdd}
          disabled={outOfStock || status === "adding" || !selected}
          className={`btn ${isLocal ? "btn-local" : "btn-intl"}`}
          style={{ flex: 1, opacity: outOfStock ? 0.5 : 1 }}
        >
          {outOfStock ? "Out of stock" : status === "adding" ? "Adding…" : status === "added" ? "Added to basket ✓" : selected ? `Add to Cart — ${selected.price}` : "Unavailable"}
        </button>
        <button
          onClick={() => setSaved((s) => !s)}
          aria-label="Save"
          style={{ width: 46, height: 46, flex: "0 0 auto", borderRadius: 6, border: `1.5px solid ${saved ? accent : "var(--line)"}`, background: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? accent : "none"} stroke={saved ? accent : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* trust microcopy */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        {[
          ["Ships in 24 hours", isLocal ? "Island-wide courier, 1–3 days" : "Tracked & insured worldwide"],
          [isLocal ? "Free over Rs 5,000" : "Free shipping over $60", "Sealed at peak aroma"],
          ["GI Protected origin", "Verified single-estate harvest"],
        ].map(([title, sub]) => (
          <div key={title} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{title}</span>
            <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, color: "var(--muted)" }}>· {sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
