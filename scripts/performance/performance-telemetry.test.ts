import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVitalReporter } from "../../aranya-next/src/lib/performance/telemetry-client";
import { parseVitalEvent, publicRouteGroup, vitalEvent, MAX_TELEMETRY_BYTES } from "../../aranya-next/src/lib/performance/telemetry";
import { telemetryConfig } from "../../aranya-next/src/lib/performance/telemetry-config.server";

const event = { version: 1, event: "web_vital", name: "LCP", value: 2345, route: "/products/[slug]" };
function request(body: unknown = event, overrides: { headers?: Record<string, string>; signal?: AbortSignal; raw?: string } = {}) {
  return new Request("https://shop.example/api/performance", {
    method: "POST", body: overrides.raw ?? JSON.stringify(body), signal: overrides.signal,
    headers: { origin: "https://shop.example", "sec-fetch-site": "same-origin", "content-type": "application/json", ...overrides.headers },
  });
}

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("bounded Web Vitals schema", () => {
  it("replaces dynamic identifiers and discards query/hash", () => {
    expect(publicRouteGroup("/products/person@example.com?token=secret#ref")).toBe("/products/[slug]");
    expect(publicRouteGroup("/recipes/customer-id/")).toBe("/recipes/[slug]");
    expect(publicRouteGroup("/search?q=person@example.com")).toBe("/search");
  });
  it.each(["/account", "/admin", "/admin/orders/123", "/checkout", "/checkout/success?session_id=secret", "/api/auth/me", "/unknown/secret", "https://shop.example/products/x", "//other.example/products/x"])("excludes private/unknown route %s", path => {
    expect(publicRouteGroup(path)).toBeNull();
  });
  it("copies only allowlisted fields from metric objects", () => {
    const raw = { name: "INP", value: 215.99, id: "user-secret", entries: [{ name: "https://private.example/" }], attribution: { target: "email" } };
    expect(vitalEvent(raw, "/")).toEqual({ version: 1, event: "web_vital", name: "INP", value: 216, route: "/" });
    expect(JSON.stringify(vitalEvent(raw, "/")).length).toBeLessThan(MAX_TELEMETRY_BYTES);
  });
  it.each(["LCP", "CLS", "INP", "FCP", "TTFB"])("supports %s", name => {
    expect(parseVitalEvent({ ...event, name, value: 0.01234 })?.name).toBe(name);
  });
  it.each([NaN, Infinity, -1, 600001, "123", null])("rejects invalid values %s", value => {
    expect(parseVitalEvent({ ...event, value })).toBeNull();
  });
  it("rejects arbitrary names, routes, extra fields, and schema versions", () => {
    for (const input of [[], null, { ...event, name: "FID" }, { ...event, route: "/products/raw-id" }, { ...event, version: 2 }, { ...event, id: "secret" }, { ...event, url: "https://private.example" }, { ...event, name: "CLS", value: 101 }]) {
      expect(parseVitalEvent(input)).toBeNull();
    }
    expect(parseVitalEvent({ ...event, name: "CLS", value: 0.012345 })?.value).toBe(0.0123);
  });
});

