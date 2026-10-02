import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { requestTimeoutMs, withRequestDeadline } from "../../aranya-next/src/lib/api/request-deadline";

vi.mock("next/headers", () => ({ cookies: () => ({ toString: () => "x-market=signed-fixture; guestCartToken=fixture" }) }));
const json = (data: unknown, status = 200) => Response.json(data, { status });
beforeEach(() => { vi.useFakeTimers(); vi.resetModules(); vi.stubGlobal("window", {}); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("request deadlines and replay", () => {
  it("bounds a stalled response body, aborts transport, and does not repeat a write", async () => {
    let signal: AbortSignal;
    const fetcher = vi.fn(async (_url, init) => {
      signal = init.signal;
      return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("{")); } }));
    });
    vi.stubGlobal("fetch", fetcher);
    const { apiFetch } = await import("../../aranya-next/src/lib/api/http");
    const check = expect(apiFetch("/checkout/intent", { method: "POST", body: { id: "fixture" }, timeoutMs: 25 }))
      .rejects.toMatchObject({ status: 504, code: "request_timeout" });
    await vi.advanceTimersByTimeAsync(26);
    await check;
    expect(signal!.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("honors caller cancellation and never sends a pre-cancelled request", async () => {
    const fetcher = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    const { apiFetch } = await import("../../aranya-next/src/lib/api/http");
    const controller = new AbortController();
    const check = expect(apiFetch("/products", { signal: controller.signal })).rejects.toMatchObject({ code: "request_cancelled" });
    controller.abort();
    await check;
    const cancelled = new AbortController(); cancelled.abort();
    await expect(apiFetch("/products", { signal: cancelled.signal })).rejects.toMatchObject({ code: "request_cancelled" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("shares one rotating refresh between startup and concurrent expired-session reads", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init) => {
      calls.push(String(url));
      if (String(url).endsWith("/auth/refresh")) {
        await new Promise(r => setTimeout(r, 10));
        return json({ accessToken: "fixture-access" });
      }
      return init.headers.get("authorization") === "Bearer fixture-access" ? json({ ok: true }) : json({ error: "Expired" }, 401);
    }));
    const { apiFetch, refreshSession } = await import("../../aranya-next/src/lib/api/http");
    const work = Promise.all([refreshSession(), apiFetch("/cart", { auth: true }), apiFetch("/auth/me", { auth: true })]);
    await vi.advanceTimersByTimeAsync(20);
    expect(await work).toEqual([true, { ok: true }, { ok: true }]);
    expect(calls.filter(x => x.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(calls.filter(x => x.endsWith("/cart"))).toHaveLength(2);
  });

  it("does not refresh repeatedly after a rejected refresh", async () => {
    const fetcher = vi.fn(async () => json({ error: "Signed out" }, 401));
    vi.stubGlobal("fetch", fetcher);
    const { apiFetch } = await import("../../aranya-next/src/lib/api/http");
    await expect(apiFetch("/cart", { auth: true })).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps a cancelled waiter from aborting another request's shared refresh", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init) => {
      if (String(url).endsWith("/auth/refresh")) {
        signals.push(init.signal); await new Promise(r => setTimeout(r, 50));
        return json({ accessToken: "fixture-access" });
      }
      return init.headers.get("authorization") ? json({ ok: true }) : json({}, 401);
    }));
    const { apiFetch, refreshSession } = await import("../../aranya-next/src/lib/api/http");
    const refresh = refreshSession();
    const check = expect(apiFetch("/cart", { auth: true, timeoutMs: 20 })).rejects.toMatchObject({ code: "request_timeout" });
    await vi.advanceTimersByTimeAsync(25); await check;
    expect(signals[0].aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(30); expect(await refresh).toBe(true);
  });

  it("classifies unavailable transport, keeps server cookies, and ignores cache hints on the private path", async () => {
    vi.stubGlobal("window", undefined); vi.resetModules();
    const fetcher = vi.fn(async () => json({ ok: true })); vi.stubGlobal("fetch", fetcher);
    const { apiFetch } = await import("../../aranya-next/src/lib/api/http");
    await apiFetch("/products", { revalidate: 300, tags: ["products"] });
    expect(fetcher.mock.calls[0][1].headers.get("cookie")).toContain("x-market=signed-fixture");
    expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
    expect(fetcher.mock.calls[0][1].next).toBeUndefined();
    fetcher.mockRejectedValueOnce(new TypeError("offline"));
    await expect(apiFetch("/products")).rejects.toMatchObject({ status: 502, code: "api_unreachable" });
  });

  it("uses separate read/session/payment/upload budgets and releases completed timers", async () => {
    expect(requestTimeoutMs("/products")).toBe(10000);
    expect(requestTimeoutMs("/auth/refresh", "POST")).toBe(5000);
    expect(requestTimeoutMs("/checkout/intent", "POST")).toBe(60000);
    expect(requestTimeoutMs("/products/fixture/images", "POST")).toBe(120000);
    expect(await withRequestDeadline(1000, undefined, async () => "complete")).toBe("complete");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("BFF regression checks", () => {
  it("never forwards a mutation whose incoming body completes after its deadline", async () => {
    const fetcher = vi.fn(async () => json({ ok: true }));vi.stubGlobal("fetch", fetcher);
    const { POST } = await import("../../aranya-next/src/app/api/[...path]/route");
    const req = new NextRequest("http://localhost/api/cart/items", { method: "POST", body: "{}" });
    let finishBody!: (body: ArrayBuffer) => void;
    vi.spyOn(req, "arrayBuffer").mockImplementation(() => new Promise(resolve => { finishBody = resolve; }));
    const work = POST(req, { params: { path: ["cart", "items"] } });
    await vi.advanceTimersByTimeAsync(15001);
    expect((await work).status).toBe(504);
    finishBody(new ArrayBuffer(0));await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards cookie/auth/body once and relays each rotated cookie with the correct scope", async () => {
    const response = json({ ok: true });
    response.headers.append("set-cookie", "refresh=fixture; Path=/auth; HttpOnly; SameSite=Lax");
    response.headers.append("set-cookie", "guestCartToken=fixture; Path=/; HttpOnly");
    const fetcher = vi.fn(async () => response); vi.stubGlobal("fetch", fetcher);
    const { POST } = await import("../../aranya-next/src/app/api/[...path]/route");
    const req = new NextRequest("http://localhost/api/auth/refresh?fixture=1", { method: "POST", body: "{}", headers: {
      cookie: "refresh=old; x-market=signed-fixture", authorization: "Bearer old", "x-forwarded-for": "spoofed",
    } });
    const res = await POST(req, { params: { path: ["auth", "refresh"] } });
    const cookies = res.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain("Path=/api/auth"); expect(cookies[1]).toContain("Path=/;");
    const init = fetcher.mock.calls[0][1];
    expect(init.headers.get("cookie")).toContain("refresh=old");
    expect(init.headers.get("authorization")).toBe("Bearer old");
    expect(init.headers.has("x-forwarded-for")).toBe(false);
    expect(new TextDecoder().decode(init.body)).toBe("{}"); expect(init.redirect).toBe("manual");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns a no-store 504 for stalled upstream bodies and a 502 for unreachable APIs", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ start() {} }))));
    const { GET } = await import("../../aranya-next/src/app/api/[...path]/route");
    const work = GET(new NextRequest("http://localhost/api/products"), { params: { path: ["products"] } });
    await vi.advanceTimersByTimeAsync(8001);
    const res = await work;
    expect(res.status).toBe(504); expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ error: "request_timeout" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("unreachable"); }));
    expect((await GET(new NextRequest("http://localhost/api/products"), { params: { path: ["products"] } })).status).toBe(502);
  });

  it("preserves empty logout responses and caller cancellation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    const { POST, GET } = await import("../../aranya-next/src/app/api/[...path]/route");
    const res = await POST(new NextRequest("http://localhost/api/auth/logout", { method: "POST" }), { params: { path: ["auth", "logout"] } });
    expect(res.status).toBe(204); expect(await res.text()).toBe("");
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const controller = new AbortController();
    const work = GET(new NextRequest("http://localhost/api/products", { signal: controller.signal }), { params: { path: ["products"] } });
    controller.abort(); expect((await work).status).toBe(499);
  });
});
