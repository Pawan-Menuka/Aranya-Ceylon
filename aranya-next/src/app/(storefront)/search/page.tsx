import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { getBestsellers } from "@/lib/api/products";
import { searchCatalogue, searchView, emptySearchView, type SearchView } from "@/lib/api/search";
import { toCatalogSpice } from "@/lib/catalog-data";
import { SiteChrome } from "@/components/SiteChrome";
import { SearchClient } from "@/components/search/SearchClient";
import type { CatalogSpice } from "@/lib/types";
import { rethrowReadFailure } from "@/lib/api/read-failure";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the full Aranya Ceylon harvest — whole spices, ground powders, estate blends and stories from the hill country.",
  alternates: { canonical: "/search" },
  robots: { index: false }, // search results pages shouldn't be indexed
};

export default async function SearchPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await searchParamsPromise;
  const market = await resolveMarket();
  const query = (searchParams.q || "").trim().slice(0, 200);
  let initialResults: SearchView = emptySearchView();
  let best: CatalogSpice[] = [];
  try {
    const [results, bestsellers] = await Promise.all([
      query ? searchCatalogue({ q: query, limit: 20 }).then(result => searchView(result, market)) : Promise.resolve(emptySearchView()),
      getBestsellers(),
    ]);
    initialResults = results;
    best = bestsellers.products.slice(0, 4).map(toCatalogSpice);
  } catch (error) {
    rethrowReadFailure(error);
    throw error;
  }
  return (
    <SiteChrome initialMarket={market}>
      <SearchClient initialResults={initialResults} best={best} indexMarket={market} initialQuery={query} />
    </SiteChrome>
  );
}
