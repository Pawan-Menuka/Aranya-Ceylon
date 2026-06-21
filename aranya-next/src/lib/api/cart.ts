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

export function addCartItem(input: {
  productId: string;
  variantId: string;
  quantity: number;
}): Promise<{ item: { id: string } }> {
  return apiFetch(`/cart/items`, { method: "POST", body: input, auth: true });
}

export function updateCartItem(itemId: string, quantity: number): Promise<{ item: { id: string } }> {
  return apiFetch(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: { quantity },
    auth: true,
  });
}

export function applyCoupon(code: string): Promise<{ discount: unknown }> {
  return apiFetch(`/cart/coupon`, { method: "POST", body: { code }, auth: true });
}

export function removeCartItem(itemId: string): Promise<void> {
  return apiFetch(`/cart/items/${encodeURIComponent(itemId)}`, { method: "DELETE", auth: true });
}

/** Merge the guest cart into the user cart on login (spec §7.4). */
export function mergeCart(): Promise<{ cart: Cart }> {
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
