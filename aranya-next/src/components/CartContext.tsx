"use client";

import * as React from "react";
import type { Spice } from "@/lib/types";
import {
  CART_KEY, CONFIG, type CartLine, type CartState, type Totals,
  computeTotals, fmt as fmtMoney, lineFromSpice, linePrice as linePriceOf, unitPrice as unitPriceOf,
} from "@/lib/cart";
import { getCart, addCartItem, updateCartItem, removeCartItem, applyCoupon as apiApplyCoupon } from "@/lib/api/cart";
import type { CartItem } from "@/lib/types";
import { useMarket } from "./MarketContext";

// Client cart store as a typed React context (ports cart-store.js + the useCart
// hook). Persists to localStorage; currency/totals derive from the active market
// (MarketContext). Also owns the cart-drawer + sign-in-modal open state so any
// component can trigger them. In production these mutations also POST to /cart
// (lib/api/cart.ts); here they resolve locally and stay optimistic.

interface CartCtx {
  items: CartLine[];
  count: number;
  giftWrap: boolean;
  giftNote: string;
  promo: string;
  totals: Totals;
  fmt: (n: number) => string;
  unitPrice: (i: CartLine) => number;
  linePrice: (i: CartLine) => number;
  config: () => (typeof CONFIG)["intl"];
  add: (spice: Spice, weight?: string, form?: string, qty?: number, backendIds?: { productId: string; variantId: string }) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setGiftWrap: (b: boolean) => void;
  setGiftNote: (s: string) => void;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
  // UI
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  signInOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
}

const Ctx = React.createContext<CartCtx | null>(null);

const EMPTY: CartState = { items: [], giftWrap: false, giftNote: "", promo: "" };

function loadState(): CartState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartLine[];
    return { ...EMPTY, items: Array.isArray(items) ? items : [] };
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { market } = useMarket();
  const [state, setState] = React.useState<CartState>(EMPTY);
  const [open, setOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  // `hydrated` becomes true after the first localStorage read; used to gate
  // persistence so the pre-hydration EMPTY state never overwrites the store.
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage on mount, then reconcile backendItemIds with the
  // server cart (which also causes the backend to issue the guestCartToken cookie
  // via the BFF so subsequent checkout calls can find the right cart).
  React.useEffect(() => {
    let mounted = true;
    const loaded = loadState();
    setState(loaded);
    setHydrated(true);

    getCart()
      .then(({ cart: bc }) => {
        if (!mounted || !bc?.items?.length) return;
        setState((s) => ({
          ...s,
          items: s.items.map((localItem) => {
            if (localItem.backendItemId) return localItem;
            const bi = (bc.items as CartItem[]).find(
              (b) => b.variant?.id === localItem.variantId
            );
            return bi ? { ...localItem, backendItemId: bi.id } : localItem;
          }),
        }));
      })
      .catch(() => { /* offline — localStorage-only mode */ });

    return () => { mounted = false; };
  }, []);

  // Persist items to localStorage only after the initial hydration so the
  // pre-hydration empty state never blanks out a previously saved cart.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(state.items));
    } catch {
      /* ignore quota / disabled storage */
    }
  }, [state.items, hydrated]);

  // open the drawer if arriving via /cart → /products?cart=1
  React.useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("cart") === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const api = React.useMemo<CartCtx>(() => {
    const totals = computeTotals(state, market);
    return {
      items: state.items,
      count: state.items.reduce((n, i) => n + i.qty, 0),
      giftWrap: state.giftWrap,
      giftNote: state.giftNote,
      promo: state.promo,
      totals,
      fmt: (n) => fmtMoney(n, market),
      unitPrice: (i) => unitPriceOf(i, market),
      linePrice: (i) => linePriceOf(i, market),
      config: () => CONFIG[market],
      add: (spice, weight = "100g", form, qty = 1, backendIds) => {
        const line = lineFromSpice(spice, weight, form || "Whole", qty, backendIds);
        setState((s) => {
          const existing = s.items.find((i) => i.id === line.id);
          const items = existing
            ? s.items.map((i) => (i.id === line.id ? { ...i, qty: i.qty + qty } : i))
            : [...s.items, line];
          return { ...s, items };
        });
        // Sync to backend when we have real IDs; revert on failure.
        if (backendIds) {
          addCartItem({ productId: backendIds.productId, variantId: backendIds.variantId, quantity: qty })
            .then((res) => {
              if (res?.item?.id) {
                setState((s) => ({
                  ...s,
                  items: s.items.map((i) =>
                    i.id === line.id ? { ...i, backendItemId: res.item.id } : i
                  ),
                }));
              }
            })
            .catch(() => {
              // Backend rejected (e.g. out-of-stock) — remove the optimistic line.
              setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== line.id) }));
            });
        }
      },
      inc: (id) => {
        setState((s) => {
          const item = s.items.find((i) => i.id === id);
          const prevQty = item?.qty ?? 1;
          if (item?.backendItemId) {
            updateCartItem(item.backendItemId, prevQty + 1).catch(() => {
              setState((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, qty: prevQty } : i)) }));
            });
          }
          return { ...s, items: s.items.map((i) => (i.id === id ? { ...i, qty: prevQty + 1 } : i)) };
        });
      },
      dec: (id) => {
        setState((s) => {
          const item = s.items.find((i) => i.id === id);
          const prevQty = item?.qty ?? 1;
          const newQty = Math.max(1, prevQty - 1);
          if (item?.backendItemId) {
            updateCartItem(item.backendItemId, newQty).catch(() => {
              setState((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, qty: prevQty } : i)) }));
            });
          }
          return { ...s, items: s.items.map((i) => (i.id === id ? { ...i, qty: newQty } : i)) };
        });
      },
      setQty: (id, qty) => {
        setState((s) => {
          const item = s.items.find((i) => i.id === id);
          const prevQty = item?.qty ?? 1;
          const newQty = Math.max(1, qty);
          if (item?.backendItemId) {
            updateCartItem(item.backendItemId, newQty).catch(() => {
              setState((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, qty: prevQty } : i)) }));
            });
          }
          return { ...s, items: s.items.map((i) => (i.id === id ? { ...i, qty: newQty } : i)) };
        });
      },
      remove: (id) => {
        setState((s) => {
          const item = s.items.find((i) => i.id === id);
          if (item?.backendItemId) {
            removeCartItem(item.backendItemId).catch(() => {
              // Restore the item if the backend remove failed.
              setState((prev) => {
                if (prev.items.some((i) => i.id === id)) return prev;
                return { ...prev, items: [...prev.items, item] };
              });
            });
          }
          return { ...s, items: s.items.filter((i) => i.id !== id) };
        });
      },
      clear: () => setState(EMPTY),
      setGiftWrap: (b) => setState((s) => ({ ...s, giftWrap: b })),
      setGiftNote: (str) => setState((s) => ({ ...s, giftNote: str })),
      applyPromo: (code) => {
        const c = (code || "").trim().toUpperCase();
        if (CONFIG[market].promo[c]) {
          setState((s) => ({ ...s, promo: c }));
          apiApplyCoupon(code).catch(() => {});
          return true;
        }
        return false;
      },
      clearPromo: () => setState((s) => ({ ...s, promo: "" })),
      open,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      signInOpen,
      openSignIn: () => setSignInOpen(true),
      closeSignIn: () => setSignInOpen(false),
    };
  }, [state, market, open, signInOpen]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
