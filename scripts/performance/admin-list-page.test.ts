import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { loadFrontend, hookHost } from "./frontend-test-runtime";
import type { useAdminPage } from "../../aranya-next/src/components/admin/useAdminPage";
const api = vi.hoisted(() => vi.fn());
vi.mock("../../aranya-next/src/lib/api/http", () => ({ apiFetch: api, getAccessToken: () => null }));
import { listAdminProducts, listAdminBlogs, listAdminRecipes, listAdminGifts, listAuditLogs } from "../../aranya-next/src/lib/api/admin";
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
const page = (items: { id: string }[], nextCursor: string | null = null, total = 41) => ({ items, nextCursor, total, counts: { all: total, PUBLISHED: total }, hasNextPage: !!nextCursor });
const rows = (start: number, n = 20) => Array.from({ length: n }, (_, i) => ({ id: String(start + i) }));
let host: ReturnType<typeof hookHost>;
beforeEach(() => { vi.useFakeTimers(); api.mockReset(); host = hookHost(); });
afterEach(() => { host.unmount(); vi.useRealTimers(); });
const tick = async () => { await vi.advanceTimersByTimeAsync(180); await host.flush(); };
const mount = (load: any, initialScope = "all") => {
  const { useAdminPage: hook } = loadFrontend<{ useAdminPage: typeof useAdminPage }>("components/admin/useAdminPage.ts", { react: host.react });
  let scope = initialScope; let items: { id: string }[] = [];
  const onItems = vi.fn(next => { items = typeof next === "function" ? next(items) : next; });
  const render = () => hook(scope, load, onItems);
  host.mount(render);
  return { current: () => host.value<ReturnType<typeof render>>(), items: () => items, scope: (next: string) => { scope = next; host.render(); } };
};
describe("admin server pages", () => {
  it.each([listAdminProducts, listAdminBlogs, listAdminRecipes, listAdminGifts])("opts into bounded pages and forwards cancellation", async list => {
    const controller = new AbortController(); api.mockResolvedValue({ products: [], blogs: [], recipes: [], gifts: [] });
    await list({ q: "forest", status: "PUBLISHED", cursor: "opaque", category: "Whole Spices", lowStock: true }, { signal: controller.signal });
    const [path, options] = api.mock.calls[0]; const params = new URL(path, "http://fixture.invalid").searchParams;
    expect(params.get("view")).toBe("page"); expect(params.get("limit")).toBe("20"); expect(params.get("cursor")).toBe("opaque"); expect(params.get("q")).toBe("forest"); expect(options.signal).toBe(controller.signal); expect(options.auth).toBe(true);
  });
  it("keeps audit counts/totals while adapting the resource key", async () => {
    const response = { items: [{ id: "log" }], total: 51, counts: { all: 51, warn: 7 }, nextCursor: "next", hasNextPage: true }; api.mockResolvedValue(response);
    await expect(listAuditLogs({ filter: "warn", q: "refund" })).resolves.toMatchObject({ logs: response.items, total: 51, counts: response.counts, nextCursor: "next" });
    expect(api.mock.calls[0][0]).toContain("filter=warn");
  });
  it("loads one page, uses server-global totals, and pages only after explicit Next", async () => {
    const load = vi.fn(async cursor => page(cursor ? rows(21) : rows(1), cursor ? "tail" : "after20")); const list = mount(load);
    expect(load).not.toHaveBeenCalled(); await tick(); expect(load).toHaveBeenCalledTimes(1); expect(list.items()).toHaveLength(20); expect(list.current().counts.PUBLISHED).toBe(41);
    list.current().next(); host.render(); await tick(); expect(load.mock.calls[1][0]).toBe("after20"); expect(list.items()[0].id).toBe("21"); expect(list.current().pageIndex).toBe(1);
    list.current().previous(); host.render(); await tick(); expect(load.mock.calls[2][0]).toBeUndefined(); expect(list.current().pageIndex).toBe(0);
  });
  it("aborts stale filtered reads and ignores a late old response", async () => {
    const old = deferred<ReturnType<typeof page>>(); const signals: AbortSignal[] = [];
    const load = vi.fn((_cursor, signal) => { signals.push(signal); return signals.length === 1 ? old.promise : Promise.resolve(page([{ id: "matching" }], null, 1)); }); const list = mount(load);
    await tick(); list.scope("q=matching"); expect(signals[0].aborted).toBe(true); await tick(); old.resolve(page([{ id: "stale" }])); await host.flush(); expect(list.items()).toEqual([{ id: "matching" }]); expect(list.current().total).toBe(1);
  });
  it("refreshes authoritative data and backs off an emptied last page", async () => {
    let deleted = false; const load = vi.fn(async cursor => cursor === "tail" ? page(deleted ? [] : rows(41, 1), null, deleted ? 40 : 41) : page(cursor ? rows(21) : rows(1), cursor ? "tail" : "after20", deleted ? 40 : 41)); const list = mount(load);
    await tick(); list.current().next(); host.render(); await tick(); list.current().next(); host.render(); await tick(); expect(list.current().pageIndex).toBe(2);
    deleted = true; list.current().refresh(); host.render(); await tick(); await tick(); expect(list.current().pageIndex).toBe(1); expect(list.items()).toHaveLength(20); expect(list.current().total).toBe(40); expect(load.mock.calls.at(-1)?.[0]).toBe("after20");
  });
  it("shows request failures and retries without starting an export implicitly", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(page(rows(1))); const list = mount(load); const collect = vi.fn();
    await tick(); expect(list.current().error).toBe("Unavailable"); expect(collect).not.toHaveBeenCalled(); list.current().refresh(); host.render(); await tick(); expect(list.current().error).toBeNull(); expect(list.items()).toHaveLength(20);
  });
  it("cancels an explicit export on unmount and never consumes its late data", async () => {
    const load = vi.fn(async () => page(rows(1))); const list = mount(load); await tick(); const pending = deferred<number[]>(); let signal!: AbortSignal; const consume = vi.fn();
    const exportPromise = list.current().exportAll(next => { signal = next; return pending.promise; }, consume); host.unmount(); expect(signal.aborted).toBe(true); pending.resolve([1, 2]); await exportPromise; expect(consume).not.toHaveBeenCalled();
  });
});
