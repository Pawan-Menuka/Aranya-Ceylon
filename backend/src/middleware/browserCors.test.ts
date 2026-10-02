import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { request } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { browserCors } from './browserCors.js';

const storefront = 'https://aranya.example';
const secondStorefront = 'https://www.aranya.example';
const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const servers: Server[] = [];
const bases = new Map<string | undefined, string>();

beforeAll(async () => {
    for (const nodeEnv of ['production', 'development', undefined, 'prod', 'test']) {
        const app = express();
        app.use(browserCors({ nodeEnv, frontendUrl: ` ${storefront}, ${secondStorefront}, ,null ` }));
        app.get('/auth/me', (_req, res) => res.status(401).json({ error: 'Authentication required' }));
        app.use((req, res) => {
            // Mirrors the BFF's unmodified forwarding of cookies/bearer and
            // fetch metadata, without importing index.ts or opening a DB.
            res.cookie('fixture', 'retained', { httpOnly: true });
            res.json({ method: req.method, cookie: req.get('Cookie'), authorization: req.get('Authorization') });
        });
        const errorHandler: ErrorRequestHandler = (error: Error & { status?: number; expose?: boolean }, _req, res, _next) => {
            res.status(error.status ?? 500).json({ error: error.expose ? error.message : 'Request rejected' });
        };
        app.use(errorHandler);
        const server = await new Promise<Server>(resolve => {
            const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
        });
        servers.push(server);
        bases.set(nodeEnv ?? 'unset', `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    }
});

afterAll(async () => {
    for (const server of servers) {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

async function send(method: string, headers: Record<string, string> = {}, nodeEnv: string | undefined = 'production', path = '/products') {
    return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
        const req = request(`${bases.get(nodeEnv)}${path}`, { method, headers }, res => {
            const chunks: Buffer[] = [];
            res.on('data', chunk => chunks.push(Buffer.from(chunk)));
            res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks).toString() }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.end();
    });
}

describe('production browser origins over real Express HTTP', () => {
    it.each(methods)('allows configured origin with credentials for %s', async method => {
        const res = await send(method, { Origin: storefront, 'Access-Control-Request-Method': 'POST' });
        expect(res.status).toBe(method === 'OPTIONS' ? 204 : 200);
        expect(res.headers['access-control-allow-origin']).toBe(storefront);
        expect(res.headers['access-control-allow-credentials']).toBe('true');
        expect(res.headers.vary).toContain('Origin');
    });

    it('accepts another comma-separated origin after trimming configuration', async () => {
        expect((await send('GET', { Origin: secondStorefront })).headers['access-control-allow-origin']).toBe(secondStorefront);
    });

    it('preserves credentialed write/preflight behavior through the BFF', async () => {
        const preflight = await send('OPTIONS', {
            Origin: storefront, 'Access-Control-Request-Method': 'PATCH',
            'Access-Control-Request-Headers': 'authorization,content-type',
        });
        expect(preflight.status).toBe(204);
        expect(preflight.headers['access-control-allow-methods']).toContain('PATCH');
        expect(preflight.headers['access-control-allow-headers']).toBe('authorization,content-type');
        const write = await send('PATCH', { Origin: storefront, Cookie: 'refreshToken=fixture', Authorization: 'Bearer fixture', 'Sec-Fetch-Site': 'same-origin' });
        expect(JSON.parse(write.body)).toEqual({ method: 'PATCH', cookie: 'refreshToken=fixture', authorization: 'Bearer fixture' });
        expect(write.headers['set-cookie']).toEqual([expect.stringContaining('fixture=retained')]);
    });

    it.each(methods.flatMap(method => ['https://evil.example', 'null', '', `${storefront}.evil.example`].map(origin => [method, origin])))('rejects %s with explicit origin %j as 403', async (method, origin) => {
        const res = await send(method!, { Origin: origin! });
        expect(res.status).toBe(403);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
        if (method !== 'HEAD') expect(JSON.parse(res.body)).toEqual({ error: 'CORS: origin not allowed' });
    });
});

describe('missing Origin server/BFF reads', () => {
    it.each(['GET', 'HEAD'])('allows %s without CORS permission headers', async method => {
        const res = await send(method, { Cookie: 'x-market=fixture', 'Sec-Fetch-Site': 'same-origin' });
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
        expect(res.headers['access-control-allow-credentials']).toBeUndefined();
        expect(res.headers.vary).toContain('Origin');
        expect(res.headers['set-cookie']).toEqual([expect.stringContaining('fixture=retained')]);
        if (method === 'GET') expect(JSON.parse(res.body)).toEqual({ method: 'GET', cookie: 'x-market=fixture' });
    });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('rejects absent-origin %s even with cookies, bearer and same-origin fetch metadata', async method => {
        const res = await send(method, { Cookie: 'refreshToken=fixture', Authorization: 'Bearer fixture', 'Sec-Fetch-Site': 'same-origin', 'Access-Control-Request-Method': 'GET' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.body)).toEqual({ error: 'CORS: origin not allowed' });
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('leaves authentication to downstream middleware on an absent-origin private GET', async () => {
        const res = await send('GET', {}, 'production', '/auth/me');
        expect(res.status).toBe(401);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});

describe('explicit development relaxation and fail-closed environments', () => {
    it.each(methods.flatMap(method => [undefined, 'null', 'https://evil.example'].map(origin => [method, origin])))('development allows %s with origin %j', async (method, origin) => {
        const res = await send(method!, origin === undefined ? {} : { Origin: origin }, 'development');
        expect(res.status).toBe(method === 'OPTIONS' ? 204 : 200);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    it.each([undefined, 'prod', 'test'])('fails closed with NODE_ENV=%j', async nodeEnv => {
        const target = nodeEnv === undefined ? 'unset' : nodeEnv;
        for (const origin of ['null', 'https://evil.example']) {
            expect((await send('GET', { Origin: origin }, target)).status).toBe(403);
        }
        expect((await send('POST', {}, target)).status).toBe(403);
        expect((await send('OPTIONS', {}, target)).status).toBe(403);
        expect((await send('GET', {}, target)).status).toBe(200);
        expect((await send('GET', { Origin: storefront }, target)).status).toBe(200);
    });
});
