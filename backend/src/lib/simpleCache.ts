// Minimal in-memory TTL cache for read-mostly, low-cardinality query results
// (featured/bestseller lists, category counts, the admin dashboard). Deliberately
// NOT HTTP-layer (Cache-Control) caching: most public responses vary per visitor
// by market (resolveMarket reads a signed cookie / CF-IPCountry — see
// middleware/market.ts), so a shared HTTP/CDN cache could serve one visitor's
// market/currency to another. Caching at this layer, keyed explicitly by market,
// avoids that entirely.
//
// Per-process only — fine at the current single-instance deployment (see the
// leader-election note in README.md for the same caveat on cron jobs). A
// multi-instance rollout would need this backed by something shared (Redis)
// instead.
const store = new Map<string, { value: unknown; expiresAt: number }>();
// Only the six existing public cache keys carry mutation generations. This
// map never grows with visitor input, query strings or resource identities.
const catalogVersions = new Map<string, number>(['LOCAL', 'INTERNATIONAL'].flatMap(market =>
    [`categories:${market}`, `products:featured:${market}`, `products:bestsellers:${market}`].map(key => [key, 0] as const),
));
let clearEpoch = 0;

export function invalidateCatalogCache(paths: readonly string[]): void {
    const productsChanged = paths.some(path => path === '/products' || path.startsWith('/products/'));
    const categoriesChanged = productsChanged || paths.includes('/categories');
    for (const [key, version] of catalogVersions) {
        if (key.startsWith('categories:') ? categoriesChanged : productsChanged) {
            store.delete(key);
            catalogVersions.set(key, version + 1);
        }
    }
}

export async function withCache<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;

    const version = catalogVersions.get(key);
    const epoch = clearEpoch;
    const value = await compute();
    // An older read may finish after a mutation. Return its own snapshot to
    // that caller, but never repopulate the cache with the stale result.
    if (epoch === clearEpoch && version === catalogVersions.get(key)) {
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
    return value;
}

// Test-only: start each test from a cold cache.
export function _clearSimpleCache() {
    store.clear();
    clearEpoch += 1;
}
