"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { mapCart } from "@/lib/cart-map";
import type { CartView } from "@/lib/api/types";
import type { Market } from "@/lib/market";

interface AddArgs { productId: string; variantId: string; quantity?: number }
interface MutationResult { ok: boolean; error?: string }

interface CartContextValue {
  cart: CartView | null;
  count: number;
  loading: boolean;
  addItem: (args: AddArgs) => Promise<MutationResult>;
  updateQty: (itemId: string, quantity: number) => Promise<MutationResult>;
  removeItem: (itemId: string) => Promise<MutationResult>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { cart: Parameters<typeof mapCart>[0]; market: Market };
      setCart(mapCart(data.cart, data.market));
    } catch {
      setCart((prev) => prev ?? { items: [], count: 0, subtotal: "", subtotalCents: 0, currency: "USD" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount — also establishes the guestCartToken cookie via the
  // GET route handler before any add (the backend only sets it on GET /cart).
  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    void refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (url: string, method: string, body: unknown): Promise<MutationResult> => {
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? `HTTP ${res.status}` };
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [refresh],
  );

  const addItem = useCallback(
    (args: AddArgs) => mutate("/api/cart/items", "POST", { quantity: 1, ...args }),
    [mutate],
  );
  const updateQty = useCallback(
    (itemId: string, quantity: number) => mutate(`/api/cart/items/${itemId}`, "PATCH", { quantity }),
    [mutate],
  );
  const removeItem = useCallback((itemId: string) => updateQty(itemId, 0), [updateQty]);

  return (
    <CartContext.Provider
      value={{ cart, count: cart?.count ?? 0, loading, addItem, updateQty, removeItem, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
