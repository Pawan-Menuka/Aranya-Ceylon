import { CATALOG, parsePrice } from "./catalog-data";
import type { Market, Variant } from "./types";

// Gift Sets dataset (ported from gifts-data.js). Curated bundles drawn from the
// CATALOG range. Each set carries colour fields (lead spice) so GiftBox / cart
// thumbnails work, plus a price in both markets. `contents` reference CATALOG
// product names; the page computes an à-la-carte comparison (at the stated jar
// size) to show the saving.

export interface GiftSet {
  id: string;
  name: string;
  featured: boolean;
  tagline: string;
  blurb: string;
  badge: string | null;
  jar: string;
  color: string;
  base: string;
  deep: string;
  surface: string;
  usd: string;
  lkr: string;
  contents: string[];
  // optional fields cart line maths reads off a Spice — gift sets satisfy the
  // shape lineFromSpice needs (name, colour fields, usd/lkr).
  latin?: string;
  // Backend linkage to the gift's DRAFT backing product + its per-market
  // variants. Present when served live (fetchGifts); lets the gift be added to
  // the real server cart and checked out like any product. Absent for the
  // static demo GIFTS fallback (those stay localStorage-only).
  productId?: string;
  variants?: Variant[];
}

export interface GiftOccasion {
  name: string;
  note: string;
  set: string;
  slot: string;
  color: string;
  deep: string;
}

// occasion → recommended set
export const GIFT_OCCASIONS: GiftOccasion[] = [
  { name: "Housewarming", note: "Stock a new kitchen", set: "classic", slot: "occ-housewarming", color: "#0F6E56", deep: "#0B5343" },
  { name: "Festive & holidays", note: "Warmth for the season", set: "baker", slot: "occ-festive", color: "#9A2C2C", deep: "#6E1E1E" },
  { name: "Thank you", note: "A small, lovely gesture", set: "taster", slot: "occ-thankyou", color: "#BA7517", deep: "#8A560F" },
  { name: "For the cook", note: "Serious kit for keen hands", set: "curry", slot: "occ-cook", color: "#6E3F16", deep: "#4A2A0F" },
];

// ---------------- price helpers (ported from gifts.jsx) ----------------
const GIFT_JAR_MULT: Record<string, number> = { "50g": 0.6, "100g": 1, "250g": 2.3 };

export function giftCatalog(name: string) {
  return CATALOG.find((p) => p.name === name);
}

export function giftPrice(set: GiftSet, market: Market): string {
  return market === "local" ? set.lkr : set.usd;
}

export function giftFmt(n: number, market: Market): string {
  return market === "local" ? "Rs " + Math.round(n).toLocaleString("en-US") : "$" + n.toFixed(2);
}

export function giftAlaCarte(set: GiftSet, market: Market): number {
  const mult = GIFT_JAR_MULT[set.jar] || 1;
  let sum = 0;
  set.contents.forEach((nm) => {
    const p = giftCatalog(nm);
    if (p) sum += parsePrice(market === "local" ? p.lkr : p.usd) * mult;
  });
  return sum;
}

export function giftSavePct(set: GiftSet, market: Market): number {
  const alc = giftAlaCarte(set, market);
  const price = parsePrice(giftPrice(set, market));
  if (!alc || alc <= price) return 0;
  return Math.round((1 - price / alc) * 100);
}
