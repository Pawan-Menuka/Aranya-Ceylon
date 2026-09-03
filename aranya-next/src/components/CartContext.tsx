"use client";

import * as React from "react";
import type { Spice } from "@/lib/types";
import {
  CART_KEY, CONFIG, type CartLine, type CartState, type Totals,
  computeTotals, fmt as fmtMoney, lineFromSpice, lineFromServerItem,
  linePrice as linePriceOf, unitPrice as unitPriceOf,
} from "@/lib/cart";
import { getCart, addCartItem, updateCartItem, removeCartItem, clearServerCart, applyCoupon as apiApplyCoupon, removeCoupon as apiRemoveCoupon } from "@/lib/api/cart";
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
  applyPromo: (code: string) => Promise<boolean>;
  clearPromo: () => void;
  // True right after a store switch emptied a non-empty basket (FLOW-04); the
  // drawer shows a one-line notice, dismissed on next add or via dismiss.
  marketCleared: boolean;
  dismissMarketCleared: () => void;
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
  const [marketCleared, setMarketCleared] = React.useState(false);
  // Always-current mirrors so the market-change effect can read the latest cart
  // and previous market without re-running on every item change.
  const itemsRef = React.useRef(state.items);
  itemsRef.current = state.items;
  const prevMarketRef = React.useRef(market);

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
        const serverItems = bc.items as CartItem[];
        setState((s) => {
          // 1) Reconcile: attach backendItemId to local lines that match a server
          //    line by variant (keyed by variantId, not grind — BUG-19b).
          const reconciled = s.items.map((localItem) => {
            if (localItem.backendItemId) return localItem;
            const bi = serverItems.find((b) => b.variant?.id === localItem.variantId);
            return bi ? { ...localItem, backendItemId: bi.id } : localItem;
          });
          // 2) Server is the source of truth: append any server line not already
          //    represented locally so items survive a cleared localStorage or a
          //    different device, and the empty-cart guard reflects reality (BUG-29).
          const known = new Set(
            reconciled.map((i) => i.backendItemId).filter(Boolean) as string[],
          );
          const missing = serverItems
            .filter((b) => !known.has(b.id))
            .map((b) => lineFromServerItem(b));
          return { ...s, items: [...reconciled, ...missing] };
        });
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

  // Store switch (USD ↔ LKR) with items in the basket: a cart is single-currency
  // (its lines are bound to one store's variants, and checkout rejects cross-store
  // items), so empty it — local + server — and flag a notice, rather than strand
  // the shopper at a checkout 409 (FLOW-04). Guarded so it never fires on the
  // initial hydration, only on a genuine market change.
  React.useEffect(() => {
    if (!hydrated) { prevMarketRef.current = market; return; }
    if (prevMarketRef.current === market) return;
    prevMarketRef.current = market;
    if (itemsRef.current.length === 0) return;
    setState((s) => ({ ...EMPTY, giftWrap: s.giftWrap, giftNote: s.giftNote }));
    clearServerCart().catch(() => { /* best-effort */ });
    setMarketCleared(true);
    setOpen(true); // surface the notice — otherwise the basket empties silently
  }, [market, hydrated]);

  // Per-line quantity-sync timers, so rapid +/- coalesces into ONE PATCH with the
  // final quantity instead of firing an absolute-quantity PATCH per click that can
  // land out of order and leave the server on the wrong number (BUG-19a).
  const qtySyncRef = React.useRef<Map<string, { timer: ReturnType<typeof setTimeout>; revertTo: number }>>(new Map());

  // Shared quantity setter for inc/dec/setQty. Updates the UI optimistically each
  // click, but debounces the backend write so only the settled quantity is sent.
  const setQtyInternal = React.useCallback(
    (id: string, next: (prev: number) => number) => {
      const item = state.items.find((i) => i.id === id);
      if (!item) return;
      const prevQty = item.qty;
      const newQty = next(prevQty);
      if (newQty === prevQty) return;
      setState((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === id ? { ...i, qty: newQty } : i)),
      }));

      const backendItemId = item.backendItemId;
      if (!backendItemId) return;
      const sync = qtySyncRef.current;
      const existing = sync.get(backendItemId);
      // revertTo = the qty before this burst began (first change of the burst wins).
      const revertTo = existing ? existing.revertTo : prevQty;
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        sync.delete(backendItemId);
        updateCartItem(backendItemId, newQty).catch(() => {
          setState((prev) => ({
            ...prev,
            items: prev.items.map((i) => (i.id === id ? { ...i, qty: revertTo } : i)),
          }));
        });
      }, 350);
      sync.set(backendItemId, { timer, revertTo });
    },
    [state.items],
  );

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
      // NOTE: all backend calls below run *outside* the setState updater so they
      // fire exactly once (React StrictMode double-invokes reducers) and never as
      // a side effect of rendering (BUG-19d).
      add: (spice, weight = "100g", form, qty = 1, backendIds) => {
        setMarketCleared(false); // adding to the basket dismisses the store-switch notice
        const line = lineFromSpice(spice, weight, form || "Whole", qty, market, backendIds);
        setState((s) => {
          const existing = s.items.find((i) => i.id === line.id);
          const items = existing
            ? s.items.map((i) => (i.id === line.id ? { ...i, qty: i.qty + qty } : i))
            : [...s.items, line];
          return { ...s, items };
        });
        // Sync to backend whenever the line resolved a real product+variant, so
        // items added from cards/quick-add reach the server cart too (BUG-01).
        if (line.productId && line.variantId) {
          addCartItem({ productId: line.productId, variantId: line.variantId, quantity: qty })
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
              // Backend rejected (e.g. out-of-stock) — roll back only the qty we
              // just added, dropping the line if it becomes empty.
              setState((s) => {
                const it = s.items.find((i) => i.id === line.id);
                if (!it) return s;
                const nextQty = it.qty - qty;
                return nextQty > 0
                  ? { ...s, items: s.items.map((i) => (i.id === line.id ? { ...i, qty: nextQty } : i)) }
                  : { ...s, items: s.items.filter((i) => i.id !== line.id) };
              });
            });
        }
      },
      inc: (id) => setQtyInternal(id, (prev) => prev + 1),
      dec: (id) => setQtyInternal(id, (prev) => Math.max(1, prev - 1)),
      setQty: (id, qty) => setQtyInternal(id, () => Math.max(1, qty)),
      remove: (id) => {
        const item = state.items.find((i) => i.id === id);
        setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
        if (item?.backendItemId) {
          removeCartItem(item.backendItemId).catch(() => {
            // Restore the item if the backend remove failed.
            setState((prev) =>
              prev.items.some((i) => i.id === id)
                ? prev
                : { ...prev, items: [...prev.items, item] },
            );
          });
        }
      },
      clear: () => {
        // Clear the server cart too, not just localStorage — otherwise an
        // abandoned/switched cart lingered server-side and re-hydrated (BUG-19c).
        const hadBackend = state.items.some((i) => i.backendItemId);
        setState(EMPTY);
        if (hadBackend) clearServerCart().catch(() => { /* best-effort */ });
      },
      setGiftWrap: (b) => setState((s) => ({ ...s, giftWrap: b })),
      setGiftNote: (str) => setState((s) => ({ ...s, giftNote: str })),
      applyPromo: async (code) => {
        const c = (code || "").trim().toUpperCase();
        if (!c) return false;
        // Validate against the backend — the DB is the only authority on whether
        // a code exists and what it's worth (BUG-05). The drawer shows an estimate,
        // but checkout charges the server-computed discount, so the two can't
        // diverge into a blocked or mischarged order.
        try {
          await apiApplyCoupon(c);
          setState((s) => ({ ...s, promo: c }));
          return true;
        } catch {
          // Offline/demo continuity only: accept a known local promo when the
          // backend is unreachable (there is no real checkout in that mode).
          if (CONFIG[market].promo[c]) {
            setState((s) => ({ ...s, promo: c }));
            return true;
          }
          return false;
        }
      },
      // Previously local-only, so a customer who "removed" a promo still had
      // it silently reapplied at checkout (server cart.couponId was never
      // cleared — Storefront audit #2). Best-effort backend sync, same
      // fire-and-forget pattern as clear()/remove() above.
      clearPromo: () => {
        const hadPromo = !!state.promo;
        setState((s) => ({ ...s, promo: "" }));
        if (hadPromo) apiRemoveCoupon().catch(() => { /* best-effort */ });
      },
      marketCleared,
      dismissMarketCleared: () => setMarketCleared(false),
      open,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      signInOpen,
      openSignIn: () => setSignInOpen(true),
      closeSignIn: () => setSignInOpen(false),
    };
  }, [state, market, open, signInOpen, setQtyInternal, marketCleared]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
