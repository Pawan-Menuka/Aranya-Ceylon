import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { listProducts } from "@/lib/api/products";
import { CATALOG, toCatalogSpice } from "@/lib/catalog-data";
import { SiteChrome } from "@/components/SiteChrome";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import type { CatalogSpice } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shop all spices",
  description:
    "Every Aranya Ceylon spice — single-origin whole quills, stone-ground powders and estate blends, graded for export and sealed within weeks of harvest.",
  alternates: { canonical: "/products" },
};

// SSG/ISR catalog (spec §5). Loads the full catalog server-side; client filters
// take over in CatalogClient. Falls back to the demo dataset if the API is down.
async function loadCatalog(): Promise<CatalogSpice[]> {
  try {
    const res = await listProducts({ limit: 60, sort: "bestselling" });
    const items = (res.items || []).map(toCatalogSpice);
    if (items.length) return items;
  } catch {
    // fall through to demo
  }
  return CATALOG;
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const raw = Array.isArray(v) ? v.join(",") : v;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { cat?: string; form?: string; flavour?: string; origin?: string; sort?: string };
}) {
  const market = resolveMarket();
  const products = await loadCatalog();

  // Server-resolve the initial filter state from the URL so the first paint
  // already reflects a shared/filtered link (no client flash).
  const cats = [...new Set(products.map((p) => p.category))];
  const sorts = ["featured", "best", "price-asc", "price-desc", "rating", "new"];
  const initial = {
    category: searchParams.cat && cats.includes(searchParams.cat) ? searchParams.cat : "All",
    form: asArray(searchParams.form),
    flavour: asArray(searchParams.flavour),
    origin: asArray(searchParams.origin),
    sort: searchParams.sort && sorts.includes(searchParams.sort) ? searchParams.sort : "featured",
  };

  return (
    <SiteChrome initialMarket={market}>
      <CatalogClient products={products} initial={initial} />
    </SiteChrome>
  );
}
