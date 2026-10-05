import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { canonicalClientIp, signedBffIdentityHeaders } from "../../aranya-next/src/lib/api/bff-client-identity.server";
import { createBffClientIdentity, getVerifiedBffClientIp } from "../../backend/src/middleware/bffClientIdentity";

const secret = "bff-identity-test-key-32-characters-only";
const now = 1790899200000;
const reserved = {
  "x-forwarded-for": "203.0.113.99", "x-real-ip": "203.0.113.98", "cf-connecting-ip": "203.0.113.97",
  "x-aranya-verified-client-ip": "192.0.2.1", "x-aranya-bff-client-ip": "198.51.100.99",
  "x-aranya-bff-client-time": "1", "x-aranya-bff-client-signature": "forged",
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("server-only BFF identity signer", () => {
  it.each([
    [" 192.0.2.1 ", "192.0.2.1"], ["2001:0DB8:0:0:0:0:0:1", "2001:db8::1"],
    ["::ffff:192.0.2.1", "192.0.2.1"], ["0:0:0:0:0:ffff:c000:201", "192.0.2.1"],
    ["::1", "::1"], ["127.0.0.1", "127.0.0.1"],
  ])("canonicalizes %s to %s", (input, output) => expect(canonicalClientIp(input)).toBe(output));
  it.each([null, "", "192.0.2.1, 198.51.100.1", "192.0.2.1:443", "[::1]", "fe80::1%eth0", "010.1.1.1", "example.com", "not-an-ip"])("rejects invalid/combined ingress identity %s", input => {
    expect(canonicalClientIp(input)).toBeNull();
  });
  it("matches the versioned backend HMAC contract using normalized URL path and raw query", () => {
    const identity = signedBffIdentityHeaders({ ip: "2001:0db8::1", method: "post", target: "http://api.example/a/../auth/refresh?x=%2F&x=two+words", secret, now });
    const payload = JSON.stringify([1, String(now), "POST", "/auth/refresh?x=%2F&x=two+words", "2001:db8::1"]);
    expect(identity).toEqual({
      "x-aranya-bff-client-ip": "2001:db8::1", "x-aranya-bff-client-time": String(now),
      "x-aranya-bff-client-signature": createHmac("sha256", secret).update(payload).digest("base64url"),
    });
    expect(identity?.["x-aranya-bff-client-signature"]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(identity?.["x-aranya-bff-client-signature"]).toBe("eNMu7pa80rQDTnpsHn_vu5HuH6Ku7MKgOjROSe5M1iY");
  });
  it("binds signatures to canonical visitor, timestamp, method and full query", () => {
    const input = { ip: "192.0.2.1", method: "GET", target: "http://api.example/products?q=tea", secret, now };
    const signature = (overrides = {}) => signedBffIdentityHeaders({ ...input, ...overrides })?.["x-aranya-bff-client-signature"];
    const original = signature();
    for (const overrides of [{ ip: "192.0.2.2" }, { now: now + 1 }, { method: "POST" }, { target: "http://api.example/products?q=spice" }]) {
      expect(signature(overrides)).not.toBe(original);
    }
    expect(signature({ ip: "::ffff:192.0.2.1" })).toBe(original);
  });
  it.each(["short", " ".repeat(32)])("rejects weak configured key %j", key => {
    expect(() => signedBffIdentityHeaders({ ip: "192.0.2.1", method: "GET", target: "http://api.example/", secret: key, now })).toThrow("Invalid identity configuration");
  });
  it("does not create signatures for malformed source, invalid time or method", () => {
    const input = { ip: "192.0.2.1", method: "GET", target: "http://api.example/", secret, now };
    for (const overrides of [{ ip: "192.0.2.1,192.0.2.2" }, { now: NaN }, { now: -1 }, { now: 0 }, { method: "GET POST" }, { target: "ftp://api.example/" }]) {
      expect(signedBffIdentityHeaders({ ...input, ...overrides })).toBeNull();
    }
  });
  it("is accepted by the actual backend verifier for IPv4, IPv6 and mapped identities", () => {
    for (const input of ["192.0.2.1", "2001:0db8::1", "::ffff:192.0.2.1"]) {
      const identity = signedBffIdentityHeaders({ ip: input, method: "POST", target: "http://api.example/auth/refresh?x=%2F&x=two+words", secret, now })!;
      const middleware = createBffClientIdentity({ secret, required: true, now: () => now });
      const req = {
        headers: identity, rawHeaders: Object.entries(identity).flat(), method: "POST",
        originalUrl: "/auth/refresh?x=%2F&x=two+words", path: "/auth/refresh", socket: { remoteAddress: "127.0.0.1" },
      } as unknown as Parameters<typeof middleware>[0];
      const next = vi.fn();
      middleware(req, {} as Parameters<typeof middleware>[1], next);
      expect(next).toHaveBeenCalledExactlyOnceWith();
      expect(getVerifiedBffClientIp(req)).toBe(canonicalClientIp(input));
    }
  });
});

describe("actual BFF header reconstruction", () => {
  let route: typeof import("../../aranya-next/src/app/api/[...path]/route");
  let upstream: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.example");
    vi.stubEnv("BFF_CLIENT_IP_SECRET", "");
    upstream = vi.fn<typeof fetch>().mockImplementation(async () => new Response("{}", { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", upstream);
    route = await import("../../aranya-next/src/app/api/[...path]/route");
  });
  it("strips source, forwarded IP and forged signed headers even when signing is disabled", async () => {
    const response = await route.GET(new NextRequest("https://shop.example/api/products", {
      headers: { ...reserved, cookie: "x-market=fixture", authorization: "Bearer fixture", origin: "https://shop.example" },
    }), { params: { path: ["products"] } });
    expect(response.status).toBe(200);
    const headers = new Headers(upstream.mock.calls[0][1]?.headers);
    for (const key of Object.keys(reserved)) expect(headers.has(key)).toBe(false);
    expect(headers.get("cookie")).toBe("x-market=fixture");
    expect(headers.get("authorization")).toBe("Bearer fixture");
    expect(headers.get("origin")).toBe("https://shop.example");
  });
  it("creates distinct trusted identities and overwrites all forged signed metadata", async () => {
    vi.stubEnv("BFF_CLIENT_IP_SECRET", secret);
    vi.spyOn(Date, "now").mockReturnValue(now);
    for (const ip of ["192.0.2.1", "198.51.100.2"]) {
      await route.GET(new NextRequest("https://shop.example/api/products?q=tea%2Fspice&sort=price", {
        headers: { ...reserved, "x-aranya-verified-client-ip": ip },
      }), { params: { path: ["products"] } });
    }
    expect(upstream).toHaveBeenCalledTimes(2);
    const signatures = upstream.mock.calls.map(([url, options]) => {
      expect(url).toBe("http://api.example/products?q=tea%2Fspice&sort=price");
      const headers = new Headers(options?.headers);
      for (const key of ["x-aranya-verified-client-ip", "x-forwarded-for", "x-real-ip", "cf-connecting-ip"]) expect(headers.has(key)).toBe(false);
      expect(headers.get("x-aranya-bff-client-time")).toBe(String(now));
      const ip = headers.get("x-aranya-bff-client-ip")!;
      const expected = createHmac("sha256", secret).update(JSON.stringify([1, String(now), "GET", "/products?q=tea%2Fspice&sort=price", ip])).digest("base64url");
      expect(headers.get("x-aranya-bff-client-signature")).toBe(expected);
      return expected;
    });
    expect(signatures[0]).not.toBe(signatures[1]);
  });
  it.each([null, "not-an-ip", "192.0.2.1,198.51.100.2"])("fails closed without trustworthy ingress IP %s", async ip => {
    vi.stubEnv("BFF_CLIENT_IP_SECRET", secret);
    const headers = { ...reserved };
    if (ip === null) delete (headers as Partial<typeof reserved>)["x-aranya-verified-client-ip"];
    else headers["x-aranya-verified-client-ip"] = ip;
    const response = await route.GET(new NextRequest("https://shop.example/api/products", { headers }), { params: { path: ["products"] } });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_unreachable", message: "The API is not reachable." });
    expect(upstream).not.toHaveBeenCalled();
  });
  it("rejects duplicate source header values and weak configuration before upstream fetch", async () => {
    vi.stubEnv("BFF_CLIENT_IP_SECRET", secret);
    const headers = new Headers();
    headers.append("x-aranya-verified-client-ip", "192.0.2.1");
    headers.append("x-aranya-verified-client-ip", "192.0.2.2");
    expect((await route.GET(new NextRequest("https://shop.example/api/products", { headers }), { params: { path: ["products"] } })).status).toBe(502);
    vi.stubEnv("BFF_CLIENT_IP_SECRET", "weak");
    expect((await route.GET(new NextRequest("https://shop.example/api/products", { headers: reserved }), { params: { path: ["products"] } })).status).toBe(502);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("preserves POST body/query/method, bearer/cookies, response and refresh-cookie rotation", async () => {
    vi.stubEnv("BFF_CLIENT_IP_SECRET", secret);
    vi.spyOn(Date, "now").mockReturnValue(now);
    upstream.mockResolvedValueOnce(new Response('{"rotated":true}', { headers: {
      "content-type": "application/json", "set-cookie": "refreshToken=rotated-fixture; Path=/auth; HttpOnly; SameSite=Lax",
    } }));
    const body = JSON.stringify({ refresh: "test-fixture" });
    const response = await route.POST(new NextRequest("https://shop.example/api/auth/refresh?source=fixture%2Fone", {
      method: "POST", body, headers: { ...reserved, cookie: "refreshToken=test-fixture", authorization: "Bearer test-fixture", "content-type": "application/json" },
    }), { params: { path: ["auth", "refresh"] } });
    const [url, options] = upstream.mock.calls[0];
    expect(url).toBe("http://api.example/auth/refresh?source=fixture%2Fone");
    expect(options?.method).toBe("POST");
    expect(options?.redirect).toBe("manual");
    expect(new TextDecoder().decode(options?.body as ArrayBuffer)).toBe(body);
    const headers = new Headers(options?.headers);
    expect(headers.get("cookie")).toBe("refreshToken=test-fixture");
    expect(headers.get("authorization")).toBe("Bearer test-fixture");
    expect(headers.get("x-aranya-bff-client-signature")).toBe(createHmac("sha256", secret).update(JSON.stringify([1, String(now), "POST", "/auth/refresh?source=fixture%2Fone", "192.0.2.1"])).digest("base64url"));
    expect(await response.json()).toEqual({ rotated: true });
    expect(response.headers.getSetCookie()).toEqual(["refreshToken=rotated-fixture; Path=/api/auth; HttpOnly; SameSite=Lax"]);
  });
});
