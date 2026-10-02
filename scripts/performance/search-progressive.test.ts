import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { loadFrontend, hookHost, frontendRequire, nodes, text } from "./frontend-test-runtime";
import type { SearchClient } from "../../aranya-next/src/components/search/SearchClient";
import type { SearchView } from "../../aranya-next/src/lib/api/search";
import type { CatalogSpice } from "../../aranya-next/src/lib/types";
const publicRead = vi.hoisted(() => vi.fn());
vi.mock("../../aranya-next/src/lib/api/public", async original => ({ ...await original<Record<string, unknown>>(), publicApiFetch: publicRead }));
import * as searchApi from "../../aranya-next/src/lib/api/search";
import { publicResource } from "../../aranya-next/src/lib/api/public";
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const spice = (slug: string) => ({ slug, name: slug, category: "Whole Spices", form: "Whole", flavour: [], origin: "Ceylon", usd: "$9.00", lkr: "Rs 2700", rating: 4.5 } as CatalogSpice);
const view = (ids = ["cinnamon"], cursor: string | null = "product-next", total = 42): SearchView => ({
  products: { items: ids.map(spice), total, nextCursor: cursor, hasNextPage: !!cursor },
  journal: { items: [], total: 0, nextCursor: null, hasNextPage: false },
});
let host: ReturnType<typeof hookHost>; let market: "intl" | "local"; let initial: SearchView;
const remote = vi.fn(), bestsellers = vi.fn();
const makeImports = (react: unknown) => ({
  react, "next/link": { default: "a" }, "../primitives/Motif": { Eyebrow: "span" }, "../primitives/Icon": { Icon: () => null }, "../primitives/ImageSlot": { ImageSlot: () => null },
  "../cards/Cards": { CardCFinal: ({ spice }: { spice: CatalogSpice }) => frontendRequire("react").createElement("span", { "data-result": spice.slug }, spice.name) },
  "../MarketContext": { useMarket: () => ({ market }) }, "@/lib/api/products": { getBestsellers: bestsellers },
  "@/lib/catalog-data": { toCatalogSpice: (value: CatalogSpice) => value },
  "@/lib/api/search": { ...searchApi, searchCatalogue: remote, searchView: (value: SearchView) => value },
});
beforeEach(() => { vi.useFakeTimers(); host = hookHost(); market = "intl"; initial = view(); remote.mockReset(); bestsellers.mockReset(); publicRead.mockReset(); bestsellers.mockResolvedValue({ products: [], market: "LOCAL" }); });
afterEach(() => { host.unmount(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const mount = () => {
  vi.stubGlobal("window", { history: { replaceState: vi.fn() }, location: { pathname: "/search" } });
  const { SearchClient: Component } = loadFrontend<{ SearchClient: typeof SearchClient }>("components/search/SearchClient.tsx", makeImports(host.react), { window: globalThis.window });
  const props = { initialResults: initial, best: [], indexMarket: "intl" as const, initialQuery: "cinnamon" };
  host.mount(() => Component(props));
  return { tree: () => host.value<any>(), click: (label: string) => { const node = nodes(host.value(), node => node.type === "button" && text(node) === label)[0]; if (!node) throw new Error("Missing button " + label); node.props.onClick(); host.render(); },
    query: (q: string) => { const input = nodes(host.value(), node => node.type === "input")[0]; input.props.onChange({ target: { value: q } }); host.render(); } };
};
const tick = async () => { await vi.advanceTimersByTimeAsync(220); await host.flush(); };
describe("compact progressive search", () => {
  it("encodes the shared query, requests 20 cards, and forwards cancellation", async () => {
    const controller = new AbortController(); publicRead.mockResolvedValue({}); await searchApi.searchCatalogue({ q: "  cinnamon & tea  ", sort: "price-asc", resource: "products", productCursor: "opaque" }, { signal: controller.signal });
    const [path, options] = publicRead.mock.calls[0]; const qs = new URL(path, "http://fixture.invalid").searchParams;
    expect(qs.get("q")).toBe("cinnamon & tea"); expect(qs.get("limit")).toBe("20"); expect(qs.get("sort")).toBe("price-asc"); expect(qs.get("productCursor")).toBe("opaque"); expect(options.signal).toBe(controller.signal);
    expect(publicResource(path).tags).toEqual(["products", "blog"]); expect(() => publicResource("/search/private")).toThrow();
  });
  it("renders first-page cards, global tab counts and an explicit continuation without fetching", () => {
    vi.useRealTimers(); const React = frontendRequire("react"), { renderToStaticMarkup } = frontendRequire("react-dom/server");
    const { SearchClient: Component } = loadFrontend<{ SearchClient: typeof SearchClient }>("components/search/SearchClient.tsx", makeImports(React));
    const html = renderToStaticMarkup(React.createElement(Component, { initialResults: view(Array.from({ length: 20 }, (_, i) => "cinnamon-" + i)), best: [], indexMarket: "intl", initialQuery: "cinnamon" }));
    expect((html.match(/data-result=/g) ?? []).length).toBe(20); expect(html).toContain("<b>42</b>"); expect(html).toContain("Load more spices"); expect(remote).not.toHaveBeenCalled(); expect(bestsellers).not.toHaveBeenCalled();
  });
  it("loads only the selected collection and rejects a synchronous double click", async () => {
    const next = deferred<SearchView>(); remote.mockReturnValue(next.promise); const ui = mount(); await tick(); expect(remote).not.toHaveBeenCalled();
    const button = nodes(ui.tree(), node => node.type === "button" && text(node) === "Load more spices")[0]; button.props.onClick(); button.props.onClick(); expect(remote).toHaveBeenCalledTimes(1); expect(remote.mock.calls[0][0]).toMatchObject({ q: "cinnamon", limit: 20, resource: "products", productCursor: "product-next" });
    next.resolve(view(["cinnamon-second"], null)); await host.flush(); expect(nodes(ui.tree(), node => node.props?.spice).map(node => node.props.spice.slug)).toEqual(["cinnamon", "cinnamon-second"]); expect(text(ui.tree())).not.toContain("Load more spices");
  });
  it("retains cards and retries the same cursor after a continuation failure", async () => {
    remote.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(view(["cinnamon-second"], null)); const ui = mount(); ui.click("Load more spices"); await host.flush(); expect(text(ui.tree())).toContain("Unavailable");
    expect(nodes(ui.tree(), node => node.props?.spice)).toHaveLength(1); ui.click("Try again"); await host.flush(); expect(remote.mock.calls.map(call => call[0].productCursor)).toEqual(["product-next", "product-next"]); expect(nodes(ui.tree(), node => node.props?.spice)).toHaveLength(2);
  });
  it("cancels an old-query page and ignores its late completion", async () => {
    const old = deferred<SearchView>(); remote.mockReturnValueOnce(old.promise).mockResolvedValueOnce(view(["pepper"], null, 1)); const ui = mount(); ui.click("Load more spices"); const signal = remote.mock.calls[0][1].signal;
    ui.query("pepper"); expect(signal.aborted).toBe(true); await tick(); old.resolve(view(["wrong-query"], null)); await host.flush(); expect(nodes(ui.tree(), node => node.props?.spice).map(node => node.props.spice.slug)).toEqual(["pepper"]);
  });
  it("requests global sort from page one and clears former currency cards on market change", async () => {
    remote.mockResolvedValue(view(["low-price"], null, 1)); const ui = mount(); const select = nodes(ui.tree(), node => node.type === "select")[0]; select.props.onChange({ target: { value: "price-asc" } }); host.render(); await tick(); expect(remote.mock.calls[0][0]).toMatchObject({ sort: "price-asc", limit: 20 }); expect(remote.mock.calls[0][0].productCursor).toBeUndefined();
    market = "local"; host.render(); expect(nodes(ui.tree(), node => node.props?.spice)).toHaveLength(0); await tick(); expect(bestsellers).toHaveBeenCalledTimes(1); expect(remote).toHaveBeenCalledTimes(2);
  });
  it("rejects looping cursors instead of making an endless Load more chain", async () => {
    remote.mockResolvedValue(view(["duplicate"], "product-next")); const ui = mount(); ui.click("Load more spices"); await host.flush(); expect(text(ui.tree())).toContain("invalid next search page"); expect(nodes(ui.tree(), node => node.props?.spice)).toHaveLength(1);
  });
  it("deduplicates boundary records while keeping server totals and global order", () => {
    const combined = searchApi.appendSearchPage(view().products, view(["cinnamon", "next"], null, 43).products); expect(combined.items.map(item => item.slug)).toEqual(["cinnamon", "next"]); expect(combined.total).toBe(43); expect(combined.nextCursor).toBeNull();
  });
});
