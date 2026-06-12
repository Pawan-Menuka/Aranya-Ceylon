import Link from "next/link";
import type { ProductView } from "@/lib/api/types";

// CardCFinal (canonical catalog card): #F4F0E8 surface, 5px per-spice top
// stripe, type-led, ghost CTA. Photography is a placeholder block for now
// (per CLAUDE.md, the card is type-led until real photos land).
export function ProductCard({ product }: { product: ProductView }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        borderTop: `5px solid ${product.color}`,
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        transition: "box-shadow .18s, transform .18s",
      }}
    >
      {/* Placeholder spice "photo" — tinted with the per-spice color */}
      <div
        aria-hidden
        style={{
          height: 150,
          background: `linear-gradient(135deg, ${product.color}22, ${product.color}0a)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="disp" style={{ fontSize: 40, color: `${product.color}`, opacity: 0.5 }}>
          {product.name.charAt(0)}
        </span>
      </div>

      <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span className="eyebrow" style={{ color: "var(--muted)" }}>{product.category}</span>
          {product.badge && (
            <span className="eyebrow" style={{ color: "var(--accent)" }}>{product.badge}</span>
          )}
        </div>

        <h3 className="disp" style={{ margin: 0, fontSize: 21, lineHeight: 1.15, color: "var(--ink)" }}>
          {product.name}
        </h3>

        {product.latin && (
          <span className="prose" style={{ fontStyle: "italic", fontSize: 13, color: "var(--muted)" }}>
            {product.latin}
          </span>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <span style={{ fontFamily: "var(--font-ui), sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
            {product.price}
          </span>
          <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12, color: "var(--muted)" }}>
            {product.weights.join(" · ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
