import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => cache);
import { GET, POST } from "../../aranya-next/src/app/api/revalidate/route";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
function request(body: unknown, secret = "fixture-only") {
  return new NextRequest("http://fixture.local/api/revalidate", { method: "POST", headers: { "x-revalidate-secret": secret, "content-type": "application/json" }, body: JSON.stringify(body) });
}
it("rejects unauthorized invalidation without touching cache and keeps replies private", async () => {
  vi.stubEnv("REVALIDATION_SECRET", "fixture-only");
  const response = await POST(request({ paths: ["/products"] }, "wrong"));
  expect(response.status).toBe(401); expect(response.headers.get("cache-control")).toBe("no-store");
  expect(cache.revalidateTag).not.toHaveBeenCalled(); expect(cache.revalidatePath).not.toHaveBeenCalled();
});
it("deduplicates product dependencies and invalidates old/new slugs in one authenticated batch", async () => {
  vi.stubEnv("REVALIDATION_SECRET", "fixture-only");
  const response = await POST(request({ paths: ["/products/old", "/products/new", "/products", "/products/new", "/", "/categories"] }));
  expect(response.status).toBe(200);
  expect(cache.revalidateTag.mock.calls.map(([tag]) => tag).sort()).toEqual(["categories", "gifts", "products", "recipes"]);
  expect(cache.revalidatePath.mock.calls.map(([path]) => path)).toEqual(["/products/old", "/products/new", "/products", "/", "/categories"]);
});
it("rejects a batch containing private or malformed paths atomically", async () => {
  vi.stubEnv("REVALIDATION_SECRET", "fixture-only");
  for (const paths of [["/products", "/admin"], ["/products/../admin"], ["/products?auth=1"], Array(33).fill("/products"), []]) {
    expect((await POST(request({ paths }))).status).toBe(400);
  }
  expect(cache.revalidateTag).not.toHaveBeenCalled(); expect(cache.revalidatePath).not.toHaveBeenCalled();
});
it("retains authenticated legacy GET and invalidates journal data as well as its path", async () => {
  vi.stubEnv("REVALIDATION_SECRET", "fixture-only");
  const response = await GET(new NextRequest("http://fixture.local/api/revalidate?path=/journal/old-story", { headers: { "x-revalidate-secret": "fixture-only" } }));
  expect(response.status).toBe(200); expect(cache.revalidateTag).toHaveBeenCalledWith("blog");
  expect(cache.revalidatePath).toHaveBeenCalledWith("/journal/old-story");
});
