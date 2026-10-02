import { publicApiFetch, type PublicRequestOptions } from "./public";
import type { Product, ProductCard, ProductCardPage, Paginated, BackendMarket } from "../types";

// Spec §6 — /products. One module per resource; components import these, not fetch.

export interface ProductQuery {
  limit?: number;
  cursor?: string;
  category?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "bestselling";
  search?: string;
}

export interface ProductCardQuery {
  limit?: number;
  cursor?: string;
  categoryName?: string;
  form?: string[];
  origin?: string[];
  flavour?: string[];
  sort?: "featured" | "best" | "price-asc" | "price-desc" | "rating" | "new";
  search?: string;
}

export function listProductCards(q: ProductCardQuery = {}, options: PublicRequestOptions = {}): Promise<ProductCardPage> {
  return publicApiFetch(`/products${qs({ ...q, view: "cards", limit: q.limit ?? 8 })}`, options);
}

function qs(params: Record<string, unknown>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

export function listProducts(
  q: ProductQuery = {},
  revalidate: number | false = 300,
  options: PublicRequestOptions = {}
): Promise<Paginated<Product>> {
  return publicApiFetch(`/products${qs(q as Record<string, unknown>)}`, { revalidate, ...options });
}

export function getProductCardsByName(names: string[]): Promise<{ products: ProductCard[]; market: BackendMarket }> {
  return publicApiFetch(`/products${qs({ view: "lookup", names: JSON.stringify(names) })}`);
}

export function getFeatured(
  revalidate: number | false = 300
): Promise<{ products: ProductCard[]; market: BackendMarket }> {
  return publicApiFetch(`/products/featured?view=cards`, { revalidate });
}

export function getBestsellers(
  revalidate: number | false = 300
): Promise<{ products: ProductCard[]; market: BackendMarket }> {
  return publicApiFetch(`/products/bestsellers?view=cards`, { revalidate });
}

export function searchProducts(
  query: string
): Promise<{ results: Product[]; market: BackendMarket }> {
  return publicApiFetch(`/products/search?q=${encodeURIComponent(query)}`);
}

export function getProduct(
  slug: string,
  revalidate: number | false = 300
): Promise<{ product: Product; market: BackendMarket }> {
  return publicApiFetch(`/products/${encodeURIComponent(slug)}`, { revalidate });
}
