import type { Spice, Product, Market } from "./types";

// Demo data — the prototype's window.SPICES, typed. Used as the SSG/ISR
// fallback when the backend is unreachable (acceptance criterion §11: "demo
// fallback if the API is down"), and to seed the homepage before live wiring.
export const SPICES: Spice[] = [
  {
    slug: "ceylon-cinnamon",
    name: "Ceylon Cinnamon", latin: "Cinnamomum verum", origin: "Matale Hills, Sri Lanka",
    color: "#B5651D", base: "#C2772E", deep: "#7E481A", surface: "#F3E7D4",
    rating: 4.9, reviews: 412, badge: "Bestseller",
    usd: "$14.50", lkr: "Rs 2,150", weights: ["50g", "100g", "250g"],
  },
  {
    slug: "green-cardamom",
    name: "Green Cardamom", latin: "Elettaria cardamomum", origin: "Kandy District, Sri Lanka",
    color: "#7C9A5A", base: "#93AE6A", deep: "#566F37", surface: "#EAEFDD",
    rating: 4.8, reviews: 286, badge: "GI Certified",
    usd: "$18.00", lkr: "Rs 2,680", weights: ["50g", "100g", "250g"],
  },
  {
    slug: "whole-cloves",
    name: "Whole Cloves", latin: "Syzygium aromaticum", origin: "Kegalle, Sri Lanka",
    color: "#6B4226", base: "#7A4A2A", deep: "#462914", surface: "#EBDDCD",
    rating: 4.9, reviews: 198, badge: "In Stock",
    usd: "$11.25", lkr: "Rs 1,670", weights: ["50g", "100g", "250g"],
  },
  {
    slug: "whole-nutmeg",
    name: "Whole Nutmeg", latin: "Myristica fragrans", origin: "Sabaragamuwa, Sri Lanka",
    color: "#A9683C", base: "#B57441", deep: "#7A451F", surface: "#F0E2D2",
    rating: 4.7, reviews: 154, badge: "In Stock",
    usd: "$16.75", lkr: "Rs 2,490", weights: ["50g", "100g", "250g"],
  },
  {
    slug: "black-peppercorns",
    name: "Black Peppercorns", latin: "Piper nigrum", origin: "Hill Country, Sri Lanka",
    color: "#3C3A36", base: "#54504A", deep: "#26241F", surface: "#E6E2DA",
    rating: 4.8, reviews: 331, badge: "Bestseller",
    usd: "$9.90", lkr: "Rs 1,470", weights: ["50g", "100g", "250g"],
  },
  {
    slug: "ground-turmeric",
    name: "Ground Turmeric", latin: "Curcuma longa", origin: "Southern Province, Sri Lanka",
    color: "#D99A1C", base: "#E2A62B", deep: "#A8740F", surface: "#F6E9C9",
    rating: 4.9, reviews: 507, badge: "GI Certified",
    usd: "$8.50", lkr: "Rs 1,260", weights: ["50g", "100g", "250g"],
  },
];

// Per-spice accent palette. The backend Product carries a single `color`
// (#hex accent); the prototype's SpicePhoto placeholder needs base/deep/surface
// tones too. When a product has no curated palette we hash its slug to one of
// these so the placeholder + card stripe always read on-brand (spec §8 adapter).
const PALETTES: Array<Pick<Spice, "color" | "base" | "deep" | "surface">> = SPICES.map(
  ({ color, base, deep, surface }) => ({ color, base, deep, surface })
);

function hashIndex(key: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** Build the SpicePhoto tone set from a product's accent colour (or a hashed palette). */
export function paletteFor(slug: string, accent?: string): Pick<Spice, "color" | "base" | "deep" | "surface"> {
  const p = PALETTES[hashIndex(slug, PALETTES.length)];
  return accent ? { ...p, color: accent } : p;
}

// ----------------------------------------------------------------------------
// Adapter: live Product -> prototype Spice view model (spec §8 "Adapter note").
// Picks a representative variant per market for the headline price.
// ----------------------------------------------------------------------------
const BADGE_FROM_CERT = (p: Product): string => {
  if (p._count?.orderItems && p._count.orderItems > 200) return "Bestseller";
  if (p.certifications?.some((c) => /gi|geograph/i.test(c))) return "GI Certified";
  if (p.featured) return "Bestseller";
  return "In Stock";
};

function headlinePrice(p: Product, market: Market): string {
  const want = market === "local" ? "LKR" : "USD";
  // Prefer a 100g variant, else the cheapest matching-currency variant.
  const matching = p.variants.filter((v) => v.currency === want);
  const pool = matching.length ? matching : p.variants;
  const v =
    pool.find((x) => x.weight === 100) ??
    [...pool].sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0];
  if (!v) return market === "local" ? "Rs 0" : "$0.00";
  return market === "local"
    ? "Rs " + Math.round(parseFloat(v.price)).toLocaleString("en-US")
    : "$" + parseFloat(v.price).toFixed(2);
}

export function toSpice(p: Product): Spice {
  const pal = paletteFor(p.slug, p.color);
  const weights = Array.from(new Set(p.variants.map((v) => v.weight))).sort((a, b) => a - b);
  return {
    slug: p.slug,
    name: p.name,
    latin: p.latin || "",
    origin: p.originLabel || p.category?.name || "Sri Lanka",
    ...pal,
    rating: p.ratingAvg || 0,
    reviews: p._count?.reviews ?? p.reviews?.length ?? 0,
    badge: BADGE_FROM_CERT(p),
    usd: headlinePrice(p, "intl"),
    lkr: headlinePrice(p, "local"),
    weights: weights.length ? weights.map((w) => `${w}g`) : ["50g", "100g", "250g"],
    productId: p.id,
    variants: p.variants,
    certifications: p.certifications ?? [],
    reviewItems: p.reviews ?? [],
  };
}
