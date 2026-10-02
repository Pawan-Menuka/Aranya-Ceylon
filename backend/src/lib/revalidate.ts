import { invalidateCatalogCache } from './simpleCache.js';

// Invalidates public Next.js data/path caches. Single paths retain the legacy
// GET contract; batches share one request and one three-second budget.
// Non-fatal: failed invalidation falls back to the public data cache's TTL.
// Secret is sent as a header (not a query param) so it doesn't appear in logs.
// FRONTEND_URL may be comma-separated (CORS list); only the first origin is used.
export async function revalidateFrontend(path: string | string[]): Promise<void> {
    const secret = process.env.REVALIDATION_SECRET;
    const baseUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
        .split(',')[0]!
        .trim();

    const paths = [...new Set(Array.isArray(path) ? path : [path])];
    // Local market-keyed caches must stop serving the committed old view
    // even when remote invalidation is unconfigured or unavailable.
    invalidateCatalogCache(paths);
    if (!secret || paths.length === 0) return;

    try {
        const batch = Array.isArray(path);
        const response = await fetch(`${baseUrl}/api/revalidate${batch ? '' : `?path=${encodeURIComponent(path as string)}`}`, {
            method: batch ? 'POST' : 'GET',
            headers: { 'x-revalidate-secret': secret, ...(batch ? { 'content-type': 'application/json' } : {}) },
            ...(batch ? { body: JSON.stringify({ paths }) } : {}),
            signal: AbortSignal.timeout(3000),
        });
        await response.arrayBuffer();
        if (!response.ok) {
            console.warn('[REVALIDATION] Frontend rejected invalidation', { pathCount: paths.length, status: response.status });
        }
    } catch (error) {
        const name = error instanceof Error ? error.name : '';
        console.warn('[REVALIDATION] Frontend invalidation failed; public TTL remains the fallback', {
            pathCount: paths.length,
            reason: name === 'TimeoutError' ? 'timeout' : name === 'AbortError' ? 'aborted' : 'network',
        });
    }
}
