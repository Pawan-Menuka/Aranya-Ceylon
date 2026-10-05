// Bounds decoded frames and in-flight work separately. Aborted decodes keep their
// slot until they settle; a late result is released rather than entering the cache.
export const HERO_FRAME_LIMITS = { concurrency: 2, cache: 16, window: 12, initial: 4 } as const;

export function heroFrameWindow(target: number, rendered: number, direction: number, total = 192): number[] {
  const result: number[] = [];
  const add = (n: number) => { n = Math.round(n); if (n >= 0 && n < total && !result.includes(n)) result.push(n); };
  add(target); add(rendered);
  if (target === 0 && rendered === 0) {
    for (let n = 1; n < HERO_FRAME_LIMITS.initial; n++) add(n);
  } else {
    for (let n = 1; result.length < HERO_FRAME_LIMITS.window && n <= 6; n++) {
      add(target + n * direction); add(rendered + n * direction); add(target - n * direction);
    }
  }
  return result.slice(0, HERO_FRAME_LIMITS.window);
}

export class HeroFrameLoader<T> {
  private frames = new Map<number, T>();
  private active = new Map<number, AbortController>();
  private failed = new Set<number>();
  private wanted: number[] = [];
  private paused = true;
  private disposed = false;

  constructor(private load: (index: number, signal: AbortSignal) => Promise<T>,
    private release: (frame: T) => void, private changed: () => void) {}

  setWindow(indices: number[]) {
    if (this.disposed) return;
    this.wanted = [...new Set(indices)].slice(0, HERO_FRAME_LIMITS.window);
    for (const [index, controller] of this.active) if (!this.wanted.includes(index)) controller.abort();
    this.pump();
  }

  setPaused(paused: boolean) {
    if (this.disposed || this.paused === paused) return;
    this.paused = paused;
    if (paused) for (const controller of this.active.values()) controller.abort();
    else this.pump();
    this.changed();
  }

  nearest(index: number): { index: number; frame: T } | undefined {
    let found: number | undefined;
    for (const n of this.frames.keys()) if (found === undefined || Math.abs(n - index) < Math.abs(found - index)) found = n;
    if (found === undefined) return;
    const frame = this.frames.get(found)!;
    this.frames.delete(found); this.frames.set(found, frame);
    return { index: found, frame };
  }

  snapshot() { return { cached: this.frames.size, active: this.active.size, wanted: this.wanted.length, paused: this.paused }; }

  reset() {
    this.paused = true;
    for (const controller of this.active.values()) controller.abort();
    for (const frame of this.frames.values()) this.release(frame);
    this.frames.clear(); this.wanted = []; this.failed.clear();
    // Keep obsolete work in its slots until it settles, including across resizes.
  }

  dispose() {
    this.disposed = true;
    this.reset();
  }

  private pump() {
    if (this.disposed || this.paused) return;
    for (const index of this.wanted) {
      if (this.active.size >= HERO_FRAME_LIMITS.concurrency) break;
      if (this.frames.has(index) || this.active.has(index) || this.failed.has(index)) continue;
      const controller = new AbortController(); this.active.set(index, controller);
      void this.load(index, controller.signal).then(frame => {
        if (this.disposed || controller.signal.aborted || !this.wanted.includes(index)) { this.release(frame); return; }
        this.frames.set(index, frame);
        while (this.frames.size > HERO_FRAME_LIMITS.cache) {
          const oldest = [...this.frames.keys()].find(n => !this.wanted.includes(n)) ?? this.frames.keys().next().value!;
          this.release(this.frames.get(oldest)!); this.frames.delete(oldest);
        }
        this.changed();
      }).catch(() => {
        if (!controller.signal.aborted && !this.disposed) this.failed.add(index);
      }).finally(() => {
        this.active.delete(index);
        if (!this.disposed) { this.pump(); this.changed(); }
      });
    }
  }
}
