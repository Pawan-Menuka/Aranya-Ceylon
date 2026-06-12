"use client";

import { useState } from "react";
import type { Market } from "@/lib/market";
import type { VariantView } from "@/lib/api/types";
import { useCart } from "./CartProvider";

// Weight selector + price + add-to-cart (wired to the cart context).
export function VariantPicker({
  productId,
  variants,
  market,
}: {
  productId: string;
  variants: VariantView[];
  market: Market;
}) {
  const { addItem } = useCart();
  // Default to 100g if present, else the first variant.
  const defaultIdx = Math.max(0, variants.findIndex((v) => v.weight === 100));
  const [idx, setIdx] = useState(defaultIdx === -1 ? 0 : defaultIdx);
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (variants.length === 0) {
    return <p style={{ color: "var(--muted)" }}>Not available in this store.</p>;
  }

  const selected = variants[idx]!;
  const intl = market === "INTERNATIONAL";
  const outOfStock = selected.stock <= 0;

  const onAdd = async () => {
    setStatus("adding");
    const res = await addItem({ productId, variantId: selected.id, quantity: 1 });
    if (res.ok) {
      setStatus("added");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setStatus("error");
      setErrorMsg(res.error ?? "Could not add to cart");
    }
  };

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
        style={{ maxWidth: 280, opacity: outOfStock || status === "adding" ? 0.6 : 1 }}
        disabled={outOfStock || status === "adding"}
        onClick={onAdd}
      >
        {status === "adding" ? "Adding…" : status === "added" ? "✓ Added to cart" : "Add to cart"}
      </button>

      {status === "error" && (
        <p style={{ fontSize: 13, color: "#B23B3B", margin: 0 }}>{errorMsg}</p>
      )}
    </div>
  );
}
