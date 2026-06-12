import { apiFetch } from "./client";
import { formatPrice } from "../format";
import type { Market } from "../market";
import { currencyForMarket } from "../market";
import { DEMO_PRODUCTS } from "../demo-data";
import type { ApiProduct, ApiVariant, ProductListResponse, ProductView } from "./types";

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
  return {
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
