import type { ProductCardQuery } from "./api/products";
import type { CatalogPage, CatalogSpice, Market } from "./types";
import { toCatalogSpice } from "./catalog-data";
import type { ProductCardPage } from "./types";

export const CATALOG_PAGE_SIZE = 8;
const sorts = ["featured", "best", "price-asc", "price-desc", "rating", "new"] as const;
export interface CatalogQuery {
  category: string;
  sort: typeof sorts[number];
  form: string[];
  origin: string[];
  flavour: string[];
  search: string;
}
type SearchValues = Record<string, string | string[] | undefined>;
const values = (v: string | string[] | undefined) => [...new Set((Array.isArray(v) ? v.join(",") : v || "").split(",").map(x => x.trim()).filter(Boolean))].sort();
const single = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

export function catalogQuery(params: SearchValues): CatalogQuery {
  const sort = single(params.sort);
  return { category: single(params.cat) || "All", sort: sorts.includes(sort as CatalogQuery["sort"]) ? sort as CatalogQuery["sort"] : "featured", form: values(params.form), origin: values(params.origin), flavour: values(params.flavour), search: (single(params.search) || "").trim() };
}

export function catalogParams(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.category !== "All") params.set("cat", query.category);
  for (const key of ["form", "origin", "flavour"] as const) if (query[key].length) params.set(key, [...query[key]].sort().join(","));
  if (query.sort !== "featured") params.set("sort", query.sort);
  if (query.search) params.set("search", query.search);
  return params.toString();
}

export function catalogScope(query: CatalogQuery, market: Market): string {
  return `${market}:${catalogParams(query)}`;
}

export function cardQuery(query: CatalogQuery, cursor?: string): ProductCardQuery {
  return { limit: CATALOG_PAGE_SIZE, cursor, sort: query.sort, categoryName: query.category === "All" ? undefined : query.category, form: query.form, origin: query.origin, flavour: query.flavour, search: query.search || undefined };
}

export function adaptCatalogPage(page: ProductCardPage, market: Market): CatalogPage {
  if (page.market !== (market === "local" ? "LOCAL" : "INTERNATIONAL")) throw new Error("The catalog market changed. Please try again.");
  return { ...page, items: page.items.map(toCatalogSpice), featured: page.featured.map(toCatalogSpice) };
}

export interface CatalogSnapshot {
  scope: string;
  page: CatalogPage | null;
  loading: boolean;
  error: string | null;
}
type PageLoader = (scope: string, cursor: string | undefined, signal: AbortSignal) => Promise<CatalogPage>;

/** Owns cancellation and page ordering, including APIs that finish after cancellation. */
export class CatalogPager {
  snapshot: CatalogSnapshot;
  private generation = 0;
  private controller: AbortController | null = null;
  private failedCursor: string | undefined;
  private listeners = new Set<(state: CatalogSnapshot) => void>();
  constructor(private load: PageLoader, scope: string, page: CatalogPage) {
    this.snapshot = { scope, page, loading: false, error: null };
  }
  subscribe(listener: (state: CatalogSnapshot) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private publish(state: CatalogSnapshot) {
    this.snapshot = state;
    this.listeners.forEach(listener => listener(state));
  }
  reset(scope: string, page?: CatalogPage) {
    this.cancel();
    this.failedCursor = undefined;
    this.publish({ scope, page: page ?? null, loading: false, error: null });
    if (!page) void this.request();
  }
  cancel() {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
  }
  loadMore() {
    const { page, loading } = this.snapshot;
    if (!loading && page?.hasNextPage && page.nextCursor) void this.request(page.nextCursor);
  }
  retry() {
    if (!this.snapshot.loading && this.snapshot.error) void this.request(this.failedCursor);
  }
  private async request(cursor?: string) {
    if (this.snapshot.loading) return;
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    const scope = this.snapshot.scope;
    this.publish({ ...this.snapshot, loading: true, error: null });
    try {
      const page = await this.load(scope, cursor, controller.signal);
      if (generation !== this.generation || controller.signal.aborted) return;
      if (page.hasNextPage && (!page.nextCursor || page.nextCursor === cursor)) throw new Error("The next catalog page could not be loaded. Please try again.");
      const previous = cursor ? this.snapshot.page?.items ?? [] : [];
      const seen = new Set(previous.map(p => p.productId || p.slug || p.name));
      const items = [...previous];
      for (const item of page.items) {
        const id = item.productId || item.slug || item.name;
        if (!seen.has(id)) { items.push(item); seen.add(id); }
      }
      this.publish({ scope, page: { ...page, items }, loading: false, error: null });
      this.failedCursor = undefined;
    } catch (error) {
      if (generation !== this.generation || controller.signal.aborted) return;
      this.failedCursor = cursor;
      this.publish({ ...this.snapshot, loading: false, error: error instanceof Error ? error.message : "The catalog could not be loaded. Please try again." });
    } finally {
      if (generation === this.generation) this.controller = null;
    }
  }
}
