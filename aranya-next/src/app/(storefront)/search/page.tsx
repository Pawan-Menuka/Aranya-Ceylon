import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { listProductCards } from "@/lib/api/products";
import { readPages } from "@/lib/read-pages";
import { listBlog } from "@/lib/api/blog";
import { CATALOG, toCatalogSpice } from "@/lib/catalog-data";
import { JOURNAL, toPost } from "@/lib/journal-data";
import { SiteChrome } from "@/components/SiteChrome";
import { SearchClient } from "@/components/search/SearchClient";
import type { CatalogSpice } from "@/lib/types";
import type { Post } from "@/lib/journal-data";
import { rethrowReadFailure } from "@/lib/api/read-failure";
import { DEMO_MODE } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the full Aranya Ceylon harvest — whole spices, ground powders, estate blends and stories from the hill country.",
  alternates: { canonical: "/search" },
  robots: { index: false }, // search results pages shouldn't be indexed
};

// The current small search index is loaded as compact cards and journal
// metadata. Follow every cursor so local substring results remain complete.
async function loadIndex(): Promise<{ products: CatalogSpice[]; journal: Post[] }> {
  let products: CatalogSpice[] = [];
  let journal: Post[] = [];
  try {
    const [p, b] = await Promise.all([
      readPages((cursor, signal) => listProductCards({ limit: 40, sort: "best", cursor }, { signal })),
      readPages((cursor, signal) => listBlog({ limit: 50, cursor }, 300, { signal })),
    ]);
    products = p.map(toCatalogSpice);
    journal = b.map(blog => ({ ...toPost(blog), body: undefined }));
  } catch (error) {
    rethrowReadFailure(error);
    /* fall through to demo */
  }
  if (DEMO_MODE && !products.length) products = CATALOG;
  if (DEMO_MODE && !journal.length) journal = JOURNAL;
  return { products, journal };
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const market = resolveMarket();
  const { products, journal } = await loadIndex();
  return (
    <SiteChrome initialMarket={market}>
      <SearchClient products={products} journal={journal} indexMarket={market} initialQuery={searchParams.q || ""} />
    </SiteChrome>
  );
}
