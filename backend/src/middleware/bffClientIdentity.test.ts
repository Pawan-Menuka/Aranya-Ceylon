import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { createHmac } from 'node:crypto';
import { request } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { bffClientIdentityFromEnv, canonicalBffClientIp, createBffClientIdentity, getVerifiedBffClientIp } from './bffClientIdentity.js';
import { getClientIp } from '../lib/clientIp.js';
import { globalLimiter, loginLimiter } from './rateLimit.js';

vi.mock('../config/env.js', () => ({ env: { TRUST_CLOUDFLARE: false } }));

const secret = 'test-bff-secret-at-least-thirty-two-characters';
const now = 1_800_000_000_000;
const ipHeader = 'x-aranya-bff-client-ip';
const timeHeader = 'x-aranya-bff-client-time';
const signatureHeader = 'x-aranya-bff-client-signature';
const servers: Server[] = [];
let optionalBase: string;
let requiredBase: string;
let untrustedBase: string;
let disabledBase: string;
let limitedBase: string;

function signedHeaders(ip = '198.51.100.10', method = 'GET', path = '/products', timestamp = now, version = 1) {
    const time = String(timestamp);
    const signature = createHmac('sha256', secret).update(JSON.stringify([version, time, method.toUpperCase(), path, ip])).digest('base64url');
    return { [ipHeader]: ip, [timeHeader]: time, [signatureHeader]: signature };
}

