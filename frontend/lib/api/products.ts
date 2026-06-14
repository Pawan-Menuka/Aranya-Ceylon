import { cache } from "react";
import { apiFetch } from "./client";
import { apiUrl } from "../env";
import { formatPrice } from "../format";
import type { Market } from "../market";
import { currencyForMarket } from "../market";
import { DEMO_PRODUCTS } from "../demo-data";
import type {
  ApiProduct,
  ApiVariant,
  ProductListResponse,
  ProductView,
  ProductDetailView,
  SingleProductResponse,
} from "./types";

// Brand palette fallback for products with no `color` (ported from api.js).
const PALETTE = ["#B5651D", "#7C9A5A", "#6B4226", "#A9683C", "#3C3A36", "#D99A1C"];
function hashIdx(str: string, n: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % n;
}

const CERT_LABEL: Record<string, string> = {
  ORGANIC: "Organic",
  CEYLON_GI: "GI Certified",
  GI: "GI Certified",
  FAIRTRADE: "Fair Trade",
  FAIR_TRADE: "Fair Trade",
};
function badgeFor(p: ApiProduct): string | null {
  for (const c of p.certifications ?? []) if (CERT_LABEL[c]) return CERT_LABEL[c];
  if ((p.certifications ?? []).includes("BESTSELLER") || p.featured) return "Bestseller";
  return null;
}

// Prefer the 100g variant in the active currency; else smallest in-currency; else any.
function pickVariant(variants: ApiVariant[], currency: "LKR" | "USD"): ApiVariant | null {
  const inCur = variants.filter((v) => v.currency === currency);
  const pool = inCur.length ? inCur : variants;
  if (!pool.length) return null;
  return pool.find((v) => v.weight === 100) ?? [...pool].sort((a, b) => a.weight - b.weight)[0]!;
}

// Backend Product → ProductView the grid/cards consume.
export function mapProduct(p: ApiProduct, market: Market): ProductView {
  const currency = currencyForMarket(market);
  const variant = pickVariant(p.variants ?? [], currency);
  const weights = [...new Set((p.variants ?? []).map((v) => v.weight))].sort((a, b) => a - b);
  // In-currency variants for the card's weight picker + add-to-cart.
  const variants = (p.variants ?? [])
    .filter((v) => v.currency === currency)
    .sort((a, b) => a.weight - b.weight)
    .map((v) => ({
      id: v.id,
      weight: v.weight,
      label: `${v.weight}g`,
      price: formatPrice(v.price, currency),
      priceAmount: Number(v.price),
      stock: v.stock,
      sku: v.sku,
    }));
  return {
    variants,
    id: p.id,
    slug: p.slug,
    name: p.name,
    latin: p.latin ?? "",
    origin: p.originLabel ?? "Ceylon, Sri Lanka",
    rating: p.ratingAvg ?? 0,
    color: p.color ?? PALETTE[hashIdx(p.slug || p.name, PALETTE.length)]!,
    badge: badgeFor(p),
    price: variant ? formatPrice(variant.price, currency) : "",
    currency,
    weights: weights.length ? weights.map((w) => `${w}g`) : ["50g", "100g", "250g"],
    category: p.category?.name ?? "Spices",
    featured: !!p.featured,
    imageUrl: p.images?.[0]?.url ?? null,
  };
}

export interface CatalogResult {
  items: ProductView[];
  market: Market;
  live: boolean; // false = served from demo fallback
}

// Backend single Product → detail view. Variants are filtered to the active
// currency and sorted by weight; reviews mapped for display.
export function mapProductDetail(p: ApiProduct, market: Market): ProductDetailView {
  const currency = currencyForMarket(market);
  const variants = (p.variants ?? [])
    .filter((v) => v.currency === currency)
    .sort((a, b) => a.weight - b.weight)
    .map((v) => ({
      id: v.id,
      weight: v.weight,
      label: `${v.weight}g`,
      price: formatPrice(v.price, currency),
      priceAmount: Number(v.price),
      stock: v.stock,
      sku: v.sku,
    }));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    latin: p.latin ?? "",
    origin: p.originLabel ?? "Ceylon, Sri Lanka",
    description: p.description ?? "",
    color: p.color ?? PALETTE[hashIdx(p.slug || p.name, PALETTE.length)]!,
    category: p.category?.name ?? "Spices",
    certifications: p.certifications ?? [],
    badge: badgeFor(p),
    rating: p.ratingAvg ?? 0,
    reviewCount: p._count?.reviews ?? (p.reviews?.length ?? 0),
    currency,
    variants,
    images: (p.images ?? []).map((img) => ({ url: img.url, alt: img.altText ?? p.name })),
    reviews: (p.reviews ?? []).map((r) => ({
      id: r.id,
      author: r.user?.name ?? "Verified buyer",
      rating: r.rating,
      title: r.title,
      body: r.body,
      date: r.createdAt,
    })),
  };
}

// Wrapped in React cache() so generateMetadata and the page component share a
// single fetch per request (apiFetch is no-store, so fetch-level dedup is off).
export const getProductBySlug = cache(
  async (slug: string): Promise<{ product: ProductDetailView; market: Market } | null> => {
    try {
      const res = await apiFetch(`/products/${encodeURIComponent(slug)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SingleProductResponse;
      if (!data.product) return null;
      return { product: mapProductDetail(data.product, data.market), market: data.market };
    } catch (err) {
      console.warn(`[product ${slug}] fetch failed:`, (err as Error).message);
      return null;
    }
  },
);

// ── Spice → product resolution (for recipe "shop the spices" links) ───────
// Cookie-free + revalidate-cached so callers (the static recipe pages) stay
// statically renderable — names/slugs are market-independent, so no x-market
// forwarding is needed.
const CATALOG_REVALIDATE = 600;
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export const getProductNameSlugs = cache(async (): Promise<{ name: string; slug: string }[]> => {
  try {
    const res = await fetch(apiUrl("/products?limit=200"), {
      headers: { Accept: "application/json" },
      next: { revalidate: CATALOG_REVALIDATE },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ProductListResponse;
    return (data.items ?? []).map((p) => ({ name: p.name, slug: p.slug }));
  } catch (err) {
    console.warn("[catalog slug map] fetch failed:", (err as Error).message);
    return [];
  }
});

// Best-effort resolve a recipe's spice name to a real product slug. Exact
// normalized match first, then the longest substring match either direction;
// null when nothing in the live catalog matches (caller falls back to /products).
export async function resolveSpiceSlug(spiceName: string): Promise<string | null> {
  const products = await getProductNameSlugs();
  if (!products.length) return null;
  const target = norm(spiceName);
  const exact = products.find((p) => norm(p.name) === target);
  if (exact) return exact.slug;
  let best: { slug: string; len: number } | null = null;
  for (const p of products) {
    const n = norm(p.name);
    if (n.length < 4) continue; // avoid matching trivially short names
    if ((target.includes(n) || n.includes(target)) && (!best || n.length > best.len)) {
      best = { slug: p.slug, len: n.length };
    }
  }
  return best?.slug ?? null;
}

export async function getProducts(params: { limit?: number } = {}): Promise<CatalogResult> {
  const qs = params.limit ? `?limit=${params.limit}` : "";
  try {
    const res = await apiFetch(`/products${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ProductListResponse;
    return {
      items: (data.items ?? []).map((p) => mapProduct(p, data.market)),
      market: data.market,
      live: true,
    };
  } catch (err) {
    console.warn("[catalog] falling back to demo data:", (err as Error).message);
    return { items: DEMO_PRODUCTS, market: "INTERNATIONAL", live: false };
  }
}
