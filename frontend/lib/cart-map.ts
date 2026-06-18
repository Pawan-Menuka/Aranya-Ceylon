import { formatPrice } from "./format";
import type { Market } from "./market";
import type { ApiCart, CartView } from "./api/types";

// Inlined (not imported from ./market) so this pure module never pulls in
// next/headers — it's imported by client components.
const currencyForMarket = (m: Market): "LKR" | "USD" => (m === "LOCAL" ? "LKR" : "USD");

// Brand palette fallback (matches the catalog adapter) for line-item accents.
const PALETTE = ["#B5651D", "#7C9A5A", "#6B4226", "#A9683C", "#3C3A36", "#D99A1C"];
function hashIdx(str: string, n: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % n;
}

// Backend cart → client CartView. Money in integer cents (no float drift);
// formatted only for display. Pure (safe to import on client or server).
export function mapCart(cart: ApiCart | null | undefined, market: Market): CartView {
  const currency = currencyForMarket(market);
  const items = (cart?.items ?? []).map((it) => {
    const unitCents = Math.round(Number(it.variant.price) * 100);
    const lineCents = unitCents * it.quantity;
    return {
      id: it.id,
      name: it.product.name,
      slug: it.product.slug,
      weight: it.variant.weight,
      qty: it.quantity,
      unitPrice: formatPrice(unitCents / 100, currency),
      lineTotal: formatPrice(lineCents / 100, currency),
      imageUrl: it.product.images?.[0]?.url ?? null,
      color: PALETTE[hashIdx(it.product.slug || it.product.name, PALETTE.length)]!,
      _lineCents: lineCents,
    };
  });

  const subtotalCents = items.reduce((sum, i) => sum + (i as { _lineCents: number })._lineCents, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return {
    items: items.map(({ _lineCents, ...rest }) => rest),
    count,
    subtotal: formatPrice(subtotalCents / 100, currency),
    subtotalCents,
    currency,
  };
}
