import type { Currency, Market } from "./types";

// Spec §7.2 — money is cents-aware per currency:
//   LKR = whole rupees   → "Rs 2,150"
//   USD = two decimals   → "$14.50"
// Prisma Decimal arrives as a string ("14.50"); never do float math on money
// for display — parse, format, done.

const SYMBOL: Record<Currency, string> = {
  LKR: "Rs ",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function formatMoney(amount: string | number, currency: Currency): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount || "0");
  if (currency === "LKR") {
    return SYMBOL.LKR + Math.round(n).toLocaleString("en-US");
  }
  return SYMBOL[currency] + n.toFixed(2);
}

export function currencyForMarket(market: Market): Currency {
  return market === "local" ? "LKR" : "USD";
}

/** "intl" -> "INTERNATIONAL" for the backend; the reverse for hydration. */
export function toBackendMarket(market: Market): "INTERNATIONAL" | "LOCAL" {
  return market === "local" ? "LOCAL" : "INTERNATIONAL";
}
export function fromBackendMarket(m?: string): Market {
  return m === "LOCAL" || m === "local" ? "local" : "intl";
}
