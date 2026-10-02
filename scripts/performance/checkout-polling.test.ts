import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.stubGlobal("window", {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const status = (value: string) => Response.json({ order: { status: value } });
const loadPoll = async () => (await import("../../aranya-next/src/lib/api/checkout")).pollOrderPaid;

describe("webhook-authoritative payment polling", () => {
  it.each(["PAID", "PROCESSING", "CONFIRMED"])("accepts authoritative %s immediately without another read or sleep", async (value) => {
    const fetcher = vi.fn(async () => status(value));
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    expect(await poll("order / fixture")).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("/api/orders/order%20%2F%20fixture");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries transient read failures, never replays checkout, and completes without a final unused interval", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(status("PENDING"))
      .mockResolvedValueOnce(status("UNPAID"));
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    const result = poll("fixture", 3, 100, { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(199);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.every(([url, init]) => url === "/api/orders/fixture" && !init.method)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for an authoritative paid read after an initially pending order", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(status("PENDING")).mockResolvedValueOnce(status("PAID"));
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    const result = poll("fixture", 12, 100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a stalled response body across the entire polling operation and aborts its transport", async () => {
    let transport: AbortSignal | undefined;
    const fetcher = vi.fn(async (_url, init) => {
      transport = init.signal;
      return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("{")); } }));
    });
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    const result = poll("fixture", 12, 100, { timeoutMs: 250 });
    await vi.advanceTimersByTimeAsync(250);
    expect(await result).toBe(false);
    expect(transport?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses one deadline for read time and waits, including the last read", async () => {
    const transports: AbortSignal[] = [];
    const fetcher = vi.fn(async (_url, init) => {
      transports.push(init.signal);
      if (transports.length === 1) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return status("PENDING");
      }
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    const result = poll("fixture", 12, 100, { timeoutMs: 250 });
    await vi.advanceTimersByTimeAsync(180);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(70);
    expect(await result).toBe(false);
    expect(transports[1].aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a polling wait immediately without sending any later order read", async () => {
    const fetcher = vi.fn(async () => status("PENDING"));
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    const controller = new AbortController();
    const result = poll("old-order", 12, 100, { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();
    expect(await result).toBe(false);
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels an in-flight read and ignores its late paid response", async () => {
    let finish: (response: Response) => void = () => {};
    let transport: AbortSignal | undefined;
    const fetcher = vi.fn((_url, init) => {
      transport = init.signal;
      return new Promise<Response>((resolve) => { finish = resolve; });
    });
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    const controller = new AbortController();
    const result = poll("old-order", 12, 100, { signal: controller.signal });
    controller.abort();
    expect(await result).toBe(false);
    expect(transport?.aborted).toBe(true);
    finish(status("PAID"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts no request for a consumer that was already cancelled", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const poll = await loadPoll();
    const controller = new AbortController();
    controller.abort();
    expect(await poll("fixture", 12, 1500, { signal: controller.signal })).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
