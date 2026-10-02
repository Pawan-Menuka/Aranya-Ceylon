import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => {
  const h = { cells: [] as any[], cartCells: [] as any[], cartEnabled: false, cartValue: null as any, index: 0, effects: [] as (() => void)[], dirty: false, value: null as any,
    refresh: vi.fn(), me: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn(), fetch: vi.fn() };
  const same = (a: unknown[] | undefined, b: unknown[] | undefined) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (calculate: () => unknown, deps: unknown[]) => {
    const i = h.index++, old = h.cells[i];
    if (!old || !same(old.deps, deps)) h.cells[i] = { deps, value: calculate() };
    return h.cells[i].value;
  };
  return { h, react: {
    createContext: () => { const context = { value: null as any, Provider: null as any }; context.Provider = { context }; return context; },
    createElement: (type: any, props: any) => { type.context.value = props.value; h.value = props.value; return null; },
    useContext: (context: any) => context.value,
    useMemo: memo, useCallback: (fn: unknown, deps: unknown[]) => memo(() => fn, deps),
    useRef: (initial: any) => { const i = h.index++; if (!(i in h.cells)) h.cells[i] = { current: initial }; return h.cells[i]; },
    useState: (initial: any) => { const i = h.index++, cells = h.cells; if (!(i in cells)) cells[i] = initial;
      return [cells[i], (value: any) => { cells[i] = typeof value === "function" ? value(cells[i]) : value; h.dirty = true; }]; },
    useEffect: (effect: () => (() => void) | void, deps?: unknown[]) => { const i = h.index++, old = h.cells[i];
      if (!old || !same(old.deps, deps)) { const cells = h.cells; cells[i] = { deps, cleanup: old?.cleanup };
        h.effects.push(() => { old?.cleanup?.(); cells[i].cleanup = effect(); }); } },
  } };
});
vi.mock("../../aranya-next/node_modules/react/index.js", () => host.react);
vi.mock("../../aranya-next/src/lib/api/auth", () => ({ refresh: host.h.refresh, me: host.h.me, login: host.h.login, logout: host.h.logout, register: host.h.register }));
vi.mock("../../aranya-next/src/lib/api/http", () => ({ apiFetch: host.h.fetch }));
vi.mock("../../aranya-next/src/lib/demo", () => ({ DEMO_MODE: false }));
vi.mock("../../aranya-next/src/components/MarketContext", () => ({ useMarket: () => ({ market: "intl" }) }));

import { AuthProvider } from "../../aranya-next/src/components/AuthContext";
import { CartProvider } from "../../aranya-next/src/components/CartContext";
import type { CartItem, Spice } from "../../aranya-next/src/lib/types";
import { addCartItem, bootstrapCart, registerCartMutationDrain, waitForCartMutations } from "../../aranya-next/src/lib/api/cart";

const h = host.h;
const user = { id: "user-1", name: "Shopper", email: "fixture@example.com", role: "CUSTOMER" };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
function render() {
  for (let i = 0; i < 20; i++) { h.dirty = false; h.index = 0; AuthProvider({ children: null });
    if (h.cartEnabled) {
      const authCells = h.cells, authValue = h.value;
      h.cells = h.cartCells; h.index = 0; CartProvider({ children: null }); h.cartValue = h.value;
      h.cells = authCells; h.value = authValue;
    }
    for (const effect of h.effects.splice(0)) effect(); if (!h.dirty) return; }
  throw new Error("Auth did not settle");
}
async function flush() { for (let i = 0; i < 20; i++) { await Promise.resolve(); if (h.dirty) render(); } }
let unregister: (() => void) | undefined;
beforeEach(async () => {
  await waitForCartMutations(); vi.resetAllMocks();
  h.cells = []; h.index = 0; h.effects = []; h.dirty = false; h.value = null;
  h.cartCells = []; h.cartEnabled = false; h.cartValue = null;
  h.refresh.mockResolvedValue(false); h.login.mockResolvedValue(user); h.logout.mockResolvedValue(undefined);
  h.fetch.mockResolvedValue({ ok: true });
});
afterEach(() => { unregister?.(); unregister = undefined; for (const cell of [...h.cells, ...h.cartCells]) cell?.cleanup?.(); vi.unstubAllGlobals(); });

