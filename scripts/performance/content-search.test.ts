import { describe, it, expect, vi, afterEach } from "vitest";
import { cachedContent } from "../../aranya-next/src/lib/content-cache";
import { sanitizeHtml } from "../../aranya-next/src/lib/sanitize";
import { readPages } from "../../aranya-next/src/lib/read-pages";
afterEach(() => vi.useRealTimers());

describe("server rich text", () => {
  it("keeps authored formatting but removes executable HTML and unsafe links", () => {
    const result = sanitizeHtml('<strong>Forest</strong><em>story</em><a href="https://example.com">link</a><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><span onclick="alert(1)">text</span>');
    expect(result).toContain("<strong>Forest</strong><em>story</em>");
    expect(result).toContain('href="https://example.com"');
    expect(result).not.toMatch(/script|onerror|onclick|javascript:|<img/i);
  });
  it("reuses unchanged content and immediately cleans edited versions", () => {
    const clean = vi.fn((s: string) => s.toUpperCase());
    const cached = cachedContent(clean);
    expect(cached("first")).toBe("FIRST"); cached("first");
    expect(cached("edited")).toBe("EDITED");
    expect(clean).toHaveBeenCalledTimes(2);
  });
  it("evicts by entry/character bounds and never caches oversized content", () => {
    const clean = vi.fn((s: string) => s);
    const cached = cachedContent(clean, 2, 12);
    cached("aa"); cached("bb"); cached("aa"); cached("cc"); cached("bb");
    expect(clean).toHaveBeenCalledTimes(4);
    cached("oversized"); cached("oversized");
    expect(clean).toHaveBeenCalledTimes(6);
  });
});

describe("complete cancellable results", () => {
  it("reads beyond a capped first page without losing rows", async () => {
    const load = vi.fn(async (cursor?: string) => ({ items: cursor ? [101, 102] : Array.from({length: 100}, (_, i) => i + 1), nextCursor: cursor ? null : "page2" }));
    const rows = await readPages(load);
    expect(rows).toHaveLength(102); expect(rows.at(-1)).toBe(102);
    expect(load).toHaveBeenNthCalledWith(2, "page2", expect.any(AbortSignal));
  });
  it("rejects looping or empty continuations instead of silently truncating", async () => {
    await expect(readPages(async () => ({ items: [1], nextCursor: "same" }))).rejects.toThrow("invalid next page");
    await expect(readPages(async () => ({ items: [], nextCursor: "same" }))).rejects.toThrow("invalid next page");
  });
  it("cancellation after a late response prevents another cursor request", async () => {
    const controller = new AbortController();
    const load = vi.fn(async () => { controller.abort(); return { items: [1], nextCursor: "page2" }; });
    await expect(readPages(load, controller.signal)).rejects.toThrow();
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("the overall budget bounds a loader that ignores cancellation", async () => {
    vi.useFakeTimers();
    const pending = readPages(async () => new Promise<never>(() => {}), undefined, 30);
    const assertion = expect(pending).rejects.toMatchObject({ status: 504, code: "request_timeout" });
    await vi.advanceTimersByTimeAsync(30); await assertion;
  });
});
