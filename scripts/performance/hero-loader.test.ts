import { describe, expect, it, vi } from "vitest";
import { HERO_FRAME_LIMITS, HeroFrameLoader, heroFrameWindow } from "../../aranya-next/src/components/home/hero-frame-loader";
import { createHeroMotion } from "../../aranya-next/src/components/home/hero-motion";
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };

describe("hero resource scheduling", () => {
  it("requests four idle frames, then prioritizes the exact sought frame in a bounded window", () => {
    expect(heroFrameWindow(0, 0, 1)).toEqual([0, 1, 2, 3]);
    for (const [target, rendered, direction] of [[191, 0, 1], [2, 190, -1], [96, 80, 1]]) {
      const window = heroFrameWindow(target, rendered, direction);
      expect(window[0]).toBe(target); expect(window.length).toBeLessThanOrEqual(HERO_FRAME_LIMITS.window);
      expect(new Set(window).size).toBe(window.length); expect(window.every(n => n >= 0 && n < 192)).toBe(true);
    }
  });

  it("keeps aborted decodes in their slots and releases stale results after a fast seek", async () => {
    const work: { index: number; signal: AbortSignal; resolve: (value: number) => void }[] = [];
    const release = vi.fn();
    const loader = new HeroFrameLoader<number>((index, signal) => new Promise(resolve => work.push({ index, signal, resolve })), release, vi.fn());
    loader.setWindow([0, 1, 2, 3]); loader.setPaused(false);
    expect(work.map(w => w.index)).toEqual([0, 1]);
    loader.setWindow([100, 101, 102]);
    expect(work.slice(0, 2).every(w => w.signal.aborted)).toBe(true);
    expect(work).toHaveLength(2); // cancellation never opens a third decode slot
    work[0].resolve(0); work[1].resolve(1); await flush();
    expect(release.mock.calls.flat()).toEqual([0, 1]);
    expect(work.slice(2).map(w => w.index)).toEqual([100, 101]);
    expect(loader.snapshot().active).toBe(2); expect(loader.snapshot().cached).toBe(0);
    loader.dispose();work[2].resolve(100);work[3].resolve(101);await flush();
    expect(release.mock.calls.flat()).toEqual([0, 1, 100, 101]); expect(work).toHaveLength(4);
  });

  it("releases evicted bitmaps and retains a nearest usable frame through reverse seeks", async () => {
    const release = vi.fn(), loader = new HeroFrameLoader(async (n: number) => n, release, vi.fn());
    loader.setPaused(false);
    for (const target of [0, 30, 80, 140, 191, 70]) {
      loader.setWindow(heroFrameWindow(target, target, target === 70 ? -1 : 1)); await flush();
      expect(loader.snapshot().cached).toBeLessThanOrEqual(16); expect(loader.nearest(target)?.index).toBe(target);
      expect(loader.nearest(target + 0.1)).toBeDefined();
    }
    expect(release).toHaveBeenCalled(); const cached = loader.snapshot().cached, before = release.mock.calls.length;
    loader.dispose(); expect(release.mock.calls.length - before).toBe(cached); expect(loader.snapshot().cached).toBe(0);
  });

  it("keeps the concurrency bound across responsive generation resets", async () => {
    const work: { resolve: (n: number) => void; signal: AbortSignal }[] = [];
    const release = vi.fn(), load = vi.fn((_n: number, signal: AbortSignal) => new Promise<number>(resolve => work.push({ resolve, signal })));
    const loader = new HeroFrameLoader(load, release, vi.fn());loader.setWindow([0, 1]);loader.setPaused(false);
    loader.reset();loader.setWindow([0, 1]);loader.setPaused(false);
    expect(load).toHaveBeenCalledTimes(2);expect(work.every(w => w.signal.aborted)).toBe(true);
    work[0].resolve(10);work[1].resolve(11);await flush();
    expect(release.mock.calls.flat()).toEqual([10, 11]);expect(load).toHaveBeenCalledTimes(4);
    work[2].resolve(20);work[3].resolve(21);await flush();expect(loader.nearest(0)?.frame).toBe(20);loader.dispose();
  });

  it("pauses in-flight work and resumes the current window without marking cancellation as frame failure", async () => {
    const signals: AbortSignal[] = [], load = vi.fn((n: number, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<number>((resolve, reject) => { signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        if (signals.length > 2) resolve(n); });
    });
    const loader = new HeroFrameLoader(load, vi.fn(), vi.fn());loader.setWindow([0, 1]);loader.setPaused(false);
    loader.setPaused(true);await flush(); expect(signals.every(s => s.aborted)).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);expect(loader.snapshot().active).toBe(0);
    loader.setPaused(false);await flush();expect(load).toHaveBeenCalledTimes(4);expect(loader.nearest(0)?.index).toBe(0);
    loader.dispose();
  });

  it("skips missing frames while keeping valid neighbours and bounds ready plus pending work", async () => {
    const load = vi.fn(async (n: number) => { if (n === 0) throw new Error("404"); return n; });
    const loader = new HeroFrameLoader(load, vi.fn(), vi.fn());loader.setWindow([0, 1, 2, 3]);loader.setPaused(false);await flush();
    expect(loader.nearest(0)?.index).toBe(1);
    loader.setWindow([0, 1, 2, 3]);await flush();expect(load).toHaveBeenCalledTimes(4);
    expect(loader.snapshot().active).toBe(0);loader.dispose();
  });

  it("stops motion notifications after unsubscribe and ignores unchanged state", () => {
    const motion = createHeroMotion(), listener = vi.fn(), unsubscribe = motion.subscribe(listener);
    const next = { progress: 0.5, active: true, mobile: true, staticMode: false };
    motion.update(next);motion.update(next);expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();motion.update({ ...next, active: false });expect(listener).toHaveBeenCalledTimes(2);
  });
});
