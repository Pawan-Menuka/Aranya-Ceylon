import { apiFetch } from "./http";
import type { Product } from "../types";

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
  product: Product;
}

export function getWishlist(): Promise<{ items: WishlistItem[] }> {
  return apiFetch("/wishlist", { auth: true });
}

export function addToWishlist(productId: string): Promise<{ item: WishlistItem }> {
  return apiFetch("/wishlist", { method: "POST", body: { productId }, auth: true });
}

export function removeFromWishlist(productId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE", auth: true });
}
