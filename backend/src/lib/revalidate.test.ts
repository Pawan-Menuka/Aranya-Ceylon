import { afterEach, expect, it, vi } from 'vitest';
import { revalidateFrontend } from './revalidate.js';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it.each([false, true])('bounds revalidation including a stalled response body without failing the mutation (batch=%s)', async (batch) => {
    vi.useFakeTimers();
    vi.stubEnv('REVALIDATION_SECRET', 'fixture-only');
    vi.stubEnv('FRONTEND_URL', 'http://fixture.local,http://other.local');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new DOMException('Deadline', 'TimeoutError')), ms);
        return controller.signal;
    });
    const fetcher = vi.fn(async (_url: string, init: { signal: AbortSignal }) => ({ arrayBuffer: () => new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    }) }));
    vi.stubGlobal('fetch', fetcher);
    const work = revalidateFrontend(batch ? ['/products', '/products/fixture'] : '/products/fixture');
    await vi.advanceTimersByTimeAsync(3001);
    await expect(work).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(3000);
    expect(fetcher.mock.calls[0]![0]).toBe(batch ? 'http://fixture.local/api/revalidate' : 'http://fixture.local/api/revalidate?path=%2Fproducts%2Ffixture');
});

it('batches dependent paths in one authenticated POST and deduplicates them', async () => {
    vi.stubEnv('REVALIDATION_SECRET', 'fixture-only');
    vi.stubEnv('FRONTEND_URL', 'http://fixture.local');
    const fetcher = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    await revalidateFrontend(['/products', '/products/old', '/products/new', '/products']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('http://fixture.local/api/revalidate', expect.objectContaining({
        method: 'POST',
        headers: { 'x-revalidate-secret': 'fixture-only', 'content-type': 'application/json' },
        body: JSON.stringify({ paths: ['/products', '/products/old', '/products/new'] }),
    }));
});

it('reports rejected invalidation without leaking response bodies or secrets or failing the mutation', async () => {
    vi.stubEnv('REVALIDATION_SECRET', 'fixture-only');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('sensitive upstream details', { status: 401 })));
    await expect(revalidateFrontend(['/products', '/gifts'])).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith('[REVALIDATION] Frontend rejected invalidation', { pathCount: 2, status: 401 });
    expect(JSON.stringify(warning.mock.calls)).not.toContain('sensitive');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('fixture-only');
});

it('reports transport failure without logging its potentially sensitive message', async () => {
    vi.stubEnv('REVALIDATION_SECRET', 'fixture-only');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('secret in error message'); }));
    await expect(revalidateFrontend(['/products'])).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith(expect.any(String), { pathCount: 1, reason: 'network' });
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret');
});

it('does not send an empty batch', async () => {
    vi.stubEnv('REVALIDATION_SECRET', 'fixture-only');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await revalidateFrontend([]); expect(fetcher).not.toHaveBeenCalled();
});

it('does not contact the frontend when no secret is configured', async () => {
    vi.stubEnv('REVALIDATION_SECRET', '');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await revalidateFrontend('/products'); expect(fetcher).not.toHaveBeenCalled();
});
