import { apiFetch } from "./http";
import type { Cart, BackendMarket } from "../types";

export interface ServerTotals {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  giftCents: number;
  totalCents: number;
  subtotal: number;
  shippingCost: number;
  discount: number;
  gift: number;
  total: number;
  shippingLabel: string;
  currency: string;
  couponId: string | null;
}

// Spec §6 — /cart (optionalAuth: works for guests + users). Browser-side calls
// go through the BFF so the guestCartToken / auth cookies ride along.
export function getCart(): Promise<{ cart: Cart; market: BackendMarket }> {
  return apiFetch(`/cart`, { auth: true });
}

/** Passive storefront restore: no cart creation, cookie or recovery activity. */
export function bootstrapCart(options: { signal?: AbortSignal } = {}): Promise<{ cart: Cart | null; market: BackendMarket }> {
  return apiFetch(`/cart/bootstrap`, { auth: true, ...options });
}

// A first guest add must finish setting its HttpOnly cookie before the next
// mutation sends a request. Also keeps absolute quantity/remove writes in order.
let mutationTail: Promise<unknown> = Promise.resolve();
let drainProvider: (() => Promise<unknown>) | null = null;
export function registerCartMutationDrain(drain: () => Promise<unknown>): () => void {
  drainProvider = drain;
  return () => { if (drainProvider === drain) drainProvider = null; };
}
function mutate<T>(work: () => Promise<T>): Promise<T> {
  const result = mutationTail.then(work);
  mutationTail = result.catch(() => {});
  return result;
}
export async function waitForCartMutations(): Promise<void> {
  // Include provider operations that have been queued but have not called the
  // API yet. Auth must drain this while its current session is still ready.
  for (;;) {
    const providerTail = drainProvider?.();
    await providerTail;
    const apiTail = mutationTail;
    await apiTail;
    if (mutationTail === apiTail && drainProvider?.() === providerTail) return;
  }
}

export function addCartItem(input: {
  productId: string;
  variantId: string;
  quantity: number;
}): Promise<{ item: { id: string } }> {
  return mutate(() => apiFetch(`/cart/items`, { method: "POST", body: input, auth: true }));
}

export function updateCartItem(itemId: string, quantity: number): Promise<{ item: { id: string } }> {
  return mutate(() => apiFetch(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: { quantity },
    auth: true,
  }));
}

export function applyCoupon(code: string): Promise<{ discount: unknown }> {
  return mutate(() => apiFetch(`/cart/coupon`, { method: "POST", body: { code }, auth: true }));
}

/** Remove a previously applied coupon (Storefront audit #2). */
export function removeCoupon(): Promise<void> {
  return mutate(() => apiFetch(`/cart/coupon`, { method: "DELETE", auth: true }));
}

export function removeCartItem(itemId: string): Promise<void> {
  return mutate(() => apiFetch(`/cart/items/${encodeURIComponent(itemId)}`, { method: "DELETE", auth: true }));
}

/** Empty the whole server cart (store switch / explicit clear) — BUG-19c. */
export function clearServerCart(): Promise<void> {
  return mutate(() => apiFetch(`/cart`, { method: "DELETE", auth: true }));
}

/** Merge the guest cart into the user cart on login (spec §7.4). */
export function mergeCart(): Promise<{ ok: true }> {
  return apiFetch(`/cart/merge`, { method: "POST", auth: true });
}

/** Server-computed totals for the checkout order summary (authoritative). */
export function getCartTotals(
  shippingMethod: "STANDARD" | "EXPRESS" = "STANDARD",
  giftWrap = false,
): Promise<{ totals: ServerTotals }> {
  return apiFetch(
    `/cart/totals?shippingMethod=${shippingMethod}&giftWrap=${giftWrap}`,
    { auth: true },
  );
}
