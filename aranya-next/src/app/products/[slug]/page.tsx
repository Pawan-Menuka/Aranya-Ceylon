import type { Metadata } from "next";
import { jsonLdHtml } from "@/lib/json-ld";
import { notFound } from "next/navigation";
import { resolveMarket } from "@/lib/market";
import { getProduct, listProducts } from "@/lib/api/products";
import { toSpice, SPICES } from "@/lib/spice-data";
import { CATALOG } from "@/lib/catalog-data";
import { pdContent, pdPrice } from "@/lib/pd-content";
import { currencyForMarket } from "@/lib/money";
import { sanitizeHtml } from "@/lib/sanitize";
import { SiteChrome } from "@/components/SiteChrome";
import { ProductDetail } from "@/components/product/ProductDetail";
import type { Spice, Market, Product } from "@/lib/types";

// Resolve a spice by slug from the live API, falling back to the demo datasets
// (acceptance criterion §11). Returns the spice + a related set for the page.
async function resolveSpice(slug: string): Promise<{ spice: Spice; related: Spice[]; product?: Product } | null> {
  try {
    const { product } = await getProduct(slug);
    if (product) {
      const spice = toSpice(product);
      let related: Spice[] = [];
      try {
        const res = await listProducts({ limit: 5, category: product.category?.slug });
        related = (res.items || []).filter((p) => p.slug !== product.slug).map(toSpice).slice(0, 4);
      } catch {
        /* ignore — related is optional */
      }
      if (!related.length) related = SPICES.filter((s) => s.name !== spice.name).slice(0, 4);
      return { spice, related, product };
    }
  } catch {
    // fall through to demo
  }
  const demo = [...CATALOG, ...SPICES];
  const hit = demo.find((s) => (s.slug || slugify(s.name)) === slug || slugify(s.name) === slug);
  if (!hit) return null;
  const related = SPICES.filter((s) => s.name !== hit.name).slice(0, 4);
  return { spice: hit, related };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Pre-render the demo catalog at build (spec §5 SSG/ISR). Live slugs are filled
// in on-demand via ISR.
export async function generateStaticParams() {
  return CATALOG.map((s) => ({ slug: s.slug || slugify(s.name) }));
}

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const resolved = await resolveSpice(params.slug);
  if (!resolved) return { title: "Spice not found" };
  const { spice } = resolved;
  const c = pdContent(spice);
  return {
    title: spice.name,
    description: c.tagline,
    alternates: { canonical: `/products/${spice.slug || slugify(spice.name)}` },
    openGraph: { title: `${spice.name} · Aranya Ceylon`, description: c.tagline, type: "website" },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const market: Market = resolveMarket();
  const resolved = await resolveSpice(params.slug);
  if (!resolved) notFound();
  const { spice, related, product } = resolved;

  // Sanitised server-side, not inside ProductDetail's "use client" tree — a
  // Next 14.2.35 bug corrupts the client-reference-manifest entry for a
  // "use client" component that calls isomorphic-dompurify's sanitizeHtml
  // directly (crashes with "Element type is invalid" purely from the call's
  // *presence* in the client module, confirmed with sanitizeHtml working
  // fine called from here, a Server Component, before the crash was found).
  // See DEPLOY_READINESS_PLAN.md #0.1.
  const sanitizedStory = pdContent(spice).story.map(sanitizeHtml);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: spice.name,
    description: pdContent(spice).tagline,
    brand: { "@type": "Brand", name: "Aranya Ceylon" },
    category: spice.origin,
    aggregateRating: spice.reviews
      ? { "@type": "AggregateRating", ratingValue: spice.rating, reviewCount: spice.reviews }
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: currencyForMarket(market),
      price: pdPrice(spice, market, "100g").replace(/[^0-9.]/g, ""),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <SiteChrome initialMarket={market}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <ProductDetail spice={spice} related={related} product={product} sanitizedStory={sanitizedStory} />
    </SiteChrome>
  );
}
