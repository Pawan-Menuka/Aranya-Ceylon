"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductView } from "@/lib/api/types";
import { useCart } from "./CartProvider";
import { Stars } from "./Stars";
import { Icon } from "./design/Primitives";

// CardCFinal (canonical catalog card, see frontend/DESIGN.md): #F4F0E8 surface,
// 5px per-spice top stripe, type-led, wish toggle, weight selector + ghost CTA.
// Photography is a spice-tinted placeholder until real photos land.
export function ProductCard({ product }: { product: ProductView }) {
  const { addItem } = useCart();
  const intl = product.currency !== "LKR";
  const variants = product.variants ?? [];

  const [hover, setHover] = useState(false);
  const [wish, setWish] = useState(false);
  const defaultIdx = Math.max(0, variants.findIndex((v) => v.weight === 100));
  const [idx, setIdx] = useState(defaultIdx === -1 ? 0 : defaultIdx);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");

  const selected = variants[idx];
  const outOfStock = !!selected && selected.stock <= 0;
  const price = selected ? selected.price : product.price;
  const href = `/products/${product.slug}`;
  const accent = intl ? "var(--accent)" : "var(--brand)";

  const onAdd = async () => {
    if (!selected) return;
    setStatus("adding");
    const res = await addItem({ productId: product.id, variantId: selected.id, quantity: 1 });
    if (res.ok) {
      setStatus("added");
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setStatus("idle");
    }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        background: "var(--surface)",
        borderRadius: 6,
        overflow: "hidden",
        borderTop: `5px solid ${product.color}`,
        display: "flex",
        flexDirection: "column",
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-3px)" : "none",
        transition: "box-shadow .2s, transform .2s",
      }}
    >
      <div style={{ position: "relative", padding: "20px 20px 6px" }}>
        <button
          aria-label="Save"
          onClick={() => setWish((w) => !w)}
          style={{ position: "absolute", top: 16, right: 16, zIndex: 2, width: 34, height: 34, borderRadius: 999, border: "1px solid var(--line)", background: "rgba(253,250,245,.94)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}
        >
          <Icon name="heart" size={17} stroke={wish ? "#BA7517" : "var(--muted)"} />
        </button>

        <Link href={href} style={{ display: "block", borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)" }}>
          <SpicePhoto color={product.color} />
        </Link>

        <div style={{ textAlign: "center", height: 22, marginTop: 10 }}>
          <Link
            href={href}
            style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--brand)", opacity: hover ? 1 : 0, transition: "opacity .2s", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="eye" size={14} stroke="var(--brand)" /> Quick view
          </Link>
        </div>
      </div>

      <div style={{ padding: "4px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, gap: 8 }}>
          <span className="eyebrow" style={{ color: product.color, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 14, height: 2, background: product.color }} />
            {product.badge ?? product.category}
          </span>
          {product.rating > 0 && <Stars rating={product.rating} size={12} />}
        </div>

        <h3 className="disp" style={{ fontSize: 24, color: "var(--ink)", margin: "0 0 3px", lineHeight: 1.08, letterSpacing: ".01em" }}>
          <Link href={href} style={{ color: "var(--ink)" }}>{product.name}</Link>
        </h3>
        {product.latin && (
          <p className="disp" style={{ fontStyle: "italic", fontSize: 14, color: "var(--muted)", margin: "0 0 16px" }}>{product.latin}</p>
        )}

        <div style={{ height: 1, background: "var(--line)", marginBottom: 15, marginTop: "auto" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15, gap: 8 }}>
          <div className="disp" style={{ fontSize: 29, color: "var(--ink)", lineHeight: 1, fontWeight: 600 }}>{price}</div>
          {variants.length > 1 ? (
            <div className={`seg ${intl ? "intl" : "local"}`}>
              {variants.map((v, i) => (
                <button key={v.id} className={i === idx ? "on" : ""} onClick={() => setIdx(i)}>{v.label}</button>
              ))}
            </div>
          ) : (
            <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12, color: "var(--muted)" }}>{product.weights.join(" · ")}</span>
          )}
        </div>

        {selected ? (
          <button
            className="btn"
            onClick={onAdd}
            disabled={outOfStock || status === "adding"}
            style={{
              background: status === "added" ? accent : "transparent",
              color: status === "added" ? "#fff" : accent,
              border: `1.5px solid ${accent}`,
              opacity: outOfStock ? 0.5 : 1,
              cursor: outOfStock ? "default" : "pointer",
            }}
          >
            {outOfStock ? "Out of stock" : status === "adding" ? "Adding…" : status === "added" ? "Added to basket ✓" : "Add to Cart"}
          </button>
        ) : (
          <Link href={href} className="btn" style={{ background: "transparent", color: accent, border: `1.5px solid ${accent}`, textAlign: "center" }}>
            View
          </Link>
        )}
      </div>
    </div>
  );
}

// Spice-tinted placeholder pile (single-colour adaptation of SpicePhoto).
function SpicePhoto({ color }: { color: string }) {
  return (
    <div
      className="grain"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        overflow: "hidden",
        background:
          `radial-gradient(70% 60% at 50% 44%, ${color} 0%, ${color} 24%, ${color}aa 60%, ${color}33 100%),` +
          `linear-gradient(180deg, var(--surface), var(--surface))`,
      }}
    >
      <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", width: "46%", height: "40%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,.28), transparent 70%)", filter: "blur(4px)" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 60px rgba(40,28,12,.18)" }} />
    </div>
  );
}
