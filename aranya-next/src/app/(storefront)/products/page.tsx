import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { listProductCards } from "@/lib/api/products";
import { demoCatalogPage } from "@/lib/catalog-demo";
import { DEMO_MODE } from "@/lib/demo";
import { adaptCatalogPage, cardQuery, catalogParams, catalogQuery, type CatalogQuery } from "@/lib/catalog-pagination";
import { SiteChrome } from "@/components/SiteChrome";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import type { CatalogPage, Market } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shop all spices",
  description:
    "Every Aranya Ceylon spice — single-origin whole quills, stone-ground powders and estate blends, graded for export and sealed within weeks of harvest.",
  alternates: { canonical: "/products" },
};

// Fetch only the first visible page; facets and counts cover the complete catalog.
async function loadCatalog(query: CatalogQuery, market: Market): Promise<CatalogPage> {
  try {
    const page = adaptCatalogPage(await listProductCards(cardQuery(query)), market);
    if (page.total || !DEMO_MODE) return page;
  } catch (error) {
    if (!DEMO_MODE) throw error;
  }
  return demoCatalogPage(query, market);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { cat?: string; form?: string; flavour?: string; origin?: string; sort?: string; search?: string };
}) {
  const market = resolveMarket();
  const initial = catalogQuery(searchParams);
  const page = await loadCatalog(initial, market);

  return (
    <SiteChrome initialMarket={market}>
      <CatalogClient key={`${catalogParams(initial)}:${!!page.demo}`} initialPage={page} initial={initial} initialMarket={market} />
    </SiteChrome>
  );
}
