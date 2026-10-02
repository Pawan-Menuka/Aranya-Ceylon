/** One private payload plus bounded in-flight computations, shared only behind admin RBAC. */
export function createDashboardCache<T>(ttlMs = 60_000) {
    let cached: { key: string; value: T; expiresAt: number } | undefined;
    const pending = new Map<string, Promise<T>>();
    let generation = 0;
    return {
        async get(key: string, compute: () => Promise<T>): Promise<T> {
            if (cached?.key === key && cached.expiresAt > Date.now()) return cached.value;
            const existing = pending.get(key);
            if (existing) return existing;
            // Environment/day changes cannot grow a per-process pending-key map without bound.
            if (pending.size >= 2) {
                await Promise.allSettled(pending.values());
                return this.get(key, compute);
            }
            const requestGeneration = ++generation;
            const work = Promise.resolve().then(compute).then(value => {
                if (requestGeneration === generation) cached = { key, value, expiresAt: Date.now() + ttlMs };
                return value;
            }).finally(() => { if (pending.get(key) === work) pending.delete(key); });
            pending.set(key, work);
            return work;
        },
        clear() { cached = undefined; pending.clear(); generation += 1; },
    };
}