describe("login/cart reconciliation ordering", () => {
  it("recovers the actual Auth+Cart providers after first-session failure with one queued initial add", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal("window", { location: { search: "" } });
    h.cartEnabled = true;
    h.refresh.mockRejectedValueOnce(new Error("first restore unavailable"));
    const items: CartItem[] = [];
    h.fetch.mockImplementation(async (path: string) => {
      if (path === "/cart/items") {
        items.push({ id: "added-to-user", quantity: 1,
          product: { id: "p", name: "Cinnamon", slug: "cinnamon", color: "#aaa", images: [] },
          variant: { id: "v", sku: "fixture", weight: 100, price: "10", stock: 10, currency: "USD", market: "INTERNATIONAL" } });
        return { item: { id: "added-to-user" } };
      }
      return path === "/cart/bootstrap" ? { cart: { items } } : { ok: true };
    });
    render(); await flush(); expect(h.value.sessionError).toBeTruthy();
    h.cartValue.add({ name: "Cinnamon", usd: "10", lkr: "3000", color: "#aaa", base: "#aaa", deep: "#aaa", surface: "#aaa" } as Spice,
      "100g", "Whole", 1, { productId: "p", variantId: "v" });
    await flush(); expect(h.fetch).not.toHaveBeenCalled();
    await h.value.signIn("fixture@example.com", "password"); await flush();
    expect(h.value.user).toEqual(user); expect(h.value.loading).toBe(false);
    expect(h.cartValue.items).toEqual([expect.objectContaining({ variantId: "v", qty: 1, backendItemId: "added-to-user" })]);
    expect(h.fetch.mock.calls.map(call => call[0])).toEqual(["/cart/merge", "/cart/items", "/cart/bootstrap"]);
    expect(h.login).toHaveBeenCalledTimes(1); expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it("drains a not-yet-dispatched guest add before login, then awaits merge before publishing the user", async () => {
    render(); await flush();
    const add = deferred<any>(), merge = deferred<any>();
    h.fetch.mockImplementation((path: string) => path === "/cart/items" ? add.promise : merge.promise);
    // Match CartContext: an optimistic click schedules an API call in its own
    // promise queue, so the API mutationTail does not include it immediately.
    const providerQueue = Promise.resolve().then(() => addCartItem({ productId: "p", variantId: "v", quantity: 1 }));
    unregister = registerCartMutationDrain(() => providerQueue);
    const result = h.value.signIn("fixture@example.com", "password");
    await flush(); expect(h.login).not.toHaveBeenCalled(); expect(h.value.loading).toBe(false);
    add.resolve({ item: { id: "guest-item" } }); await flush();
    expect(h.login).toHaveBeenCalledTimes(1);
    expect(h.fetch).toHaveBeenLastCalledWith("/cart/merge", { method: "POST", auth: true });
    expect(h.value.user).toBeNull(); expect(h.value.loading).toBe(true);
    merge.resolve({ ok: true }); await result; await flush();
    expect(h.value.user).toEqual(user); expect(h.value.loading).toBe(false); expect(h.value.sessionRevision).toBe(1);
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it("publishes successful login when merge fails without replaying login or merge", async () => {
    render(); await flush(); h.fetch.mockRejectedValueOnce(new Error("merge failed"));
    await h.value.signIn("fixture@example.com", "password"); await flush();
    expect(h.value.user).toEqual(user); expect(h.value.sessionRevision).toBe(1);
    expect(h.login).toHaveBeenCalledTimes(1); expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("waits for the initial restore before login and never starts a second refresh", async () => {
    const refresh = deferred<boolean>(); h.refresh.mockReturnValue(refresh.promise); render(); await flush();
    const result = h.value.signIn("fixture@example.com", "password"); await flush();
    expect(h.login).not.toHaveBeenCalled(); refresh.resolve(false); await result; await flush();
    expect(h.refresh).toHaveBeenCalledTimes(1); expect(h.value.user).toEqual(user);
  });

  it("clears identity and signals a new cart scope on signout, including failed logout", async () => {
    h.refresh.mockResolvedValue(true); h.me.mockResolvedValue(user); render(); await flush();
    h.logout.mockRejectedValueOnce(new Error("logout unavailable"));
    await expect(h.value.signOut()).rejects.toThrow("logout unavailable"); await flush();
    expect(h.value.user).toBeNull(); expect(h.value.sessionRevision).toBe(1);
    expect(h.value.sessionError).toContain("signing out"); expect(h.value.loading).toBe(false);
    expect(h.logout).toHaveBeenCalledTimes(1);
  });

  it("bootstraps through the passive route with the caller's abort signal", async () => {
    const controller = new AbortController(); await bootstrapCart({ signal: controller.signal });
    expect(h.fetch).toHaveBeenCalledWith("/cart/bootstrap", { auth: true, signal: controller.signal });
  });

  it("serializes first-guest API additions and continues after a rejected add", async () => {
    const first = deferred<any>(); h.fetch.mockImplementationOnce(() => first.promise).mockResolvedValueOnce({ item: { id: "second" } });
    const a = addCartItem({ productId: "p", variantId: "v", quantity: 1 });
    const b = addCartItem({ productId: "p", variantId: "v", quantity: 1 });
    await flush(); expect(h.fetch).toHaveBeenCalledTimes(1);
    first.resolve({ item: { id: "first" } }); await a; await b;
    expect(h.fetch).toHaveBeenCalledTimes(2);
    h.fetch.mockRejectedValueOnce(new Error("rejected")).mockResolvedValueOnce({ item: { id: "next" } });
    await expect(addCartItem({ productId: "p", variantId: "v", quantity: 1 })).rejects.toThrow("rejected");
    await expect(addCartItem({ productId: "p", variantId: "v", quantity: 1 })).resolves.toEqual({ item: { id: "next" } });
  });
});
