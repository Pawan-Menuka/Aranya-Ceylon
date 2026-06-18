import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { listProducts } from "@/lib/api/products";
import { getRecentBlog } from "@/lib/api/blog";
import { CATALOG, toCatalogSpice } from "@/lib/catalog-data";
import { JOURNAL, toPost } from "@/lib/journal-data";
import { SiteChrome } from "@/components/SiteChrome";
import { SearchClient } from "@/components/search/SearchClient";
import type { CatalogSpice } from "@/lib/types";
import type { Post } from "@/lib/journal-data";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the full Aranya Ceylon harvest — whole spices, ground powders, estate blends and stories from the hill country.",
  alternates: { canonical: "/search" },
  robots: { index: false }, // search results pages shouldn't be indexed
};

// Search is a client experience, but we load the index server-side (catalog +
// journal) so first results paint instantly and work with the API down.
async function loadIndex(): Promise<{ products: CatalogSpice[]; journal: Post[] }> {
  let products: CatalogSpice[] = [];
  let journal: Post[] = [];
  try {
    const [p, b] = await Promise.all([listProducts({ limit: 100 }), getRecentBlog()]);
    products = (p.items || []).map(toCatalogSpice);
    journal = (b.blogs || []).map(toPost);
  } catch {
    /* fall through to demo */
  }
  if (!products.length) products = CATALOG;
  if (!journal.length) journal = JOURNAL;
  return { products, journal };
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const market = resolveMarket();
  const { products, journal } = await loadIndex();
  return (
    <SiteChrome initialMarket={market}>
      <SearchClient products={products} journal={journal} initialQuery={searchParams.q || ""} />
    </SiteChrome>
  );
}
