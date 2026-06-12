"use client";

import { useState } from "react";
import type { Market } from "@/lib/market";
import type { VariantView } from "@/lib/api/types";

// Weight selector + price + add-to-cart. The cart wiring lands in Phase 2;
// for now the button surfaces a clear "coming soon" note instead of acting.
export function VariantPicker({ variants, market }: { variants: VariantView[]; market: Market }) {
  // Default to 100g if present, else the first variant.
  const defaultIdx = Math.max(0, variants.findIndex((v) => v.weight === 100));
  const [idx, setIdx] = useState(defaultIdx === -1 ? 0 : defaultIdx);
  const [note, setNote] = useState(false);

  if (variants.length === 0) {
    return <p style={{ color: "var(--muted)" }}>Not available in this store.</p>;
  }

  const selected = variants[idx]!;
  const intl = market === "INTERNATIONAL";
  const outOfStock = selected.stock <= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <span className="eyebrow" style={{ color: "var(--muted)", display: "block", marginBottom: 8 }}>
          Weight
        </span>
        <div className={`seg ${intl ? "intl" : ""}`}>
          {variants.map((v, i) => (
            <button key={v.id} className={i === idx ? "on" : ""} onClick={() => setIdx(i)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-ui), sans-serif", fontWeight: 700, fontSize: 28, color: "var(--ink)" }}>
          {selected.price}
        </span>
        <span style={{ fontSize: 13, color: outOfStock ? "#B23B3B" : "var(--muted)" }}>
          {outOfStock ? "Out of stock" : selected.stock <= 10 ? `Only ${selected.stock} left` : "In stock"}
        </span>
      </div>

      <button
        className={`btn ${intl ? "btn-intl" : "btn-local"}`}
        style={{ maxWidth: 280, opacity: outOfStock ? 0.5 : 1 }}
        disabled={outOfStock}
        onClick={() => setNote(true)}
      >
        Add to cart
      </button>

      {note && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          🛒 Checkout is being wired up (Phase 2). Selected: <strong>{selected.label}</strong> · {selected.price}
        </p>
      )}
    </div>
  );
}
