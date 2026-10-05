import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A small hook host runs the actual provider effects/state transitions in Node.
// No DOM, browser, HTTP server, dependencies or production build is needed.
const host = vi.hoisted(() => {
  const h = {
    cells: [] as any[], effects: [] as (() => void)[], index: 0, dirty: false, value: null as any,
    auth: { user: null as { id: string } | null, loading: true, sessionError: null as string | null, sessionRevision: 0 },
    market: "intl", drain: null as (() => Promise<unknown>) | null, bootstrap: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn(), clear: vi.fn(), coupon: vi.fn(), removeCoupon: vi.fn(),
  };
  const same = (a: unknown[] | undefined, b: unknown[] | undefined) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  return {
    h,
    react: {
      createContext: () => ({ Provider: "provider" }),
      createElement: (_type: unknown, props: any) => { h.value = props.value; return null; },
      useContext: () => h.value,
      useState: (initial: any) => {
        const i = h.index++;
        if (!(i in h.cells)) h.cells[i] = typeof initial === "function" ? initial() : initial;
        return [h.cells[i], (value: any) => { h.cells[i] = typeof value === "function" ? value(h.cells[i]) : value; h.dirty = true; }];
      },
      useRef: (initial: any) => {
        const i = h.index++;
        if (!(i in h.cells)) h.cells[i] = { current: initial };
        return h.cells[i];
      },
      useMemo: (calculate: () => unknown, deps: unknown[]) => {
        const i = h.index++, old = h.cells[i];
        if (!old || !same(old.deps, deps)) h.cells[i] = { deps, value: calculate() };
        return h.cells[i].value;
      },
      useCallback: (fn: unknown, deps: unknown[]) => {
        const i = h.index++, old = h.cells[i];
        if (!old || !same(old.deps, deps)) h.cells[i] = { deps, value: fn };
        return h.cells[i].value;
      },
      useEffect: (effect: () => (() => void) | void, deps?: unknown[]) => {
        const i = h.index++, old = h.cells[i];
        if (!old || !same(old.deps, deps)) {
          h.cells[i] = { deps, cleanup: old?.cleanup };
          h.effects.push(() => { old?.cleanup?.(); h.cells[i].cleanup = effect(); });
        }
      },
    },
  };
});
vi.mock("../../aranya-next/node_modules/react/index.js", () => host.react);
vi.mock("../../aranya-next/src/components/MarketContext", () => ({ useMarket: () => ({ market: host.h.market }) }));
vi.mock("../../aranya-next/src/components/AuthContext", () => ({ useAuth: () => host.h.auth }));
vi.mock("../../aranya-next/src/lib/api/cart", () => ({
  bootstrapCart: host.h.bootstrap, addCartItem: host.h.add, updateCartItem: host.h.update,
  registerCartMutationDrain: (drain: () => Promise<unknown>) => { host.h.drain = drain; return () => { host.h.drain = null; }; },
  removeCartItem: host.h.remove, clearServerCart: host.h.clear, applyCoupon: host.h.coupon, removeCoupon: host.h.removeCoupon,
}));

import { CartProvider, reconcileCartItems } from "../../aranya-next/src/components/CartContext";
import { CART_KEY, lineFromServerItem } from "../../aranya-next/src/lib/cart";
import type { CartItem, Spice } from "../../aranya-next/src/lib/types";

const h = host.h;
const serverItem = (quantity = 3, id = "server-item"): CartItem => ({
  id, quantity, product: { id: "product-1", name: "Cinnamon", slug: "cinnamon", color: "#aaa", images: [] },
  variant: { id: "variant-1", sku: "fixture", weight: 100, price: "10.10", stock: 10, currency: "USD", market: "INTERNATIONAL" },
});
const spice = { name: "Cinnamon", latin: "Cinnamomum", usd: "10.10", lkr: "3000", color: "#aaa", base: "#aaa", deep: "#aaa", surface: "#aaa" } as Spice;
const deferred = <T,>() => {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function render() {
  for (let turn = 0; turn < 20; turn++) {
    h.dirty = false; h.index = 0;
    CartProvider({ children: null });
    for (const effect of h.effects.splice(0)) effect();
    if (!h.dirty) return;
  }
  throw new Error("Provider did not settle");
}
async function flush() {
  for (let i = 0; i < 15; i++) { await Promise.resolve(); if (h.dirty) render(); }
}

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers();
  h.cells = []; h.effects = []; h.index = 0; h.dirty = false; h.value = null;
  h.auth = { user: null, loading: true, sessionError: null, sessionRevision: 0 }; h.market = "intl";
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  vi.stubGlobal("window", { location: { search: "" } });
  h.bootstrap.mockResolvedValue({ cart: null, market: "INTERNATIONAL" });
  h.add.mockResolvedValue({ item: { id: "added-item" } });
  h.update.mockResolvedValue({ item: { id: "added-item" } });
  h.remove.mockResolvedValue(undefined); h.clear.mockResolvedValue(undefined);
  h.coupon.mockResolvedValue({ discount: {} }); h.removeCoupon.mockResolvedValue(undefined);
});
afterEach(() => {
  for (const cell of h.cells) cell?.cleanup?.();
  vi.useRealTimers(); vi.unstubAllGlobals();
});

