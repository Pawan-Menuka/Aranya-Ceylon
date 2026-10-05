import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDashboardCache } from './private-dashboard-cache.js';

afterEach(() => vi.useRealTimers());
describe('private dashboard cache', () => {
    it('shares a cold burst and expires from successful completion', async () => {
        vi.useFakeTimers();
        const cache = createDashboardCache<number>(60_000);
        let finish!: (n: number) => void;
        const compute = vi.fn(() => new Promise<number>(resolve => { finish = resolve; }));
        const first = cache.get('day/fx', compute);
        const second = cache.get('day/fx', compute);
        await Promise.resolve();
        expect(compute).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(30_000);
        finish(7);
        expect(await first).toBe(7); expect(await second).toBe(7);
        vi.advanceTimersByTime(59_999);
        expect(await cache.get('day/fx', compute)).toBe(7);
        vi.advanceTimersByTime(1);
        expect(await cache.get('day/fx', async () => 8)).toBe(8);
    });
    it('does not let an older day/FX flight refill over the newer key', async () => {
        const cache = createDashboardCache<number>();
        let finish!: (n: number) => void;
        const old = cache.get('old', () => new Promise<number>(resolve => { finish = resolve; }));
        await Promise.resolve();
        expect(await cache.get('new', async () => 2)).toBe(2);
        finish(1); await old;
        const compute = vi.fn(async () => 3);
        expect(await cache.get('new', compute)).toBe(2);
        expect(compute).not.toHaveBeenCalled();
    });
    it('retries failures without caching their rejection', async () => {
        const cache = createDashboardCache<number>();
        await expect(cache.get('key', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
        expect(await cache.get('key', async () => 3)).toBe(3);
    });
});
