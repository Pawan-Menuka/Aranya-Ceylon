import { publicApiFetch, type PublicRequestOptions } from "./public";
import type { SearchSort, SearchResource, SearchResults, SearchResultPage, CatalogSpice, Market } from "../types";
import { toCatalogSpice } from "../catalog-data";
import { toPost, type Post } from "../journal-data";

export interface SearchQuery {
  q: string; sort?: SearchSort; limit?: number; resource?: SearchResource;
  productCursor?: string; journalCursor?: string;
}
export function searchCatalogue(query: SearchQuery, options: PublicRequestOptions = {}): Promise<SearchResults> {
  const qs = new URLSearchParams({ q: query.q.trim(), sort: query.sort ?? "relevance", limit: String(query.limit ?? 20) });
  if (query.resource) qs.set("resource", query.resource);
  if (query.productCursor) qs.set("productCursor", query.productCursor);
  if (query.journalCursor) qs.set("journalCursor", query.journalCursor);
  return publicApiFetch(`/search?${qs.toString()}`, options);
}
export interface SearchView {
  products: SearchResultPage<CatalogSpice>; journal: SearchResultPage<Post>;
}
export function searchView(result: SearchResults, market: Market): SearchView {
  if (result.market !== (market === "local" ? "LOCAL" : "INTERNATIONAL")) throw new Error("Search market changed. Please try again.");
  return {
    products: { ...result.products, items: result.products.items.map(toCatalogSpice) },
    journal: { ...result.journal, items: result.journal.items.map(post => ({ ...toPost({ ...post, publishedAt: post.publishedAt ?? undefined, seoDesc: post.seoDesc ?? undefined, content: "", status: "PUBLISHED" }), body: undefined })) },
  };
}
export const emptySearchView = (): SearchView => ({
  products: { items: [], total: 0, nextCursor: null, hasNextPage: false },
  journal: { items: [], total: 0, nextCursor: null, hasNextPage: false },
});
export function searchScope(market: Market, query: string, sort: SearchSort): string { return JSON.stringify([market, query.trim(), sort]); }
export function appendSearchPage<T extends { slug?: string; name?: string }>(previous: SearchResultPage<T>, next: SearchResultPage<T>): SearchResultPage<T> {
  const identity = (item: T) => {
    const key = item.slug ?? item.name;
    if (!key) throw new Error("Search result identity is missing.");
    return key;
  };
  const existing = new Set(previous.items.map(identity));
  return { ...next, items: [...previous.items, ...next.items.filter(item => !existing.has(identity(item)))] };

}
