// Currency formatting. Backend variant prices arrive as Decimal strings
// (e.g. "14.50"). LKR shows whole rupees ("Rs 2,150"); USD shows cents.
export function formatPrice(value: string | number | null | undefined, currency: string): string {
  if (value == null) return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  if (currency === "LKR") {
    return "Rs " + Math.round(n).toLocaleString("en-US");
  }
  return "$" + n.toFixed(2);
}
