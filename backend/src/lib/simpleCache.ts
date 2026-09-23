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

export async function withCache<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;

    const value = await compute();
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
}

// Test-only: start each test from a cold cache.
export function _clearSimpleCache() {
    store.clear();
}
