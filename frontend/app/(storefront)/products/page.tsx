import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/ProductCard";

export const metadata = {
  title: "Shop — Aranya Ceylon",
  description: "Single-origin Ceylon spices: whole, ground, and estate blends.",
};

// Catalog vertical slice — server-rendered from the live backend, market-aware
// via the forwarded x-market cookie, with a demo-data fallback if the API is down.
export default async function ProductsPage() {
  const { items, market, live } = await getProducts({ limit: 24 });
  const currencyLabel = market === "LOCAL" ? "LKR · shipping within Sri Lanka" : "USD · international shipping";

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ marginBottom: 32 }}>
        <p className="eyebrow" style={{ color: "var(--accent)" }}>The Harvest</p>
        <h1 className="disp" style={{ fontSize: "clamp(34px,5vw,52px)", margin: "6px 0 8px" }}>
          Shop all spices
        </h1>
        <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, color: "var(--muted)", margin: 0 }}>
          {currencyLabel}
          {!live && (
            <span style={{ color: "var(--accent)", marginLeft: 10 }}>
              · showing sample data (catalog service offline)
            </span>
          )}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="prose" style={{ color: "var(--muted)" }}>No products available in this store yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
