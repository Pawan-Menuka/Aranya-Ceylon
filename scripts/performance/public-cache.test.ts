import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IncrementalCache } from "../../aranya-next/node_modules/next/dist/server/lib/incremental-cache/index.js";
import { verifiedCookieMarket } from "../../aranya-next/src/lib/market-cookie.server";

const request = vi.hoisted(() => ({ market: undefined as string | undefined, visitor: "guest-a" }));
vi.mock("next/headers", () => ({ cookies: () => ({
  get: (name: string) => name === "x-market" && request.market ? { value: request.market } : undefined,
  toString: () => `x-market=${request.market ?? ""}; guestCartToken=${request.visitor}; refresh=${request.visitor}`,
}) }));
const secret = "public-cache-unit-fixture-secret-only";
// Independent oracle for the canonical, guest-independent cookie the cache layer sends upstream.
function canonicalMarketCookie(market: string, key: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ market: market === "local" ? "local" : "international" })).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", key).update(`${header}.${payload}`).digest("base64url")}`;
}
function token(claims: Record<string, unknown>, key = secret, header = { alg: "HS256" }): string {
  const parts = [header, claims].map(value => Buffer.from(JSON.stringify(value)).toString("base64url"));
  return `${parts.join(".")}.${createHmac("sha256", key).update(parts.join(".")).digest("base64url")}`;
}
beforeEach(() => {
  vi.resetModules(); vi.stubGlobal("window", undefined); vi.stubEnv("MARKET_COOKIE_SECRET", secret);
  request.market = undefined; request.visitor = "guest-a";
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("verified public Data Cache", () => {
  it("gives distinct guest/auth cookies and market JWT expirations the same Next cache key, while separating markets and queries", async () => {
    // Use Next's real cache key algorithm, including its headers/cache fields
    // (IncrementalCache.generateCacheKey; it was fetchCacheKey before Next 15).
    const keys: string[] = [];
    const upstream = vi.fn(); const entries = new Map<string, unknown>();
    vi.stubGlobal("fetch", vi.fn(async (url, init) => {
      const key = await IncrementalCache.prototype.generateCacheKey.call({} as IncrementalCache, url, init);
      keys.push(key);
      if (!entries.has(key)) {
        upstream();
        const raw = init.headers.get("cookie").slice("x-market=".length);
        entries.set(key, { market: verifiedCookieMarket(raw, secret), count: upstream.mock.calls.length });
      }
      expect(init.headers.has("authorization")).toBe(false);
      expect(init.headers.get("cookie")).not.toMatch(/guestCartToken|refresh/);
      return Response.json(entries.get(key));
    }));
    const { publicApiFetch } = await import("../../aranya-next/src/lib/api/public");
    request.market = token({ market: "local", exp: Math.floor(Date.now() / 1000) + 300 });
    const first = await publicApiFetch("/products?sort=newest&limit=8");
    request.visitor = "signed-in-b";
    request.market = token({ market: "local", exp: Math.floor(Date.now() / 1000) + 1000 });
    expect(await publicApiFetch("/products?limit=8&sort=newest")).toEqual(first);
    expect(keys[1]).toBe(keys[0]); expect(upstream).toHaveBeenCalledTimes(1);
    request.market = token({ market: "international" });
    expect(await publicApiFetch("/products?limit=8&sort=newest")).toMatchObject({ market: "intl" });
    expect(keys[2]).not.toBe(keys[0]);
    await publicApiFetch("/products?limit=9&sort=newest");
    expect(keys[3]).not.toBe(keys[2]); expect(upstream).toHaveBeenCalledTimes(3);
  });

  it("defaults tampered, expired, future and unsupported market tokens to the backend's international market and shell", async () => {
    const invalid = [token({ market: "local" }, "wrong-secret"), token({ market: "local", exp: 1 }),
      token({ market: "local", nbf: Math.floor(Date.now() / 1000) + 999 }), "local",
      token({ market: "local", iat: "invalid" }), token({ market: "local" }, secret, { alg: "HS512" })];
    const fetcher = vi.fn(async () => Response.json({})); vi.stubGlobal("fetch", fetcher);
    const { publicApiFetch } = await import("../../aranya-next/src/lib/api/public");
    const { resolveMarket } = await import("../../aranya-next/src/lib/market");
    for (const value of invalid) {
      request.market = value; expect(await resolveMarket()).toBe("intl");
      await publicApiFetch("/products");
      expect(fetcher.mock.lastCall![1].headers.get("cookie")).toBe(`x-market=${canonicalMarketCookie("intl", secret)}`);
    }
  });

  it("keeps legacy local functionality without the optional secret and disables caching", async () => {
    vi.stubEnv("MARKET_COOKIE_SECRET", ""); request.market = token({ market: "local", exp: 1 });
    const fetcher = vi.fn(async () => Response.json({})); vi.stubGlobal("fetch", fetcher);
    const { publicApiFetch } = await import("../../aranya-next/src/lib/api/public");
    const { resolveMarket } = await import("../../aranya-next/src/lib/market");
    expect(await resolveMarket()).toBe("local");
    await publicApiFetch("/products");
    const init = fetcher.mock.calls[0][1];
    expect(init.cache).toBe("no-store"); expect(init.next).toBeUndefined();
    expect(init.headers.get("cookie")).toBe(`x-market=${request.market}`);
    expect(init.headers.has("authorization")).toBe(false);
  });

  it("tags all public resources and dependent reads; honors explicitly uncached reads", async () => {
    const fetcher = vi.fn(async () => Response.json({})); vi.stubGlobal("fetch", fetcher);
    const { publicApiFetch } = await import("../../aranya-next/src/lib/api/public");
    const cases = [
      ["/products/cinnamon", ["products", "product:cinnamon"], 300],
      ["/products/featured", ["products"], 300], ["/products/search?q=tea", ["products"], 300],
      ["/categories", ["categories", "products"], 600], ["/blog/story", ["blog", "blog:story"], 300],
      ["/recipes/rice", ["recipes", "recipe:rice", "products"], 3600],
      ["/gifts/box", ["gifts", "gift:box", "products"], 3600],
    ] as const;
    for (const [path, tags, ttl] of cases) {
      await publicApiFetch(path);
      expect(fetcher.mock.lastCall![1]).toMatchObject({ next: { revalidate: ttl, tags } });
      expect(fetcher.mock.lastCall![1].cache).toBeUndefined();
    }
    await publicApiFetch("/products", { revalidate: 0 });
    expect(fetcher.mock.lastCall![1].cache).toBe("no-store"); expect(fetcher.mock.lastCall![1].next).toBeUndefined();
  });

  it("rejects private, admin, normalized traversal and off-origin paths before fetching", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const { publicApiFetch } = await import("../../aranya-next/src/lib/api/public");
    for (const path of ["/cart", "/orders", "/auth/me", "/admin/products", "/products/../orders", "//other.test/products", "https://other.test/products"])
      await expect(publicApiFetch(path)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("never caches private reads even with force-cache hints, while preserving their original cookies/auth", async () => {
    const fetcher = vi.fn(async () => Response.json({})); vi.stubGlobal("fetch", fetcher);
    const { apiFetch } = await import("../../aranya-next/src/lib/api/http");
    await apiFetch("/cart", { cache: "force-cache", revalidate: 300, tags: ["products"],
      next: { revalidate: 999 }, headers: { authorization: "Bearer private" } } as Parameters<typeof apiFetch>[1]);
    const init = fetcher.mock.calls[0][1];
    expect(init.cache).toBe("no-store"); expect(init.next).toBeUndefined();
    expect(init.headers.get("authorization")).toBe("Bearer private");
    expect(init.headers.get("cookie")).toContain("guestCartToken=guest-a");
  });

  it("bounds public body consumption and honors caller cancellation", async () => {
    vi.stubEnv("MARKET_COOKIE_SECRET", "");
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => new Response(new ReadableStream({ start() {} })));
    vi.stubGlobal("fetch", fetcher);
    const { publicApiFetch } = await import("../../aranya-next/src/lib/api/public");
    const check = expect(publicApiFetch("/products", { timeoutMs: 25 })).rejects.toMatchObject({ status: 504, code: "request_timeout" });
    await vi.advanceTimersByTimeAsync(26); await check;
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    const controller = new AbortController(); controller.abort();
    await expect(publicApiFetch("/products", { signal: controller.signal })).rejects.toMatchObject({ code: "request_cancelled" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("allows browser conditional public reads without attaching private bearer tokens or replaying auth", async () => {
    vi.stubGlobal("window", {});
    const fetcher = vi.fn(async () => Response.json({ error: "Unauthenticated" }, { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    const { setAccessToken } = await import("../../aranya-next/src/lib/api/http");
    setAccessToken("private-user-access-token");
    const { publicApiFetch } = await import("../../aranya-next/src/lib/api/public");
    await expect(publicApiFetch("/products")).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.lastCall![0]).toBe("/api/products");
    expect(fetcher.mock.lastCall![1]).toMatchObject({ cache: "no-cache", credentials: "include" });
    expect(fetcher.mock.lastCall![1].headers).toBeUndefined();
  });
});
