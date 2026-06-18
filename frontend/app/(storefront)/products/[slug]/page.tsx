import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/api/products";
import { VariantPicker } from "@/components/VariantPicker";
import { Stars } from "@/components/Stars";
import type { ProductDetailView } from "@/lib/api/types";

const CERT_LABEL: Record<string, string> = {
  ORGANIC: "Organic",
  CEYLON_GI: "GI Certified",
  GI: "GI Certified",
  FAIRTRADE: "Fair Trade",
  FAIR_TRADE: "Fair Trade",
  BESTSELLER: "Bestseller",
  NEW: "New",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result) return { title: "Product not found — Aranya Ceylon" };
  const { product } = result;
  const desc = product.description.slice(0, 155);
  return {
    title: `${product.name} — Aranya Ceylon`,
    description: desc,
    openGraph: { title: product.name, description: desc, type: "website" },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result) notFound();
  const { product, market } = result;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(product)) }}
      />

      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/products" style={{ color: "var(--muted)" }}>Shop</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>{product.name}</span>
      </nav>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* Gallery (placeholder blocks tinted with the spice color until R2 photos land) */}
        <Gallery product={product} />

        {/* Info column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="eyebrow" style={{ color: "var(--muted)" }}>{product.category}</span>
          <h1 className="disp" style={{ fontSize: "clamp(32px,4.5vw,46px)", lineHeight: 1.1, margin: 0 }}>
            {product.name}
          </h1>
          {product.latin && (
            <span className="prose" style={{ fontStyle: "italic", fontSize: 16, color: "var(--muted)" }}>
              {product.latin} · {product.origin}
            </span>
          )}

          {product.reviewCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Stars rating={product.rating} />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {product.rating.toFixed(1)} · {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {product.certifications.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {product.certifications.map((c) => (
                <span
                  key={c}
                  className="eyebrow"
                  style={{
                    color: "var(--brand)",
                    border: "1px solid var(--line)",
                    borderRadius: 999,
                    padding: "5px 12px",
                  }}
                >
                  {CERT_LABEL[c] ?? c}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <VariantPicker productId={product.id} variants={product.variants} market={market} />
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <section style={{ maxWidth: 720, marginTop: 56 }}>
          <h2 className="disp" style={{ fontSize: 26, marginBottom: 12 }}>About this spice</h2>
          <p className="prose" style={{ fontSize: 17, color: "var(--ink)" }}>{product.description}</p>
        </section>
      )}

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <section style={{ maxWidth: 720, marginTop: 48 }}>
          <h2 className="disp" style={{ fontSize: 26, marginBottom: 20 }}>Reviews</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {product.reviews.map((r) => (
              <article key={r.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Stars rating={r.rating} size={14} />
                  <strong style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14 }}>{r.title}</strong>
                </div>
                <p className="prose" style={{ margin: "0 0 6px", color: "var(--ink)" }}>{r.body}</p>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {r.author} · {new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Gallery({ product }: { product: ProductDetailView }) {
  return (
    <div
      aria-hidden
      style={{
        aspectRatio: "1 / 1",
        background: `linear-gradient(135deg, ${product.color}26, ${product.color}0a)`,
        borderTop: `5px solid ${product.color}`,
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span className="disp" style={{ fontSize: 96, color: product.color, opacity: 0.45 }}>
        {product.name.charAt(0)}
      </span>
    </div>
  );
}

function buildJsonLd(p: ProductDetailView) {
  const prices = p.variants.map((v) => v.priceAmount).filter((n) => !Number.isNaN(n));
  const inStock = p.variants.some((v) => v.stock > 0);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    category: p.category,
    brand: { "@type": "Brand", name: "Aranya Ceylon" },
    ...(p.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: p.rating.toFixed(1),
        reviewCount: p.reviewCount,
      },
    }),
    ...(prices.length > 0 && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: p.currency,
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        availability: inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    }),
  };
}