async function start(options: { required?: boolean; trustedPeers?: string[]; disabled?: boolean; limited?: boolean } = {}) {
    const app = express();
    app.set('trust proxy', 1);
    // Mounted before the gate just like index.ts: gateway routes own their
    // raw-body/signature checks and are unaffected by BFF browser attribution.
    app.post('/webhooks/fixture', express.raw({ type: 'application/json' }), (req, res) => {
        res.json({ raw: Buffer.isBuffer(req.body), body: (req.body as Buffer).toString() });
    });
    const gate = options.disabled ? bffClientIdentityFromEnv({})
        : createBffClientIdentity({ secret, required: options.required, trustedPeers: options.trustedPeers, now: () => now });
    if (gate) app.use(gate);
    if (options.limited) {
        app.use(globalLimiter);
        app.post('/auth/login', loginLimiter, (req, res) => res.json({ ip: getClientIp(req) }));
    }
    app.use((req, res) => res.json({ ip: getClientIp(req), verified: getVerifiedBffClientIp(req) ?? null }));
    const errorHandler: ErrorRequestHandler = (error: Error & { status?: number; expose?: boolean }, _req, res, _next) => {
        res.status(error.status ?? 500).json({ error: error.expose ? error.message : 'Request rejected' });
    };
    app.use(errorHandler);
    const server = await new Promise<Server>(resolve => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    servers.push(server);
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

beforeAll(async () => {
    optionalBase = await start();
    requiredBase = await start({ required: true });
    untrustedBase = await start({ required: true, trustedPeers: ['192.0.2.99'] });
    disabledBase = await start({ disabled: true });
    limitedBase = await start({ required: true, limited: true });
});
afterAll(async () => {
    for (const server of servers) {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

async function send(base: string, path = '/products', method = 'GET', headers: Record<string, string | string[]> = {}, body?: string) {
    return new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = request(`${base}${path}`, { method, headers }, res => {
            const chunks: Buffer[] = [];
            res.on('data', chunk => chunks.push(Buffer.from(chunk)));
            res.on('end', () => resolve({ status: res.statusCode!, body: Buffer.concat(chunks).toString() }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.end(body);
    });
}

describe('boot configuration and canonical IP contract', () => {
    it('defaults off, ignoring unverified metadata until the secret is configured', async () => {
        expect(bffClientIdentityFromEnv({})).toBeUndefined();
        expect(bffClientIdentityFromEnv({ BFF_CLIENT_IP_SECRET: '' })).toBeUndefined();
        const res = await send(disabledBase, '/products', 'GET', { [ipHeader]: '198.51.100.200' });
        expect(JSON.parse(res.body)).toEqual({ ip: '127.0.0.1', verified: null });
    });
    it.each([
        { BFF_CLIENT_IP_REQUIRED: 'true' },
        { BFF_CLIENT_IP_REQUIRED: 'TRUE' },
        { BFF_CLIENT_IP_SECRET: 'short' },
        { BFF_CLIENT_IP_SECRET: ' '.repeat(32) },
        { BFF_CLIENT_IP_SECRET: secret, BFF_TRUSTED_PEERS: '' },
        { BFF_CLIENT_IP_SECRET: secret, BFF_TRUSTED_PEERS: 'localhost' },
        { BFF_CLIENT_IP_SECRET: secret, BFF_TRUSTED_PEERS: '127.0.0.1:4000' },
    ])('fails startup for invalid rollout settings %j', environment => {
        expect(() => bffClientIdentityFromEnv(environment)).toThrow();
    });
    it.each([
        ['198.51.100.1', '198.51.100.1'],
        [' 198.51.100.1 ', '198.51.100.1'],
        ['2001:0DB8:0:0:0:0:0:1', '2001:db8::1'],
        ['::FFFF:198.51.100.1', '198.51.100.1'],
        ['::ffff:c633:6401', '198.51.100.1'],
        ['::1', '::1'],
        ['localhost', undefined],
        ['198.51.100.01', undefined],
        ['198.51.100.1,198.51.100.2', undefined],
        ['fe80::1%eth0', undefined],
        ['[::1]', undefined],
    ])('canonicalizes literal IP %s', (input, expected) => {
        expect(canonicalBffClientIp(input!)).toBe(expected);
    });
});

describe('actual Express signature verification', () => {
    it.each(['198.51.100.10', '2001:db8::1'])('stores only authenticated canonical visitor %s', async ip => {
        const res = await send(requiredBase, '/products', 'GET', { ...signedHeaders(ip), 'x-forwarded-for': '203.0.113.200', 'cf-connecting-ip': '203.0.113.201' });
        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual({ ip, verified: ip });
    });
    it('binds the exact raw path/query and method', async () => {
        const path = '/products?b=%2F&a=one+two';
        const headers = signedHeaders('198.51.100.10', 'POST', path);
        expect((await send(requiredBase, path, 'POST', headers)).status).toBe(200);
        expect((await send(requiredBase, '/products?a=one+two&b=%2F', 'POST', headers)).status).toBe(403);
        expect((await send(requiredBase, '/products?b=/&a=one+two', 'POST', headers)).status).toBe(403);
        expect((await send(requiredBase, path, 'GET', headers)).status).toBe(403);
        expect((await send(requiredBase, '/categories', 'POST', headers)).status).toBe(403);
    });
    it.each([now, now - 30_000])('accepts timestamp %s within its freshness window', async timestamp => {
        expect((await send(requiredBase, '/products', 'GET', signedHeaders('198.51.100.10', 'GET', '/products', timestamp))).status).toBe(200);
    });
    it.each([now + 1, now - 30_001, 0, Number.MAX_SAFE_INTEGER + 1])('rejects future, expired or invalid timestamp %s', async timestamp => {
        expect((await send(requiredBase, '/products', 'GET', signedHeaders('198.51.100.10', 'GET', '/products', timestamp))).status).toBe(403);
    });
    it.each(['198.51.100.1,203.0.113.2', 'localhost', '2001:DB8::1', '::ffff:c633:6401', '127.0.0.1:4000', 'fe80::1%eth0'])('rejects noncanonical or invalid signed IP %s', async ip => {
        expect((await send(requiredBase, '/products', 'GET', signedHeaders(ip))).status).toBe(403);
    });
    it.each(IDENTITY_HEADER_NAMES())('rejects partial assertion missing %s even during optional rollout', async missing => {
        const headers: Record<string, string> = signedHeaders();
        delete headers[missing];
        const res = await send(optionalBase, '/products', 'GET', headers);
        expect(res.status).toBe(403);
        expect(JSON.parse(res.body)).toEqual({ error: 'BFF client identity rejected' });
    });
    it.each(IDENTITY_HEADER_NAMES())('rejects repeated assertion header %s', async repeated => {
        const headers: Record<string, string | string[]> = signedHeaders();
        headers[repeated] = [String(headers[repeated]), String(headers[repeated])];
        expect((await send(requiredBase, '/products', 'GET', headers)).status).toBe(403);
    });
    it.each(['not-a-signature', 'a'.repeat(43), 'a'.repeat(44), '+'.repeat(43)])('rejects forged or malformed signature %s', async signature => {
        expect((await send(optionalBase, '/products', 'GET', { ...signedHeaders(), [signatureHeader]: signature })).status).toBe(403);
    });
    it('rejects unsupported signed payload version and a substituted identity', async () => {
        expect((await send(requiredBase, '/products', 'GET', signedHeaders('198.51.100.10', 'GET', '/products', now, 2))).status).toBe(403);
        expect((await send(requiredBase, '/products', 'GET', { ...signedHeaders(), [ipHeader]: '198.51.100.11' })).status).toBe(403);
    });
    it('does not apply browser identity verification to a preceding raw webhook route', async () => {
        const res = await send(requiredBase, '/webhooks/fixture', 'POST', { 'content-type': 'application/json', [ipHeader]: 'forged' }, '{"exact":"raw"}');
        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual({ raw: true, body: '{"exact":"raw"}' });
    });
});

function IDENTITY_HEADER_NAMES() { return [ipHeader, timeHeader, signatureHeader]; }

describe('strict unsigned local SSR exceptions', () => {
    it.each(['/products', '/products/featured', '/products/search?term=tea', '/products/ceylon-tea', '/categories', '/blog/story', '/recipes/curry', '/gifts/classic', '/health'])('allows bounded public GET/HEAD from the actual trusted socket for %s', async path => {
        expect((await send(requiredBase, path)).status).toBe(200);
        expect((await send(requiredBase, path, 'HEAD')).status).toBe(200);
    });
    it.each(['/auth/me', '/auth/verify?token=fixture', '/cart', '/orders', '/market', '/admin', '/categories/private', '/products/admin/all', '/health/private', '/unknown'])('rejects unsigned private/unbounded GET %s', async path => {
        expect((await send(requiredBase, path, 'GET', { Cookie: 'refreshToken=fixture', Authorization: 'Bearer fixture', 'Sec-Fetch-Site': 'same-origin' })).status).toBe(403);
    });
    it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('rejects unsigned local %s despite trusted socket and browser-like metadata', async method => {
        expect((await send(requiredBase, '/products', method, { Cookie: 'fixture=present', 'Sec-Fetch-Site': 'same-origin', 'x-forwarded-for': '198.51.100.2' })).status).toBe(403);
    });
    it('rejects untrusted socket public reads even with forged trusted proxy headers', async () => {
        expect((await send(untrustedBase, '/products', 'GET', { 'x-forwarded-for': '127.0.0.1', 'cf-connecting-ip': '127.0.0.1' })).status).toBe(403);
        expect((await send(untrustedBase, '/health', 'HEAD')).status).toBe(403);
        // Valid service authentication is sufficient even if the signed
        // connection is not an unsigned-SSR peer.
        expect((await send(untrustedBase, '/products', 'GET', signedHeaders())).status).toBe(200);
    });
    it('preserves unsigned fallback only during optional rollout', async () => {
        expect((await send(optionalBase, '/auth/me')).status).toBe(200);
    });
});

describe('existing actual rate limiter isolation', () => {
    it('isolates two signed visitors at the unchanged ten-login budget', async () => {
        const firstIp = '198.51.100.80';
        const otherIp = '198.51.100.81';
        const path = '/auth/login';
        for (let index = 0; index < 10; index++) {
            expect((await send(limitedBase, path, 'POST', signedHeaders(firstIp, 'POST', path))).status).toBe(200);
        }
        expect((await send(limitedBase, path, 'POST', signedHeaders(firstIp, 'POST', path))).status).toBe(429);
        const other = await send(limitedBase, path, 'POST', signedHeaders(otherIp, 'POST', path));
        expect(other.status).toBe(200);
        expect(JSON.parse(other.body)).toEqual({ ip: otherIp });
    });
    it('isolates signed visitors at the unchanged global 120-request budget; invalid identity never enters the limiter', async () => {
        const firstIp = '198.51.100.90';
        const otherIp = '198.51.100.91';
        expect((await send(limitedBase, '/products', 'GET', { ...signedHeaders(firstIp), [signatureHeader]: 'a'.repeat(43) })).status).toBe(403);
        for (let index = 0; index < 120; index++) {
            expect((await send(limitedBase, '/products', 'GET', signedHeaders(firstIp))).status).toBe(200);
        }
        expect((await send(limitedBase, '/products', 'GET', signedHeaders(firstIp))).status).toBe(429);
        expect((await send(limitedBase, '/products', 'GET', signedHeaders(otherIp))).status).toBe(200);
    });
    it('keeps unsigned trusted SSR under the existing global limit', async () => {
        for (let index = 0; index < 120; index++) expect((await send(limitedBase)).status).toBe(200);
        expect((await send(limitedBase)).status).toBe(429);
        expect((await send(limitedBase, '/health')).status).toBe(200);
    });
});