describe("optional deployment config", () => {
  it("requires an explicit flag and valid origin", () => {
    vi.stubEnv("PERFORMANCE_TELEMETRY_ENABLED", "false");
    expect(telemetryConfig().enabled).toBe(false);
    vi.stubEnv("PERFORMANCE_TELEMETRY_ENABLED", "true");
    vi.stubEnv("PERFORMANCE_TELEMETRY_ORIGIN", "");
    expect(telemetryConfig().enabled).toBe(false);
    vi.stubEnv("PERFORMANCE_TELEMETRY_ORIGIN", "https://shop.example");
    expect(telemetryConfig().enabled).toBe(true);
  });
  it.each(["https://user:secret@shop.example", "https://shop.example/path", "https://shop.example?token=secret", "http://shop.example", "invalid"])("fails closed for origin %s", origin => {
    vi.stubEnv("PERFORMANCE_TELEMETRY_ENABLED", "true");
    vi.stubEnv("PERFORMANCE_TELEMETRY_ORIGIN", origin);
    expect(telemetryConfig().enabled).toBe(false);
  });
  it("permits local HTTP and bounds sampling/worker rate", () => {
    vi.stubEnv("PERFORMANCE_TELEMETRY_ENABLED", "true");
    vi.stubEnv("PERFORMANCE_TELEMETRY_ORIGIN", "http://localhost:3101");
    vi.stubEnv("PERFORMANCE_TELEMETRY_SAMPLE_RATE", "1");
    vi.stubEnv("PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE", "600");
    expect(telemetryConfig()).toMatchObject({ enabled: true, sampleRate: 1, requestsPerMinute: 600 });
    vi.stubEnv("PERFORMANCE_TELEMETRY_SAMPLE_RATE", "1.1");
    vi.stubEnv("PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE", "999999");
    expect(telemetryConfig()).toMatchObject({ enabled: false, sampleRate: 0, requestsPerMinute: 120 });
  });
});

describe("credential-free first-party delivery", () => {
  it("sends at most five reduced events with no credential/referrer attachment", () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const reporter = createVitalReporter("/products/[slug]", () => "/products/private-slug", transport);
    for (const name of ["LCP", "CLS", "INP", "FCP", "TTFB", "FID", "LCP"]) reporter.report({ name, value: 1 });
    expect(transport).toHaveBeenCalledTimes(5);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe("/api/performance");
    expect(options).toMatchObject({ method: "POST", mode: "same-origin", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true, redirect: "error", headers: { "content-type": "application/json" } });
    expect(JSON.parse(options?.body as string)).toEqual({ ...event, value: 1 });
  });
  it("suppresses private routes, cancels active writes, and swallows failures", async () => {
    const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    let path = "/checkout";
    const reporter = createVitalReporter("/", () => path, transport);
    reporter.report({ name: "INP", value: 1 });
    expect(transport).not.toHaveBeenCalled();
    path = "/";
    reporter.report({ name: "LCP", value: 1 });
    const signal = transport.mock.calls[0][1]?.signal;
    reporter.cancel();
    expect(signal?.aborted).toBe(true);
    reporter.report({ name: "INP", value: 1 });
    expect(transport).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });
});

