"use client";

import * as React from "react";
import type { Spice } from "@/lib/types";
import {
  CART_KEY, CONFIG, type CartLine, type CartState, type Totals,
  computeTotals, fmt as fmtMoney, lineFromSpice, lineFromServerItem,
  linePrice as linePriceOf, unitPrice as unitPriceOf,
} from "@/lib/cart";
import { bootstrapCart, registerCartMutationDrain, addCartItem, updateCartItem, removeCartItem, clearServerCart, applyCoupon as apiApplyCoupon, removeCoupon as apiRemoveCoupon } from "@/lib/api/cart";
import type { CartItem } from "@/lib/types";
import { useMarket } from "./MarketContext";
import { useAuth } from "./AuthContext";

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

const CART_OWNER_KEY = `${CART_KEY}:owner`;

function loadState(owner: string = "guest"): CartState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const savedOwner = localStorage.getItem(CART_OWNER_KEY);
    if (savedOwner && savedOwner !== owner) return EMPTY;
    const items = JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartLine[];
    return { ...EMPTY, items: Array.isArray(items) ? items : [] };
  } catch {
    return EMPTY;
  }
}

// Real server lines own quantities and item IDs; keep unsynced/demo lines for
// offline continuity. Edits made during a bootstrap retain their optimistic qty.
export function reconcileCartItems(local: CartLine[], server: CartItem[], edited: ReadonlySet<string> = new Set()): CartLine[] {
  const variants = new Set(server.map(item => item.variant.id));
  const restored = server.filter(item => !edited.has(item.variant.id) || local.some(line => line.variantId === item.variant.id)).map(item => {
    const previous = local.find(line => line.variantId === item.variant.id);
    const authoritative = lineFromServerItem(item);
    return previous ? {
      ...previous, ...authoritative, form: previous.form,
      ...(previous.imageSrc ? { imageSrc: previous.imageSrc } : {}),
      ...(edited.has(item.variant.id) ? { qty: previous.qty } : {}),
    } : authoritative;
  });
  return [...restored, ...local.filter(line => !variants.has(line.variantId ?? "") && (!line.backendItemId || edited.has(line.variantId ?? line.id)))];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { market } = useMarket();
  const auth = useAuth();
  const owner = auth.user?.id ?? "guest";
  const [state, setReactState] = React.useState<CartState>(EMPTY);
  const stateRef = React.useRef(state);
  const setState = React.useCallback((value: CartState | ((previous: CartState) => CartState)) => {
    const next = typeof value === "function" ? value(stateRef.current) : value;
    stateRef.current = next;
    setReactState(next);
  }, []);
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
  const initialSessionSettledRef = React.useRef(false);
  const scopeRef = React.useRef(0);
  const scopeKeyRef = React.useRef({ owner, revision: auth.sessionRevision, market });
  const scopeKey = `${owner}:${auth.sessionRevision}:${market}`;
  const previousScope = scopeKeyRef.current;
  if (`${previousScope.owner}:${previousScope.revision}:${previousScope.market}` !== scopeKey) {
    // Initial restore resolves the identity of already queued shopping intent.
    // Established account changes invalidate former-account work as before.
    if (previousScope.market !== market || initialSessionSettledRef.current) scopeRef.current += 1;
    scopeKeyRef.current = { owner, revision: auth.sessionRevision, market };
  }
  const readyRef = React.useRef(false);
  readyRef.current = !auth.loading && !auth.sessionError;
  const readyWaitersRef = React.useRef<(() => void)[]>([]);
  const mutationQueueRef = React.useRef<Promise<unknown>>(Promise.resolve());
  const editRevisionRef = React.useRef(0);
  const editedRef = React.useRef(new Map<string, number>());
  const serverIdsRef = React.useRef(new Map<string, string>());
  const pendingMarketResetRef = React.useRef(false);
  const marketResetRef = React.useRef<{ scope: number; promise: Promise<boolean>; failed: boolean } | null>(null);
  const idleDrainRef = React.useRef<Promise<void>>(Promise.resolve());
  const ensureMarketReset = React.useCallback((scope: number, retryFailed = false): Promise<boolean> => {
    if (scope !== scopeRef.current) return Promise.resolve(false);
    if (!pendingMarketResetRef.current) return Promise.resolve(true);
    const previous = marketResetRef.current;
    if (previous?.scope === scope && (!retryFailed || !previous.failed)) return previous.promise;
    const attempt = { scope, promise: Promise.resolve(false), failed: false };
    attempt.promise = clearServerCart()
      .then(() => {
        if (scope !== scopeRef.current) return false;
        pendingMarketResetRef.current = false;
        return true;
      })
      .catch(() => { attempt.failed = true; return false; });
    marketResetRef.current = attempt;
    return attempt.promise;
  }, []);
  const markEdited = React.useCallback((key: string) => {
    editedRef.current.set(key, ++editRevisionRef.current);
  }, []);
  const queueMutation = React.useCallback(<T,>(work: () => Promise<T>): Promise<T | undefined> => {
    const scope = scopeRef.current;
    // Retry a failed reset only for a new explicit action queued after that
    // failure. Earlier jobs and passive bootstrap reuse the settled failure.
    const retryFailedReset = marketResetRef.current?.scope === scope && marketResetRef.current.failed;
    const result = mutationQueueRef.current.then(async () => {
      if (scope !== scopeRef.current) return undefined;
      if (!readyRef.current) await new Promise<void>(resolve => readyWaitersRef.current.push(resolve));
      if (scope !== scopeRef.current) return undefined;
      if (!await ensureMarketReset(scope, retryFailedReset) || scope !== scopeRef.current) return undefined;
      return work();
    });
    mutationQueueRef.current = result.catch(() => {});
    return result;
  }, [ensureMarketReset]);
  const openCart = React.useCallback(() => setOpen(true), []);
  const closeCart = React.useCallback(() => setOpen(false), []);
  const openSignIn = React.useCallback(() => setSignInOpen(true), []);
  const closeSignIn = React.useCallback(() => setSignInOpen(false), []);
  const qtySyncRef = React.useRef<Map<string, { timer: ReturnType<typeof setTimeout>; revertTo: number; flush: () => void }>>(new Map());
  const previousOwnerRef = React.useRef<string | null>(null);
  React.useEffect(() => registerCartMutationDrain(() => {
    // Finish pending debounced quantities before login/merge. An uncertain
    // session cannot dispatch writes; release and discard those stale jobs so
    // signing in can recover instead of waiting on the auth-ready gate forever.
    if (!readyRef.current) {
      for (const pending of qtySyncRef.current.values()) clearTimeout(pending.timer);
      qtySyncRef.current.clear();
      // Initial shopping intent belongs to whichever session first resolves.
      // Let explicit login recover that session without waiting on this gate.
      if (!initialSessionSettledRef.current) return idleDrainRef.current;
      scopeRef.current += 1;
      for (const resolve of readyWaitersRef.current.splice(0)) resolve();
      return mutationQueueRef.current;
    }
    for (const pending of [...qtySyncRef.current.values()]) {
      clearTimeout(pending.timer);
      pending.flush();
    }
    return mutationQueueRef.current;
  }), []);

  // Local fallback is available even if checking the session fails. Account
  // baskets are restored only once that account has actually been authenticated.
  React.useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, [setState]);

  React.useEffect(() => {
    if (!hydrated || auth.loading) return;
    const previousOwner = previousOwnerRef.current;
    if (previousOwner === null) {
      if (auth.sessionError) return;
      if (owner !== "guest") {
        const saved = pendingMarketResetRef.current ? EMPTY : loadState(owner);
        const edited = new Set(editedRef.current.keys());
        setState(current => ({
          ...current,
          items: [
            ...saved.items.filter(line => !edited.has(line.variantId ?? line.id)),
            ...current.items.filter(line => edited.has(line.variantId ?? line.id)),
          ],
        }));
      }
      initialSessionSettledRef.current = true;
    } else if (previousOwner !== owner) {
      // Clear private state on signout/account switch. Guest->user retains local
      // fallback after a failed best-effort merge, with obsolete IDs removed.
      setState(previousOwner === "guest" ? s => ({ ...s, items: s.items.map(line => ({ ...line, backendItemId: undefined })) }) : EMPTY);
      if (previousOwner !== "guest") {
        try { localStorage.removeItem(CART_KEY); localStorage.removeItem(CART_OWNER_KEY); } catch { /* disabled storage */ }
      }
    }
    previousOwnerRef.current = owner;
    serverIdsRef.current.clear();
    if (previousOwner !== null) {
      for (const pending of qtySyncRef.current.values()) clearTimeout(pending.timer);
      qtySyncRef.current.clear();
    }
  }, [hydrated, owner, auth.sessionRevision, auth.loading, auth.sessionError, setState]);

  // Clear a switched store before its bootstrap joins the mutation queue.
  React.useEffect(() => {
    if (!hydrated) { prevMarketRef.current = market; return; }
    if (prevMarketRef.current === market) return;
    prevMarketRef.current = market;
    serverIdsRef.current.clear();
    for (const pending of qtySyncRef.current.values()) clearTimeout(pending.timer);
    qtySyncRef.current.clear();
    const hadItems = itemsRef.current.length > 0;
    pendingMarketResetRef.current = true;
    marketResetRef.current = null;
    setState(s => ({ ...EMPTY, giftWrap: s.giftWrap, giftNote: s.giftNote }));
    if (hadItems) { setMarketCleared(true); setOpen(true); }
  }, [market, hydrated, setState]);

  React.useEffect(() => {
    if (!hydrated || auth.loading || auth.sessionError) return;
    for (const resolve of readyWaitersRef.current.splice(0)) resolve();
    const controller = new AbortController();
    const scope = scopeRef.current;
    const revision = editRevisionRef.current;
    // Capture only preceding work. Install the complete restore as a barrier
    // before later ID-dependent mutations join the queue, so post-login edits
    // use the new user's server IDs without making restore wait on itself.
    const preceding = mutationQueueRef.current;
    // Reset is a shared precondition, ahead of initial queued adds as well as
    // restore. It survives provisional->settled identity without a queue cycle.
    const reset = ensureMarketReset(scope);
    const restored = reset.then(async cleared => {
      if (!cleared) return undefined;
      await preceding;
      if (controller.signal.aborted || scope !== scopeRef.current) return undefined;
      return bootstrapCart({ signal: controller.signal });
    })
      .then(result => {
        if (!result) return;
        const { cart: bc } = result;
        if (controller.signal.aborted || scope !== scopeRef.current) return;
        const edited = new Set([...editedRef.current].filter(([, edit]) => edit > revision).map(([key]) => key));
        for (const item of bc?.items ?? []) serverIdsRef.current.set(item.variant.id, item.id);
        setState(s => ({ ...s, items: reconcileCartItems(s.items, bc?.items ?? [], edited) }));
      })
      .catch(() => { /* offline — localStorage-only mode */ });
    mutationQueueRef.current = restored;

    return () => { controller.abort(); };
  }, [hydrated, owner, market, auth.sessionRevision, auth.loading, auth.sessionError, setState, ensureMarketReset]);

  React.useEffect(() => () => {
    scopeRef.current += 1;
    for (const pending of qtySyncRef.current.values()) clearTimeout(pending.timer);
    qtySyncRef.current.clear();
    for (const resolve of readyWaitersRef.current.splice(0)) resolve();
  }, []);

  // Persist items to localStorage only after the initial hydration so the
  // pre-hydration empty state never blanks out a previously saved cart.
  React.useEffect(() => {
    if (!hydrated || auth.loading || auth.sessionError) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(stateRef.current.items));
      localStorage.setItem(CART_OWNER_KEY, owner);
    } catch {
      /* ignore quota / disabled storage */
    }
  }, [state.items, hydrated, owner, auth.loading, auth.sessionError]);

  // open the drawer if arriving via /cart → /products?cart=1
  React.useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("cart") === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Per-line quantity-sync timers, so rapid +/- coalesces into ONE PATCH with the
  // final quantity instead of firing an absolute-quantity PATCH per click that can
  // land out of order and leave the server on the wrong number (BUG-19a).
  // Shared quantity setter for inc/dec/setQty. Updates the UI optimistically each
  // click, but debounces the backend write so only the settled quantity is sent.
  const setQtyInternal = React.useCallback(
    (id: string, next: (prev: number) => number) => {
      const item = stateRef.current.items.find((i) => i.id === id);
      if (!item) return;
      const prevQty = item.qty;
      const newQty = next(prevQty);
      if (newQty === prevQty) return;
      markEdited(item.variantId ?? item.id);
      setState((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === id ? { ...i, qty: newQty } : i)),
      }));

      const backendItemId = item.backendItemId ?? item.variantId;
      if (!backendItemId) return;
      const sync = qtySyncRef.current;
      const existing = sync.get(backendItemId);
      // revertTo = the qty before this burst began (first change of the burst wins).
      const revertTo = existing ? existing.revertTo : prevQty;
      if (existing) clearTimeout(existing.timer);
      const scope = scopeRef.current;
      const flush = () => {
        sync.delete(backendItemId);
        queueMutation(async () => {
          const latest = stateRef.current.items.find(i => i.id === id);
          const serverId = latest?.backendItemId ?? (latest?.variantId ? serverIdsRef.current.get(latest.variantId) : undefined);
          if (serverId) await updateCartItem(serverId, newQty);
        }).catch(() => {
          if (scope !== scopeRef.current) return;
          setState((prev) => ({
            ...prev,
            items: prev.items.map((i) => (i.id === id ? { ...i, qty: revertTo } : i)),
          }));
        });
      };
      const timer = setTimeout(flush, 350);
      sync.set(backendItemId, { timer, revertTo, flush });
    },
    [markEdited, queueMutation, setState],
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
        markEdited(line.variantId ?? line.id);
        const scope = scopeRef.current;
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
          const { productId, variantId } = line;
          queueMutation(() => addCartItem({ productId, variantId, quantity: qty }))
            .then((res) => {
              if (scope !== scopeRef.current) return;
              if (res?.item?.id) {
                serverIdsRef.current.set(variantId, res.item.id);
                setState((s) => ({
                  ...s,
                  items: s.items.map((i) =>
                    i.id === line.id ? { ...i, backendItemId: res.item.id } : i
                  ),
                }));
              }
            })
            .catch(() => {
              if (scope !== scopeRef.current) return;
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
        const item = stateRef.current.items.find((i) => i.id === id);
        if (!item) return;
        markEdited(item.variantId ?? item.id);
        const scope = scopeRef.current;
        for (const key of [item.backendItemId, item.variantId]) {
          if (!key) continue;
          const pending = qtySyncRef.current.get(key);
          if (pending) { clearTimeout(pending.timer); qtySyncRef.current.delete(key); }
        }
        setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
        if (item.backendItemId || item.variantId) {
          queueMutation(async () => {
            const serverId = item.backendItemId ?? serverIdsRef.current.get(item.variantId!);
            if (serverId) await removeCartItem(serverId);
          }).catch(() => {
            if (scope !== scopeRef.current) return;
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
        const hadBackend = stateRef.current.items.some((i) => i.backendItemId || (i.productId && i.variantId));
        scopeRef.current += 1;
        for (const pending of qtySyncRef.current.values()) clearTimeout(pending.timer);
        qtySyncRef.current.clear();
        serverIdsRef.current.clear();
        setState(EMPTY);
        if (hadBackend) queueMutation(() => clearServerCart()).catch(() => { /* best-effort */ });
      },
      setGiftWrap: (b) => setState((s) => ({ ...s, giftWrap: b })),
      setGiftNote: (str) => setState((s) => ({ ...s, giftNote: str })),
      applyPromo: async (code) => {
        const c = (code || "").trim().toUpperCase();
        if (!c) return false;
        const scope = scopeRef.current;
        // Validate against the backend — the DB is the only authority on whether
        // a code exists and what it's worth (BUG-05). The drawer shows an estimate,
        // but checkout charges the server-computed discount, so the two can't
        // diverge into a blocked or mischarged order.
        try {
          const applied = await queueMutation(async () => { await apiApplyCoupon(c); return true; });
          if (!applied || scope !== scopeRef.current) return false;
          setState((s) => ({ ...s, promo: c }));
          return true;
        } catch {
          if (scope !== scopeRef.current) return false;
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
        const hadPromo = !!stateRef.current.promo;
        setState((s) => ({ ...s, promo: "" }));
        if (hadPromo) queueMutation(() => apiRemoveCoupon()).catch(() => { /* best-effort */ });
      },
      marketCleared,
      dismissMarketCleared: () => setMarketCleared(false),
      open,
      openCart,
      closeCart,
      signInOpen,
      openSignIn,
      closeSignIn,
    };
  }, [state, market, open, signInOpen, setQtyInternal, marketCleared, markEdited, queueMutation, setState, openCart, closeCart, openSignIn, closeSignIn]);

  return React.createElement(Ctx.Provider, { value: api }, children);
}

export function useCart(): CartCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