describe("auth-gated passive cart restore", () => {
  it.each(["user-1", "other-owner"])("keeps an initial add when auth resolves, without importing %s storage", async savedOwner => {
    localStorage.setItem(CART_KEY, JSON.stringify([{
      ...lineFromServerItem(serverItem(9, "private-old-id")), id: "v:private-variant", variantId: "private-variant",
    }]));
    localStorage.setItem(`${CART_KEY}:owner`, savedOwner);
    render(); await flush(); expect(h.value.items).toHaveLength(0);
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" });
    await flush(); expect(h.add).not.toHaveBeenCalled(); expect(h.value.items[0].qty).toBe(1);
    h.add.mockImplementationOnce(async () => {
      h.bootstrap.mockResolvedValue({ cart: { items: [serverItem(1, "user-added-id")] } });
      return { item: { id: "user-added-id" } };
    });
    h.auth.user = { id: "user-1" }; h.auth.loading = false; render(); await flush();
    expect(h.add).toHaveBeenCalledTimes(1); expect(h.bootstrap).toHaveBeenCalledTimes(1);
    expect(h.value.items).toEqual([expect.objectContaining({ variantId: "variant-1", qty: 1, backendItemId: "user-added-id" })]);
    expect(h.add.mock.invocationCallOrder[0]).toBeLessThan(h.bootstrap.mock.invocationCallOrder[0]!);
  });

  it.each([false, true])("retains an initial market reset and orders clear->add->bootstrap (add: %s)", async add => {
    h.bootstrap.mockResolvedValue({ cart: { items: [serverItem(3, "old-usd-id")] } });
    h.clear.mockImplementationOnce(async () => { h.bootstrap.mockResolvedValue({ cart: null }); });
    h.add.mockImplementationOnce(async () => {
      h.bootstrap.mockResolvedValue({ cart: { items: [{ ...serverItem(1, "local-item"), variant: { ...serverItem().variant, id: "local-variant", currency: "LKR", market: "LOCAL" } }] } });
      return { item: { id: "local-item" } };
    });
    render(); await flush(); h.market = "local"; render(); await flush();
    if (add) h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "local-variant" });
    await flush(); expect(h.clear).not.toHaveBeenCalled(); expect(h.bootstrap).not.toHaveBeenCalled();
    h.auth.user = { id: "user-1" }; h.auth.loading = false; render(); await flush();
    expect(h.clear).toHaveBeenCalledTimes(1); expect(h.bootstrap).toHaveBeenCalledTimes(1);
    expect(h.value.marketCleared).toBe(false); expect(h.value.open).toBe(false);
    if (add) {
      expect(h.add).toHaveBeenCalledTimes(1);
      expect(h.clear.mock.invocationCallOrder[0]).toBeLessThan(h.add.mock.invocationCallOrder[0]!);
      expect(h.add.mock.invocationCallOrder[0]).toBeLessThan(h.bootstrap.mock.invocationCallOrder[0]!);
      expect(h.value.items).toEqual([expect.objectContaining({ variantId: "local-variant", backendItemId: "local-item", qty: 1 })]);
    } else { expect(h.add).not.toHaveBeenCalled(); expect(h.value.items).toHaveLength(0); }
  });

  it("keeps unsent local intent when an initial market clear fails, without adding or restoring old-market rows", async () => {
    h.clear.mockRejectedValueOnce(new Error("offline clear"));
    render(); await flush(); h.market = "local"; render(); await flush();
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "local-variant" });
    h.auth.user = { id: "user-1" }; h.auth.loading = false; render(); await flush();
    expect(h.clear).toHaveBeenCalledTimes(1); expect(h.add).not.toHaveBeenCalled(); expect(h.bootstrap).not.toHaveBeenCalled();
    expect(h.value.items).toEqual([expect.objectContaining({ variantId: "local-variant", qty: 1 })]);
  });

  it("waits for auth, skips uncertain sessions, then performs exactly one read with cancellation", async () => {
    render(); await flush(); expect(h.bootstrap).not.toHaveBeenCalled();
    h.auth.loading = false; h.auth.sessionError = "unavailable"; render(); await flush();
    expect(h.bootstrap).not.toHaveBeenCalled();
    h.auth.sessionError = null; render(); await flush();
    expect(h.bootstrap).toHaveBeenCalledTimes(1);
    expect(h.bootstrap.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
    render(); await flush(); expect(h.bootstrap).toHaveBeenCalledTimes(1);
    expect(h.add).not.toHaveBeenCalled(); expect(h.clear).not.toHaveBeenCalled();
  });

  it("restores server quantities and refreshed IDs instead of retaining stale local quantities", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([lineFromServerItem(serverItem(1, "old-id"))]));
    h.bootstrap.mockResolvedValue({ cart: { items: [serverItem(5, "new-id")] } });
    h.auth.loading = false; render(); await flush();
    expect(h.value.items).toEqual([expect.objectContaining({ qty: 5, backendItemId: "new-id" })]);
  });

  it("keeps local fallback on an offline bootstrap and clears stale real lines on an empty successful read", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([lineFromServerItem(serverItem())]));
    h.bootstrap.mockRejectedValueOnce(new Error("offline")); h.auth.loading = false;
    render(); await flush(); expect(h.value.items).toHaveLength(1);
    h.auth.sessionRevision++; render(); await flush(); expect(h.value.items).toHaveLength(0);
  });

  it.each([null, "logout uncertain"])("aborts stale account reads and clears private state on signout (error: %s)", async error => {
    const stale = deferred<any>();
    h.bootstrap.mockResolvedValueOnce({ cart: { items: [serverItem()] } }).mockImplementationOnce(() => stale.promise);
    h.auth = { user: { id: "user-1" }, loading: false, sessionError: null, sessionRevision: 0 };
    render(); await flush(); expect(h.value.items).toHaveLength(1);
    h.auth.sessionRevision++; render(); await flush();
    const staleSignal = h.bootstrap.mock.calls[1][0].signal;
    h.auth.user = null; h.auth.sessionRevision++; h.auth.sessionError = error; render(); await flush();
    expect(staleSignal.aborted).toBe(true);
    expect(h.value.items).toHaveLength(0);
    if (error) expect(localStorage.getItem(CART_KEY)).toBeNull();
    else expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([]);
    stale.resolve({ cart: { items: [serverItem(99)] } }); await flush();
    expect(h.value.items).toHaveLength(0);
  });

  it("does not expose a persisted different-account basket during startup", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([lineFromServerItem(serverItem())]));
    localStorage.setItem(`${CART_KEY}:owner`, "user-1");
    render(); await flush(); expect(h.value.items).toHaveLength(0);
    h.auth.loading = false; render(); await flush(); expect(h.value.items).toHaveLength(0);
  });
});