describe("first-party collector", () => {
  let route: typeof import("../../aranya-next/src/app/api/performance/route");
  let output: ReturnType<typeof vi.spyOn>;
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("PERFORMANCE_TELEMETRY_ENABLED", "true");
    vi.stubEnv("PERFORMANCE_TELEMETRY_ORIGIN", "https://shop.example");
    vi.stubEnv("PERFORMANCE_TELEMETRY_SAMPLE_RATE", "1");
    vi.stubEnv("PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE", "120");
    output = vi.spyOn(console, "info").mockImplementation(() => {});
    route = await import("../../aranya-next/src/app/api/performance/route");
  });
  it("is unavailable by default and does not read/log the body", async () => {
    vi.stubEnv("PERFORMANCE_TELEMETRY_ENABLED", "false");
    const req = request();
    const read = vi.spyOn(req.body!, "getReader");
    expect((await route.POST(req)).status).toBe(404);
    expect(read).not.toHaveBeenCalled();
    expect(output).not.toHaveBeenCalled();
  });
  it("logs only the strict reconstructed schema, ignoring cookie/authorization headers", async () => {
    const response = await route.POST(request(event, { headers: { cookie: "refresh=secret; email=person@example.com", authorization: "Bearer secret", referer: "https://shop.example?token=secret" } }));
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(output).toHaveBeenCalledExactlyOnceWith(JSON.stringify(event));
  });
  it.each(["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"] as const)("rejects %s locally without CORS", method => {
    const response = route[method]();
    expect(response.status).toBe(405);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(output).not.toHaveBeenCalled();
  });
  it.each([
    { origin: "https://evil.example" }, { origin: "null" }, { origin: "" },
    { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }, { "sec-fetch-site": "" },
    { origin: "https://evil.example", "x-forwarded-host": "shop.example" },
  ])("rejects missing/spoofed/cross-origin browser context %j", async headers => {
    expect((await route.POST(request(event, { headers }))).status).toBe(403);
    expect(output).not.toHaveBeenCalled();
  });
  it("rejects beacon-style text, malformed JSON and private/extra fields", async () => {
    expect((await route.POST(request(event, { headers: { "content-type": "text/plain;charset=UTF-8" } }))).status).toBe(415);
    expect((await route.POST(request(null, { raw: "malformed secret" }))).status).toBe(400);
    expect((await route.POST(request({ ...event, route: "/checkout/success/session-secret" }))).status).toBe(400);
    expect((await route.POST(request({ ...event, id: "person@example.com" }))).status).toBe(400);
    expect(output).not.toHaveBeenCalled();
  });
  it("limits both declared and streamed bytes without logging oversized bodies", async () => {
    expect((await route.POST(request(event, { headers: { "content-length": "1025" } }))).status).toBe(413);
    expect((await route.POST(request(null, { raw: "x".repeat(1025) }))).status).toBe(413);
    // UTF-8 bytes, not JavaScript string length, determine the body budget.
    expect((await route.POST(request(null, { raw: "\u{1f33f}".repeat(300) }))).status).toBe(413);
    expect(output).not.toHaveBeenCalled();
  });
  it("bounds all same-origin attempts per worker and resumes after the window", async () => {
    vi.stubEnv("PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE", "2");
    expect((await route.POST(request())).status).toBe(204);
    expect((await route.POST(request())).status).toBe(204);
    const denied = await route.POST(request());
    expect(denied.status).toBe(429);
    expect(denied.headers.get("retry-after")).toBe("60");
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 60_001);
    expect((await route.POST(request())).status).toBe(204);
    expect(output).toHaveBeenCalledTimes(3);
  });
  it("bounds pathological zero-byte stream chunks", async () => {
    const cancelled = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(0)); }, cancel: cancelled,
    });
    const req = new Request("https://shop.example/api/performance", {
      method: "POST", body: stream, duplex: "half",
      headers: { origin: "https://shop.example", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    } as RequestInit);
    expect((await route.POST(req)).status).toBe(413);
    expect(cancelled).toHaveBeenCalledOnce();
    expect(output).not.toHaveBeenCalled();
  });
  it("rejects pre-aborted requests without logging", async () => {
    const controller = new AbortController();
    controller.abort();
    expect((await route.POST(request(event, { signal: controller.signal }))).status).toBe(499);
    expect(output).not.toHaveBeenCalled();
  });
  it("cancels a stalled read when the request disconnects", async () => {
    const controller = new AbortController();
    const cancelled = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel: cancelled });
    const req = new Request("https://shop.example/api/performance", {
      method: "POST", body: stream, duplex: "half", signal: controller.signal,
      headers: { origin: "https://shop.example", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    } as RequestInit);
    const pending = route.POST(req);
    controller.abort();
    expect((await pending).status).toBe(499);
    expect(cancelled).toHaveBeenCalledOnce();
    expect(output).not.toHaveBeenCalled();
  });
  it("times out stalled streams and cancels the reader", async () => {
    vi.useFakeTimers();
    const cancelled = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel: cancelled });
    const req = new Request("https://shop.example/api/performance", {
      method: "POST", body: stream, duplex: "half", headers: { origin: "https://shop.example", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    } as RequestInit);
    const pending = route.POST(req);
    await vi.advanceTimersByTimeAsync(1001);
    expect((await pending).status).toBe(408);
    expect(cancelled).toHaveBeenCalledOnce();
    expect(output).not.toHaveBeenCalled();
  });
});
