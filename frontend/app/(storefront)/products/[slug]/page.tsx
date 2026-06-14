import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/api/products";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Stars } from "@/components/Stars";
import type { ProductDetailView } from "@/lib/api/types";

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
    <main style={{ background: "var(--bg)", paddingBottom: 80 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(product)) }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 40px 0" }}>
        <nav style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--font-ui), sans-serif", fontWeight: 600 }}>
          <Link href="/products" style={{ color: "var(--muted)" }}>Shop</Link>
          <span style={{ color: "var(--line)", margin: "0 9px" }}>/</span>
          <span style={{ color: "var(--ink)" }}>{product.name}</span>
        </nav>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "28px 40px 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 56,
          alignItems: "start",
        }}
      >
        <ProductGallery color={product.color} name={product.name} badge={product.badge} images={product.images} />
        <BuyBox product={product} market={market} />
      </div>

      {/* About */}
      {product.description && (
        <section style={{ maxWidth: 760, margin: "0 auto", padding: "64px 40px 0" }}>
          <h2 className="disp" style={{ fontSize: 30, marginBottom: 14, color: "var(--ink)" }}>About this spice</h2>
          <p className="prose" style={{ fontSize: 17.5, color: "var(--ink)", lineHeight: 1.72 }}>{product.description}</p>
        </section>
      )}

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <section id="reviews" style={{ maxWidth: 760, margin: "0 auto", padding: "56px 40px 0" }}>
          <h2 className="disp" style={{ fontSize: 30, marginBottom: 20, color: "var(--ink)" }}>Reviews</h2>
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
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.toFixed(1), reviewCount: p.reviewCount },
    }),
    ...(prices.length > 0 && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: p.currency,
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    }),
  };
}
