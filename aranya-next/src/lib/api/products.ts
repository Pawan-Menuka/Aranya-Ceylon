import { apiFetch } from "./http";
import type { Product, Paginated, BackendMarket } from "../types";

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
  revalidate: number | false = 300
): Promise<Paginated<Product>> {
  return apiFetch(`/products${qs(q as Record<string, unknown>)}`, { revalidate });
}

export function getFeatured(
  revalidate: number | false = 300
): Promise<{ products: Product[]; market: BackendMarket }> {
  return apiFetch(`/products/featured`, { revalidate });
}

export function getBestsellers(
  revalidate: number | false = 300
): Promise<{ products: Product[]; market: BackendMarket }> {
  return apiFetch(`/products/bestsellers`, { revalidate });
}

export function searchProducts(
  query: string
): Promise<{ results: Product[]; market: BackendMarket }> {
  return apiFetch(`/products/search?q=${encodeURIComponent(query)}`);
}

export function getProduct(
  slug: string,
  revalidate: number | false = 300
): Promise<{ product: Product; market: BackendMarket }> {
  return apiFetch(`/products/${encodeURIComponent(slug)}`, { revalidate });
}
