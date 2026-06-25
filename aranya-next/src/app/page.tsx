import { resolveMarket } from "@/lib/market";
import { jsonLdHtml } from "@/lib/json-ld";
import { getFeatured, getBestsellers } from "@/lib/api/products";
import { SPICES, toSpice } from "@/lib/spice-data";
import { HomePage } from "@/components/home/HomePage";
import type { Spice } from "@/lib/types";

// The page reads the market cookie (dynamic), but the product fetches are
// ISR-cached (revalidate: 300 inside the typed client) so the catalog data is
// still served fast and revalidated, per spec §5 (SSG/ISR + client market).
async function loadHomeData(): Promise<{ featured: Spice[]; bestsellers: Spice[]; ticker: Spice[] }> {
  let featured: Spice[] = [];
  let bestsellers: Spice[] = [];
  try {
    const [f, b] = await Promise.all([getFeatured(), getBestsellers()]);
    featured = (f.products || []).map(toSpice);
    bestsellers = (b.products || []).map(toSpice);
  } catch {
    // Backend unreachable → on-brand demo fallback (acceptance criterion §11).
  }
  if (!featured.length) featured = SPICES;
  if (!bestsellers.length) bestsellers = SPICES;

  // Ticker = union of both lists, de-duped by name; fall back to demo set.
  const seen = new Set<string>();
  const ticker = [...featured, ...bestsellers].filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  return { featured, bestsellers, ticker: ticker.length ? ticker : SPICES };
}

export default async function Page() {
  const market = resolveMarket();
  const { featured, bestsellers, ticker } = await loadHomeData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Aranya Ceylon",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    description: "Single-origin Ceylon spice, shipped at peak aroma.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <HomePage initialMarket={market} featured={featured} bestsellers={bestsellers} ticker={ticker} />
    </>
  );
}
