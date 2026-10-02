import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { jsonLdHtml } from "@/lib/json-ld";
import { notFound } from "next/navigation";
import { resolveMarket } from "@/lib/market";
import { getProduct, listProducts } from "@/lib/api/products";
import { rethrowReadFailure } from "@/lib/api/read-failure";
import { DEMO_MODE } from "@/lib/demo";
import { toSpice, SPICES } from "@/lib/spice-data";
import { CATALOG } from "@/lib/catalog-data";
import { pdContent, pdPrice } from "@/lib/pd-content";
import { currencyForMarket } from "@/lib/money";
import { SiteChrome } from "@/components/SiteChrome";
import { ProductDetail, RelatedProducts } from "@/components/product/ProductDetail";
import { ForestStory, FlavourProfile, Pairings, ReviewsBlock } from "@/components/product/Editorial";
import type { Spice, Market, Product } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";

// Metadata and page share only the primary read within this render. Optional
// recommendations resolve inside their own streaming boundary below.
const resolveSpice = cache(async (slug: string): Promise<{ spice: Spice; product?: Product } | null> => {
  try {
    const { product } = await getProduct(slug);
    if (product) {
      const spice = toSpice(product);
      return { spice, product };
    }
  } catch (error) {
    rethrowReadFailure(error);
    // A removed/unpublished live product must not reappear from demo content.
    if (!DEMO_MODE && (error as { status?: number }).status === 404) return null;
    // fall through to demo
  }
  const demo = [...CATALOG, ...SPICES];
  const hit = demo.find((s) => (s.slug || slugify(s.name)) === slug || slugify(s.name) === slug);
  if (!hit) return null;
  return { spice: hit };
});

async function RelatedContent({ spice, product }: { spice: Spice; product?: Product }) {
  let related: Spice[] = [];
  if (product) {
    try {
      const res = await listProducts({ limit: 5, category: product.category?.slug });
      related = (res.items || []).filter((p) => p.slug !== product.slug).map(toSpice).slice(0, 4);
    } catch { /* related content is optional */ }
  }
  if (!related.length && DEMO_MODE) related = SPICES.filter((s) => s.name !== spice.name).slice(0, 4);
  if (!related.length) return null;
  return <RelatedProducts spices={related} />;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Known route params; cookies and CSP nonces keep page HTML dynamic.
// Public API data has its own independent cache lifetime.
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
  const { spice, product } = resolved;

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
      <ProductDetail spice={spice} product={product} editorial={<><ForestStory spice={spice} storyHtml={pdContent(spice).story.map(sanitizeHtml)} /><FlavourProfile spice={spice} /><Pairings spice={spice} /><ReviewsBlock spice={spice} /></>} related={
        <Suspense fallback={null}><RelatedContent spice={spice} product={product} /></Suspense>
      } />
    </SiteChrome>
  );
}
