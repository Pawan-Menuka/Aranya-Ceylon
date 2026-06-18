import type { Market, Spice } from "./types";

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
export function lineFromSpice(
  spice: Spice,
  weight = "100g",
  form = "Whole",
  qty = 1,
  backendIds?: { productId: string; variantId: string },
): CartLine {
  return {
    id: `${spice.name}|${weight}|${form}`,
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
    ...(backendIds ?? {}),
  };
}
