import { gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { acceptsGzip, compressPublicResponse } from "../../aranya-next/src/lib/api/public-compression.server";

const text = JSON.stringify({ products: [{ slug: "cinnamon", description: "A public product. ".repeat(200) }] });
const body = () => new TextEncoder().encode(text).buffer;
const headers = () => new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "private, no-cache", vary: "Cookie, Authorization", etag: '"fixture"' });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("bounded public BFF gzip delivery", () => {
  it("negotiates gzip explicitly and respects gzip q=0 even when wildcard permits other encodings", () => {
    for (const value of ["gzip", "br, gzip;q=0.5", "*;q=0.8", "GZip; Q=1"]) expect(acceptsGzip(value)).toBe(true);
    for (const value of [null, "br", "gzip;q=0", "gzip;q=0, *;q=1", "gzip;q=invalid", "gzip;q=2", "*;q=0"]) expect(acceptsGzip(value)).toBe(false);
  });

  it("round trips public JSON and retains private cache semantics, market Vary and weak conditional validators", async () => {
    const responseHeaders = headers();
    const compressed = await compressPublicResponse(body(), responseHeaders, { method: "GET", path: "/products", acceptEncoding: "gzip" }, 200, false);
    expect(compressed.byteLength).toBeLessThan(body().byteLength);
    expect(gunzipSync(Buffer.from(compressed)).toString()).toBe(text);
    expect(responseHeaders.get("content-encoding")).toBe("gzip");
    expect(responseHeaders.get("cache-control")).toBe("private, no-cache");
    expect(responseHeaders.get("vary")).toBe("Cookie, Authorization, Accept-Encoding");
    expect(responseHeaders.get("etag")).toBe('W/"fixture"');
  });

  it("keeps identity bytes for rejected negotiation while varying eligible representations", async () => {
    const responseHeaders = headers(); const input = body();
    expect(await compressPublicResponse(input, responseHeaders, { method: "GET", path: "/recipes/rice", acceptEncoding: "gzip;q=0" }, 200, false)).toBe(input);
    expect(responseHeaders.has("content-encoding")).toBe(false);
    expect(responseHeaders.get("vary")).toContain("Accept-Encoding");
  });

  it("excludes private/admin paths, mutations, errors, small/non-JSON bodies and no-transform delivery", async () => {
    const input = body();
    for (const path of ["/auth/me", "/cart", "/orders", "/checkout/intent", "/products/admin/all", "/admin/products", "/products/.."])
      expect(await compressPublicResponse(input, headers(), { method: "GET", path, acceptEncoding: "gzip" }, 200, false)).toBe(input);
    expect(await compressPublicResponse(input, headers(), { method: "POST", path: "/products", acceptEncoding: "gzip" }, 200, false)).toBe(input);
    expect(await compressPublicResponse(input, headers(), { method: "GET", path: "/products", acceptEncoding: "gzip" }, 500, false)).toBe(input);
    const small = new TextEncoder().encode("{}").buffer;
    expect(await compressPublicResponse(small, headers(), { method: "GET", path: "/products", acceptEncoding: "gzip" }, 200, false)).toBe(small);
    const noTransform = headers(); noTransform.set("cache-control", "private, no-cache, no-transform");
    expect(await compressPublicResponse(input, noTransform, { method: "GET", path: "/products", acceptEncoding: "gzip" }, 200, false)).toBe(input);
    expect(await compressPublicResponse(input, headers(), { method: "GET", path: "/products", acceptEncoding: "gzip", cacheControl: "no-cache, no-transform" }, 200, false)).toBe(input);
    const html = headers(); html.set("content-type", "text/html");
    expect(await compressPublicResponse(input, html, { method: "GET", path: "/products", acceptEncoding: "gzip" }, 200, false)).toBe(input);
  });

  it("keeps cookie-bearing public bodies in identity form and relays every rotated cookie", async () => {
    const upstream = new Response(text, { headers: headers() });
    upstream.headers.append("set-cookie", "refresh=next; Path=/auth; HttpOnly");
    upstream.headers.append("set-cookie", "guestCartToken=next; Path=/; HttpOnly");
    vi.stubGlobal("fetch", vi.fn(async () => upstream));
    const { GET } = await import("../../aranya-next/src/app/api/[...path]/route");
    const response = await GET(new NextRequest("http://localhost/api/products", { headers: { "accept-encoding": "gzip" } }), { params: { path: ["products"] } });
    expect(response.headers.has("content-encoding")).toBe(false);
    expect(await response.text()).toBe(text);
    expect(response.headers.getSetCookie()).toEqual(["refresh=next; Path=/api/auth; HttpOnly", "guestCartToken=next; Path=/; HttpOnly"]);
  });

  it("compresses an already-decoded upstream body once and removes its obsolete wire framing", async () => {
    const upstreamHeaders = headers(); upstreamHeaders.set("content-encoding", "br"); upstreamHeaders.set("content-length", "7");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(text, { headers: upstreamHeaders })));
    const { GET } = await import("../../aranya-next/src/app/api/[...path]/route");
    const response = await GET(new NextRequest("http://localhost/api/products", { headers: { "accept-encoding": "gzip" } }), { params: { path: ["products"] } });
    expect(response.headers.get("content-encoding")).toBe("gzip");
    expect(response.headers.has("content-length")).toBe(false);
    expect(gunzipSync(Buffer.from(await response.arrayBuffer())).toString()).toBe(text);
  });

  it("retains market and encoding Vary plus a weak validator on bodyless 304 responses without Content-Type", async () => {
    const upstreamHeaders = new Headers({ "cache-control": "private, no-cache", vary: "Cookie, Authorization", etag: '"fixture"' });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 304, headers: upstreamHeaders })));
    const { GET } = await import("../../aranya-next/src/app/api/[...path]/route");
    const response = await GET(new NextRequest("http://localhost/api/products", {
      headers: { "accept-encoding": "gzip", "if-none-match": 'W/"fixture"' },
    }), { params: { path: ["products"] } });
    expect(response.status).toBe(304);
    expect(response.headers.get("vary")).toBe("Cookie, Authorization, Accept-Encoding");
    expect(response.headers.get("etag")).toBe('W/"fixture"');
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(response.headers.has("content-type")).toBe(false);
    expect(response.headers.has("content-encoding")).toBe(false);
    expect(await response.text()).toBe("");
  });

  it("keeps 304 metadata untouched for private, cookie-bearing and no-transform responses, without duplicating Vary", async () => {
    const empty = new ArrayBuffer(0);
    for (const excluded of [
      { path: "/orders", cookie: false, noTransform: false },
      { path: "/products", cookie: true, noTransform: false },
      { path: "/products", cookie: false, noTransform: true },
    ]) {
      const responseHeaders = headers(); responseHeaders.delete("content-type");
      if (excluded.noTransform) responseHeaders.set("cache-control", "private, no-cache, no-transform");
      await compressPublicResponse(empty, responseHeaders, { method: "GET", path: excluded.path, acceptEncoding: "gzip" }, 304, excluded.cookie);
      expect(responseHeaders.get("vary")).toBe("Cookie, Authorization");
      expect(responseHeaders.get("etag")).toBe('"fixture"');
    }
    const existing = headers(); existing.set("vary", "Cookie, accept-encoding, Authorization");
    await compressPublicResponse(empty, existing, { method: "GET", path: "/products", acceptEncoding: "gzip" }, 304, false);
    expect(existing.get("vary")).toBe("Cookie, accept-encoding, Authorization");
  });
});
