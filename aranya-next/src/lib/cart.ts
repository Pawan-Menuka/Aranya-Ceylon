import type { CartItem, Market, Spice, Variant } from "./types";
import { paletteFor } from "./spice-data";

// Cart logic (ported from cart-store.js), typed. The live backend owns the cart
// in production (GET/POST /cart via lib/api/cart.ts); this client store is the
// optimistic source of truth + offline/demo fallback, persisted to localStorage,
// and mirrors the same price maths (weight multiplier on the 100g base price).

export const CART_KEY = "aranya_cart_v1";

// weight → multiplier on the 100g base price (matches Product Detail)
export const MULT: Record<string, number> = { "50g": 0.6, "100g": 1, "250g": 2.3 };

export interface MarketConfig {
  cur: "USD" | "LKR";
  freeShip: number;
  ship: number;
  giftWrap: number;
  promo: Record<string, number>;
}

// commerce constants per market
export const CONFIG: Record<Market, MarketConfig> = {
  intl: { cur: "USD", freeShip: 60, ship: 8.5, giftWrap: 4.5, promo: { CEYLON10: 0.1 } },
  local: { cur: "LKR", freeShip: 5000, ship: 650, giftWrap: 400, promo: { CEYLON10: 0.1 } },
};

export interface CartLine {
  id: string;
  name: string;
  latin: string;
  weight: string;
  form: string;
  color: string;
  base: string;
  deep: string;
  surface: string;
  base100Usd: number;
  base100Lkr: number;
  qty: number;
  // Backend IDs — present when the item came from a live Product.
  productId?: string;
  variantId?: string;
  backendItemId?: string;
  // Real per-unit variant price for each market, captured at add time. When set,
  // these override the derived (base100 × weight-multiplier) price so the cart
  // shows and the server charges the same number (BUG-26). A market may be
  // undefined if the product has no variant in that currency.
  unitUsd?: number;
  unitLkr?: number;
}

// Resolve the backend variant that best matches a chosen weight + market.
// Mirrors the product-detail logic so cards, the buy box, and the cart agree.
export function resolveVariant(
  variants: Variant[] | undefined,
  weightStr: string,
  market: Market,
): Variant | undefined {
  if (!variants || variants.length === 0) return undefined;
  const grams = parseInt(weightStr, 10);
  const wantCurrency = market === "local" ? "LKR" : "USD";
  const byWeight = variants.filter((v) => v.weight === grams);
  const pool = byWeight.length ? byWeight : variants;
  return (
    pool.find((v) => v.currency === wantCurrency) ??
    pool.find((v) => v.market === "BOTH") ??
    pool[0]
  );
}

// Real per-unit prices for a weight in each market, drawn from live variants.
export function variantUnitPrices(
  variants: Variant[] | undefined,
  weightStr: string,
): { unitUsd?: number; unitLkr?: number } {
  const usd = resolveVariant(variants, weightStr, "intl");
  const lkr = resolveVariant(variants, weightStr, "local");
  return {
    unitUsd: usd && usd.currency === "USD" ? parseFloat(usd.price) : undefined,
    unitLkr: lkr && lkr.currency === "LKR" ? parseFloat(lkr.price) : undefined,
  };
}

export interface CartState {
  items: CartLine[];
  giftWrap: boolean;
  giftNote: string;
  promo: string;
}

export interface Totals {
  market: Market;
  currency: "USD" | "LKR";
  subtotal: number;
  discount: number;
  discountRate: number;
  gift: number;
  ship: number;
  freeShip: boolean;
  freeShipThreshold: number;
  remainingToFree: number;
  total: number;
  fmt: (n: number) => string;
}

export function num(p: string | number): number {
  return typeof p === "number" ? p : parseFloat(String(p).replace(/[^0-9.]/g, "")) || 0;
}

export function fmt(n: number, market: Market): string {
  if (market === "local") return "Rs " + Math.round(n).toLocaleString("en-US");
  return "$" + (Math.round(n * 100) / 100).toFixed(2);
}

