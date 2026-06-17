import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { listProducts } from "@/lib/api/products";
import { CATALOG, toCatalogSpice } from "@/lib/catalog-data";
import { SiteChrome } from "@/components/SiteChrome";
import { CategoriesClient } from "@/components/categories/CategoriesClient";
import type { CatalogSpice } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shop by category",
  description:
    "Browse Aranya Ceylon by preparation — whole spices, stone-milled powders and estate blends — or by the flavour you're cooking toward.",
  alternates: { canonical: "/categories" },
};

async function loadCatalog(): Promise<CatalogSpice[]> {
  try {
    const res = await listProducts({ limit: 60 });
    const items = (res.items || []).map(toCatalogSpice);
    if (items.length) return items;
  } catch {
    /* fall through */
  }
  return CATALOG;
}

export default async function CategoriesPage() {
  const market = resolveMarket();
  const products = await loadCatalog();
  return (
    <SiteChrome initialMarket={market}>
      <CategoriesClient products={products} />
    </SiteChrome>
  );
}
