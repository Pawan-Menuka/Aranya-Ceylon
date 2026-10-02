import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { getCategorySummary } from "@/lib/api/categories";
import { DEMO_MODE } from "@/lib/demo";
import { CATALOG, toCatalogSpice } from "@/lib/catalog-data";
import { SiteChrome } from "@/components/SiteChrome";
import { CategoriesClient } from "@/components/categories/CategoriesClient";
import type { CatalogCategoryGroup } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shop by category",
  description:
    "Browse Aranya Ceylon by preparation — whole spices, stone-milled powders and estate blends — or by the flavour you're cooking toward.",
  alternates: { canonical: "/categories" },
};

async function loadGroups(): Promise<CatalogCategoryGroup[]> {
  try {
    const summary = await getCategorySummary();
    if (summary.groups.length || !DEMO_MODE) return summary.groups.map(group => ({ ...group, spices: group.spices.map(toCatalogSpice) }));
  } catch (error) {
    if (!DEMO_MODE) throw error;
  }
  return [...new Set(CATALOG.map(p => p.category))].map(name => {
    const spices = CATALOG.filter(p => p.category === name);
    return { name, count: spices.length, spices: spices.slice(0, 3) };
  });
}

export default async function CategoriesPage() {
  const market = resolveMarket();
  const groups = await loadGroups();
  return (
    <SiteChrome initialMarket={market}>
      <CategoriesClient groups={groups} />
    </SiteChrome>
  );
}