describe("cart mutation ordering and scope guards", () => {
  it.each([null, { id: "user-2" }])("discards former-account queued adds after an established identity change: %j", async nextUser => {
    const first = deferred<any>(); h.add.mockImplementationOnce(() => first.promise);
    h.auth.user = { id: "user-1" }; h.auth.loading = false; render(); await flush();
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" });
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" });
    await flush(); expect(h.add).toHaveBeenCalledTimes(1);
    h.auth.user = nextUser; h.auth.sessionRevision++; render(); await flush();
    first.resolve({ item: { id: "former-account-id" } }); await flush();
    expect(h.add).toHaveBeenCalledTimes(1); expect(h.value.items).toHaveLength(0);
  });

  it("serializes guest additions and keeps dialog close callbacks stable", async () => {
    const first = deferred<any>(); h.add.mockImplementationOnce(() => first.promise);
    h.auth.loading = false; render(); await flush();
    const closeCart = h.value.closeCart, closeSignIn = h.value.closeSignIn;
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" });
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" });
    await flush(); expect(h.add).toHaveBeenCalledTimes(1);
    first.resolve({ item: { id: "added-item" } }); await flush();
    expect(h.add).toHaveBeenCalledTimes(2);
    expect(h.value.items[0]).toMatchObject({ qty: 2, backendItemId: "added-item" });
    expect(h.value.closeCart).toBe(closeCart); expect(h.value.closeSignIn).toBe(closeSignIn);
  });

  it("removes a pending add using its eventual server ID and cancels the quantity debounce", async () => {
    const first = deferred<any>(); h.add.mockImplementationOnce(() => first.promise);
    h.auth.loading = false; render(); await flush();
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" });
    await flush(); h.value.inc("v:variant-1"); h.value.remove("v:variant-1"); await flush();
    first.resolve({ item: { id: "eventual-id" } }); await flush();
    await vi.advanceTimersByTimeAsync(400); await flush();
    expect(h.remove).toHaveBeenCalledWith("eventual-id");
    expect(h.update).not.toHaveBeenCalled(); expect(h.value.items).toHaveLength(0);
  });

  it("coalesces rapid quantity changes into one final absolute PATCH", async () => {
    h.bootstrap.mockResolvedValue({ cart: { items: [serverItem(2)] } }); h.auth.loading = false;
    render(); await flush();
    h.value.inc("v:variant-1"); h.value.inc("v:variant-1"); h.value.inc("v:variant-1");
    await vi.advanceTimersByTimeAsync(350); await flush();
    expect(h.update).toHaveBeenCalledTimes(1); expect(h.update).toHaveBeenCalledWith("server-item", 5);
  });

  it("makes queued guest adds and pending debounced quantities visible to the auth drainer", async () => {
    const first = deferred<any>(); h.add.mockImplementationOnce(() => first.promise);
    h.auth.loading = false; render(); await flush();
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" });
    h.value.inc("v:variant-1");
    let drained = false;
    const drain = h.drain!().then(() => { drained = true; });
    await flush(); expect(drained).toBe(false); expect(h.add).toHaveBeenCalledTimes(1);
    first.resolve({ item: { id: "eventual-id" } }); await drain; await flush();
    expect(h.update).toHaveBeenCalledWith("eventual-id", 2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("discards quantity timers and completes the auth drain when session restoration is uncertain", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([lineFromServerItem(serverItem(2))]));
    h.auth.loading = false; h.auth.sessionError = "session unavailable";
    render(); await flush();
    h.value.inc("v:variant-1");
    expect(vi.getTimerCount()).toBe(1);
    // A signIn within the 350ms debounce first calls this registered drainer.
    // It must settle without queuing a new job gated on the unresolved auth.
    await h.drain!();
    await vi.advanceTimersByTimeAsync(350); await flush();
    expect(h.update).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    h.auth.user = { id: "user-1" }; h.auth.sessionError = null; h.auth.sessionRevision++;
    render(); await flush(); expect(h.bootstrap).toHaveBeenCalledTimes(1);
  });

  it.each(["remove", "quantity"])("waits for post-login IDs before sending a %s operation", async operation => {
    h.auth.loading = false;
    h.bootstrap.mockResolvedValueOnce({ cart: { items: [serverItem(2, "guest-id")] } });
    render(); await flush();
    const userRestore = deferred<any>(); h.bootstrap.mockImplementationOnce(() => userRestore.promise);
    h.auth.user = { id: "user-1" }; h.auth.sessionRevision++;
    render(); await flush();
    expect(h.value.items[0].backendItemId).toBeUndefined();
    if (operation === "remove") h.value.remove("v:variant-1");
    else h.value.setQty("v:variant-1", 4);
    await vi.advanceTimersByTimeAsync(350); await flush();
    expect(h.remove).not.toHaveBeenCalled(); expect(h.update).not.toHaveBeenCalled();
    userRestore.resolve({ cart: { items: [serverItem(7, "user-item-id")] } }); await flush();
    if (operation === "remove") {
      expect(h.remove).toHaveBeenCalledWith("user-item-id"); expect(h.value.items).toHaveLength(0);
    } else {
      expect(h.update).toHaveBeenCalledWith("user-item-id", 4);
      expect(h.value.items[0]).toMatchObject({ backendItemId: "user-item-id", qty: 4 });
    }
  });

  it("discards an ID-dependent operation when its post-login restore is superseded by signout", async () => {
    h.auth.loading = false;
    h.bootstrap.mockResolvedValueOnce({ cart: { items: [serverItem(2, "guest-id")] } });
    render(); await flush();
    const userRestore = deferred<any>(); h.bootstrap.mockImplementationOnce(() => userRestore.promise);
    h.auth.user = { id: "user-1" }; h.auth.sessionRevision++; render(); await flush();
    h.value.remove("v:variant-1"); await flush();
    const oldSignal = h.bootstrap.mock.calls[1][0].signal;
    h.auth.user = null; h.auth.sessionRevision++; render(); await flush();
    expect(oldSignal.aborted).toBe(true);
    userRestore.resolve({ cart: { items: [serverItem(7, "user-item-id")] } }); await flush();
    expect(h.remove).not.toHaveBeenCalled(); expect(h.value.items).toHaveLength(0);
  });

  it("clears before restoring a switched market and ignores an old add failure", async () => {
    const first = deferred<any>(); h.add.mockImplementationOnce(() => first.promise);
    h.auth.loading = false; render(); await flush();
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "variant-1" }); await flush();
    h.market = "local"; render(); await flush();
    first.reject(new Error("old add failed")); await flush();
    expect(h.clear).toHaveBeenCalledTimes(1); expect(h.value.items).toHaveLength(0);
    expect(h.value.marketCleared).toBe(true);
    expect(h.clear.mock.invocationCallOrder[0]).toBeLessThan(h.bootstrap.mock.invocationCallOrder[1]!);
  });

  it("does not restore old-market items when clearing the server cart fails", async () => {
    h.bootstrap.mockResolvedValue({ cart: { items: [serverItem()] } }); h.auth.loading = false;
    render(); await flush(); h.clear.mockRejectedValueOnce(new Error("offline clear"));
    h.market = "local"; render(); await flush();
    expect(h.value.items).toHaveLength(0); expect(h.value.marketCleared).toBe(true);
    expect(h.bootstrap).toHaveBeenCalledTimes(1);
  });

  it("retries a failed market reset once for a later explicit add after networking recovers", async () => {
    h.bootstrap.mockResolvedValue({ cart: { items: [serverItem()] } }); h.auth.loading = false;
    render(); await flush(); h.clear.mockRejectedValueOnce(new Error("offline clear"));
    h.market = "local"; render(); await flush();
    expect(h.clear).toHaveBeenCalledTimes(1); expect(h.bootstrap).toHaveBeenCalledTimes(1);
    expect(h.value.items).toHaveLength(0);
    await flush(); expect(h.clear).toHaveBeenCalledTimes(1);
    h.value.add(spice, "100g", "Whole", 1, { productId: "product-1", variantId: "local-variant" });
    await flush();
    expect(h.clear).toHaveBeenCalledTimes(2); expect(h.add).toHaveBeenCalledTimes(1);
    expect(h.clear.mock.invocationCallOrder[1]).toBeLessThan(h.add.mock.invocationCallOrder[0]!);
    expect(h.value.items).toEqual([expect.objectContaining({ variantId: "local-variant", qty: 1, backendItemId: "added-item" })]);
    expect(h.bootstrap).toHaveBeenCalledTimes(1);
  });

  it("applies and removes server coupons and ignores a late result from the previous market", async () => {
    h.auth.loading = false; render(); await flush();
    expect(await h.value.applyPromo("save20")).toBe(true); await flush();
    expect(h.coupon).toHaveBeenCalledWith("SAVE20"); expect(h.value.promo).toBe("SAVE20");
    h.value.clearPromo(); await flush();
    expect(h.removeCoupon).toHaveBeenCalledTimes(1); expect(h.value.promo).toBe("");
    const late = deferred<any>(); h.coupon.mockReturnValueOnce(late.promise);
    const applied = h.value.applyPromo("late"); await flush();
    h.market = "local"; render(); await flush();
    late.resolve({ discount: {} }); expect(await applied).toBe(false); await flush();
    expect(h.value.promo).toBe("");
  });

  it("does not resurrect a line removed while bootstrap is in flight", () => {
    expect(reconcileCartItems([], [serverItem()], new Set(["variant-1"]))).toEqual([]);
  });
});