export function unitPrice(item: CartLine, market: Market): number {
  // Prefer the real variant price captured at add time (BUG-26); fall back to
  // the derived 100g-base × weight-multiplier only for demo/offline lines that
  // never resolved a live variant.
  const real = market === "local" ? item.unitLkr : item.unitUsd;
  if (real != null) return real;
  const base = market === "local" ? item.base100Lkr : item.base100Usd;
  return base * (MULT[item.weight] || 1);
}

export function linePrice(item: CartLine, market: Market): number {
  return unitPrice(item, market) * item.qty;
}

export function computeTotals(state: CartState, market: Market): Totals {
  const cfg = CONFIG[market];
  const subtotal = state.items.reduce((s, i) => s + unitPrice(i, market) * i.qty, 0);
  const discountRate = state.promo && cfg.promo[state.promo] ? cfg.promo[state.promo] : 0;
  const discount = subtotal * discountRate;
  const afterDisc = subtotal - discount;
  const gift = state.giftWrap ? cfg.giftWrap : 0;
  const freeShip = afterDisc >= cfg.freeShip || state.items.length === 0;
  const ship = freeShip ? 0 : cfg.ship;
  const total = afterDisc + gift + ship;
  return {
    market,
    currency: cfg.cur,
    subtotal,
    discount,
    discountRate,
    gift,
    ship,
    freeShip,
    freeShipThreshold: cfg.freeShip,
    remainingToFree: Math.max(0, cfg.freeShip - afterDisc),
    total,
    fmt: (n: number) => fmt(n, market),
  };
}

// Build a cart line from a Spice + chosen options (mirrors AranyaCart.add).
// `market` is the shopper's active market: it selects which variant the backend
// add targets. Real per-market prices are captured for both currencies so the
// displayed line matches the charged amount regardless of later market switches.
export function lineFromSpice(
  spice: Spice,
  weight = "100g",
  form = "Whole",
  qty = 1,
  market: Market = "intl",
  backendIds?: { productId: string; variantId: string },
): CartLine {
  const prices = variantUnitPrices(spice.variants, weight);
  const resolved = resolveVariant(spice.variants, weight, market);
  const productId = backendIds?.productId ?? spice.productId;
  const variantId = backendIds?.variantId ?? resolved?.id;
  // Identity: a line bound to a backend variant is keyed by that variant so the
  // same variant collapses to a single line (and a single backendItemId) rather
  // than splitting by grind — which the backend can't represent (BUG-19b).
  // Demo/offline lines keep the descriptive key.
  const id = variantId ? `v:${variantId}` : `${spice.name}|${weight}|${form}`;
  return {
    id,
    name: spice.name,
    latin: spice.latin || "",
    weight,
    form,
    color: spice.color,
    base: spice.base,
    deep: spice.deep,
    surface: spice.surface,
    base100Usd: num(spice.usd),
    base100Lkr: num(spice.lkr),
    qty,
    ...(productId ? { productId } : {}),
    ...(variantId ? { variantId } : {}),
    ...prices,
  };
}

// Build a cart line from an authoritative server cart item. Used on hydration so
// the server cart is the source of truth: items placed on another device/session
// (or after localStorage was cleared) still appear and check out (BUG-29). The
// variant carries the real price + currency, so the line prices itself exactly.
export function lineFromServerItem(item: CartItem): CartLine {
  const pal = paletteFor(item.product.slug, item.product.color);
  const price = parseFloat(item.variant.price) || 0;
  const isLkr = item.variant.currency === "LKR";
  return {
    id: `v:${item.variant.id}`,
    name: item.product.name,
    latin: "",
    weight: `${item.variant.weight}g`,
    form: "Whole",
    ...pal,
    base100Usd: 0,
    base100Lkr: 0,
    qty: item.quantity,
    productId: item.product.id,
    variantId: item.variant.id,
    backendItemId: item.id,
    unitUsd: isLkr ? undefined : price,
    unitLkr: isLkr ? price : undefined,
  };
}
