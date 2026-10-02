import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("drops compressed upstream framing after fetch decoding, preserves conditional policy and rotated cookies", async () => {
  // Undici exposes decompressed bytes but retains upstream representation headers.
  const decoded = JSON.stringify({ products: ["decoded public response"] });
  const response = new Response(decoded, { headers: { "content-type": "application/json", "content-encoding": "gzip", "content-length": "12", "cache-control": "private, no-cache", vary: "Cookie, Authorization", etag: 'W/"fixture"', "set-cookie": "fixture=rotated; Path=/; HttpOnly" } });
  vi.stubGlobal("fetch", vi.fn(async () => response));
  const { GET } = await import("../../aranya-next/src/app/api/[...path]/route");
  const result = await GET(new NextRequest("http://fixture.local/api/products"), { params: { path: ["products"] } });
  expect(await result.text()).toBe(decoded);
  expect(result.headers.has("content-encoding")).toBe(false); expect(result.headers.has("content-length")).toBe(false);
  expect(result.headers.get("cache-control")).toBe("private, no-cache");
  expect(result.headers.get("vary")).toBe("Cookie, Authorization"); expect(result.headers.get("etag")).toBe('W/"fixture"');
  expect(result.headers.getSetCookie()).toEqual(["fixture=rotated; Path=/; HttpOnly"]);
});
