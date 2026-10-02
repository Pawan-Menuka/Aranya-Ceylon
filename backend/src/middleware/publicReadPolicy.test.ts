import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { publicReadPolicy } from './publicReadPolicy.js';

let server: Server;
let base: string;
beforeAll(async () => {
    const app = express();
    app.use(publicReadPolicy);
    app.use((req, res) => {
        // Delivery policy is tested with Express's real conditional response
        // handling and no DB/market-token service. Different market bodies
        // model the verified market middleware's canonical output.
        res.cookie('fixture', 'preserved', { httpOnly: true });
        res.json({ market: req.headers.cookie === 'fixture-market=local' ? 'LOCAL' : 'INTERNATIONAL', price: req.headers.cookie === 'fixture-market=local' ? 1200 : 10 });
    });
    server = await new Promise<Server>(resolve => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

it('preserves cookies and real Express ETag conditional reads without permitting shared caching', async () => {
    const first = await fetch(`${base}/products`, { headers: { Cookie: 'fixture-market=local' } });
    const etag = first.headers.get('etag')!;
    expect(first.headers.get('cache-control')).toBe('private, no-cache');
    expect(first.headers.get('vary')).toBe('Cookie, Authorization');
    expect(first.headers.get('set-cookie')).toContain('fixture=preserved');
    expect(etag).toBeTruthy();
    expect(await first.json()).toEqual({ market: 'LOCAL', price: 1200 });
    // Undici's default conditional request adds request Cache-Control:no-cache,
    // which asks Express for a fresh 200. Avoid that automatic request header.
    const same = await fetch(`${base}/products`, { cache: 'force-cache', headers: { Cookie: 'fixture-market=local', 'If-None-Match': etag } });
    expect(same.status).toBe(304);
    expect(same.headers.get('set-cookie')).toContain('fixture=preserved');
    const other = await fetch(`${base}/products`, { cache: 'force-cache', headers: { 'If-None-Match': etag } });
    expect(other.status).toBe(200);
    expect(await other.json()).toEqual({ market: 'INTERNATIONAL', price: 10 });
});

it.each(['/products', '/products/featured', '/products/bestsellers', '/products/search', '/products/cinnamon', '/categories', '/blog', '/blog/recent', '/blog/story', '/recipes', '/recipes/curry', '/gifts', '/gifts/classic'])('allows conditional public reads for %s', async path => {
    const res = await fetch(`${base}${path}`, { method: 'HEAD' });
    expect(res.headers.get('cache-control')).toBe('private, no-cache');
    expect(res.headers.get('vary')).toContain('Cookie');
});

it.each(['/products/admin/all', '/admin', '/admin/blog', '/auth/me', '/cart', '/orders', '/wishlist', '/checkout', '/market'])('keeps private endpoint %s out of caches', async path => {
    const res = await fetch(`${base}${path}`);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
});

it('does not permit caching writes to an otherwise public route', async () => {
    const res = await fetch(`${base}/products`, { method: 'POST' });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
});
