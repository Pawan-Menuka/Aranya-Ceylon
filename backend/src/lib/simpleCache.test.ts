import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withCache, _clearSimpleCache, invalidateCatalogCache } from './simpleCache.js';

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


describe('committed public catalog invalidation', () => {
    it('invalidates both markets and highlights without evicting the private dashboard', async () => {
        const keys = ['categories:LOCAL', 'categories:INTERNATIONAL', 'products:featured:LOCAL', 'products:featured:INTERNATIONAL', 'products:bestsellers:LOCAL', 'products:bestsellers:INTERNATIONAL'];
        for (const key of [...keys, 'admin:dashboard']) await withCache(key, 300_000, async () => 'old');
        invalidateCatalogCache(['/products/old-slug', '/products/new-slug']);
        for (const key of keys) expect(await withCache(key, 300_000, async () => 'new')).toBe('new');
        expect(await withCache('admin:dashboard', 60_000, async () => 'new')).toBe('old');
    });

    it('a category dependency invalidates counts without evicting unrelated highlights', async () => {
        await withCache('categories:LOCAL', 300_000, async () => 'old-count');
        await withCache('products:featured:LOCAL', 300_000, async () => 'old-featured');
        invalidateCatalogCache(['/gifts', '/categories']);
        expect(await withCache('categories:LOCAL', 300_000, async () => 'new-count')).toBe('new-count');
        expect(await withCache('products:featured:LOCAL', 300_000, async () => 'new-featured')).toBe('old-featured');
    });

    it('an overlapping old read cannot refill an invalidated cache after a mutation', async () => {
        let finish!: (value: string) => void;
        const pending = withCache('products:featured:LOCAL', 300_000, () => new Promise<string>(resolve => { finish = resolve; }));
        invalidateCatalogCache(['/products']);
        finish('old');
        expect(await pending).toBe('old');
        const fresh = vi.fn(async () => 'new');
        expect(await withCache('products:featured:LOCAL', 300_000, fresh)).toBe('new');
        expect(await withCache('products:featured:LOCAL', 300_000, fresh)).toBe('new');
        expect(fresh).toHaveBeenCalledOnce();
    });
});
