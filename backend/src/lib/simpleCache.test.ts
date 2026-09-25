import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withCache, _clearSimpleCache } from './simpleCache.js';

beforeEach(() => {
    _clearSimpleCache();
    vi.useRealTimers();
});

describe('withCache', () => {
    it('computes once and serves the cached value on a second call within the TTL', async () => {
        const compute = vi.fn(async () => 'value');

        const first = await withCache('k', 10_000, compute);
        const second = await withCache('k', 10_000, compute);

        expect(first).toBe('value');
        expect(second).toBe('value');
        expect(compute).toHaveBeenCalledTimes(1);
    });

    it('recomputes after the TTL expires', async () => {
        vi.useFakeTimers();
        const compute = vi.fn(async () => 'value');

        await withCache('k', 100, compute);
        vi.advanceTimersByTime(101);
        await withCache('k', 100, compute);

        expect(compute).toHaveBeenCalledTimes(2);
    });

    it('keeps distinct keys independent', async () => {
        const computeA = vi.fn(async () => 'a');
        const computeB = vi.fn(async () => 'b');

        const a = await withCache('a', 10_000, computeA);
        const b = await withCache('b', 10_000, computeB);

        expect(a).toBe('a');
        expect(b).toBe('b');
    });

    it('_clearSimpleCache forces the next call to recompute', async () => {
        const compute = vi.fn(async () => 'value');

        await withCache('k', 10_000, compute);
        _clearSimpleCache();
        await withCache('k', 10_000, compute);

        expect(compute).toHaveBeenCalledTimes(2);
    });
});
