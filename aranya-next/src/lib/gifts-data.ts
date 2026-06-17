import { CATALOG, parsePrice } from "./catalog-data";
import type { Market } from "./types";

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
}

export const GIFTS: GiftSet[] = [
  {
    id: "classic", name: "The Ceylon Classic", featured: true,
    tagline: "The four cornerstones of a Sri Lankan pantry",
    blurb: "Hand-rolled cinnamon, hill-country cardamom, Kegalle cloves and estate peppercorns — the spices every Ceylon kitchen is built on, presented in our signature ribboned box.",
    badge: "Bestselling gift", jar: "50g",
    color: "#B5651D", base: "#C2772E", deep: "#7E481A", surface: "#F3E7D4",
    usd: "$28.50", lkr: "Rs 4,250",
    contents: ["Ceylon Cinnamon Quills", "Green Cardamom Pods", "Whole Cloves", "Black Peppercorns"],
  },
  {
    id: "curry", name: "The Curry Night", featured: false,
    tagline: "Everything for a proper black-curry table",
    blurb: "Our roasted Ceylon curry powder and Kandyan garam masala, with turmeric and ginger to round the pot — a full night's cooking, boxed.",
    badge: null, jar: "50g",
    color: "#9A5B22", base: "#AC6C2D", deep: "#6E3F16", surface: "#EFE2CE",
    usd: "$25.50", lkr: "Rs 3,800",
    contents: ["Ceylon Curry Powder", "Kandyan Garam Masala", "Ground Turmeric", "Ground Ginger"],
  },
  {
    id: "baker", name: "The Baker's Box", featured: false,
    tagline: "Warm, sweet spices for the oven",
    blurb: "Ground cinnamon, whole nutmeg, delicate mace and green cardamom — the quiet backbone of every good bake, from spiced loaves to festive puddings.",
    badge: "New", jar: "50g",
    color: "#C0531F", base: "#D06A2E", deep: "#8F3A14", surface: "#F4E0D2",
    usd: "$36.00", lkr: "Rs 5,450",
    contents: ["Ceylon Cinnamon, Ground", "Whole Nutmeg", "Mace Blades", "Green Cardamom Pods"],
  },
  {
    id: "connoisseur", name: "The Connoisseur", featured: false,
    tagline: "Six single-origin spices, at their finest",
    blurb: "A larger keepsake box for the serious cook — six of our most prized lots, from rare mace blades to the bestselling roasted curry powder, each traceable to its estate.",
    badge: "Limited", jar: "50g",
    color: "#6B4226", base: "#7A4A2A", deep: "#462914", surface: "#EBDDCD",
    usd: "$49.00", lkr: "Rs 7,400",
    contents: ["Ceylon Cinnamon Quills", "Green Cardamom Pods", "Mace Blades", "Whole Nutmeg", "Black Peppercorns", "Ceylon Curry Powder"],
  },
  {
    id: "taster", name: "The Taster", featured: false,
    tagline: "A first taste of the forest",
    blurb: "Three icons to begin with — sweet Ceylon cinnamon, golden turmeric and hill-country pepper. The easiest way to send someone down the rabbit hole.",
    badge: null, jar: "50g",
    color: "#D99A1C", base: "#E2A62B", deep: "#A8740F", surface: "#F6E9C9",
    usd: "$17.50", lkr: "Rs 2,600",
    contents: ["Ceylon Cinnamon Quills", "Ground Turmeric", "Black Peppercorns"],
  },
];

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
