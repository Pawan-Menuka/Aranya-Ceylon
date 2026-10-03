import { resolveMarket } from "@/lib/market";
import { jsonLdHtml } from "@/lib/json-ld";
import { getFeatured, getBestsellers } from "@/lib/api/products";
import { rethrowReadFailure } from "@/lib/api/read-failure";
import { DEMO_MODE } from "@/lib/demo";
import { SPICES, toSpice } from "@/lib/spice-data";
import { HomePage } from "@/components/home/HomePage";
import type { Spice } from "@/lib/types";

// Market cookies and CSP nonces keep HTML dynamic. Public product data has
// a separate tagged Data Cache with a five-minute lifetime.
async function loadHomeData(): Promise<{ featured: Spice[]; bestsellers: Spice[]; ticker: Spice[] }> {
  let featured: Spice[] = [];
  let bestsellers: Spice[] = [];
  try {
    const [f, b] = await Promise.all([getFeatured(), getBestsellers()]);
    featured = (f.products || []).map(toSpice);
    bestsellers = (b.products || []).map(toSpice);
  } catch (error) {
    rethrowReadFailure(error);
    // Production transport failures offer retry; preview may use demo content.
  }
  if (DEMO_MODE && !featured.length) featured = SPICES;
  if (DEMO_MODE && !bestsellers.length) bestsellers = SPICES;

  // Preserve a genuinely empty live catalog in the ticker too.
  const seen = new Set<string>();
  const ticker = [...featured, ...bestsellers].filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  return { featured, bestsellers, ticker };
}

export default async function Page() {
  const market = await resolveMarket();
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
