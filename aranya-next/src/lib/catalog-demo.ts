import { CATALOG, CATALOG_FACETS, parsePrice } from "./catalog-data";
import { CATALOG_PAGE_SIZE, type CatalogQuery } from "./catalog-pagination";
import type { CatalogPage, CatalogSpice, Market } from "./types";

/** Explicit preview data follows the same page/filter contract without hiding live failures. */
export function demoCatalogPage(query: CatalogQuery, market: Market, cursor?: string): CatalogPage {
  const price = (p: CatalogSpice) => parsePrice(market === "local" ? p.lkr : p.usd);
  const compare: Record<CatalogQuery["sort"], (a: CatalogSpice, b: CatalogSpice) => number> = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || b.popularity - a.popularity,
    best: (a, b) => b.popularity - a.popularity,
    "price-asc": (a, b) => price(a) - price(b), "price-desc": (a, b) => price(b) - price(a),
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    new: (a, b) => b.added.localeCompare(a.added),
  };
  const filtered = CATALOG.filter(p => (query.category === "All" || p.category === query.category)
    && (!query.form.length || query.form.includes(p.form)) && (!query.origin.length || query.origin.includes(p.origin))
    && (!query.flavour.length || query.flavour.some(f => p.flavour.includes(f))) && (!query.search || p.name.toLowerCase().includes(query.search.toLowerCase())))
    .sort((a, b) => compare[query.sort](a, b) || (a.slug || a.name).localeCompare(b.slug || b.name));
  const offset = cursor ? Number(cursor) : 0;
  const items = filtered.slice(offset, offset + CATALOG_PAGE_SIZE);
  const hasNextPage = offset + items.length < filtered.length;
  return { items, total: filtered.length, facets: CATALOG_FACETS, featured: CATALOG.filter(p => p.featured).slice(0, 3), nextCursor: hasNextPage ? String(offset + items.length) : null, hasNextPage, market: market === "local" ? "LOCAL" : "INTERNATIONAL", demo: true };
}

