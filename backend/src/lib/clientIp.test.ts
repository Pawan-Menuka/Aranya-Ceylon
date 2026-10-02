import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { createBffClientIdentity } from '../middleware/bffClientIdentity.js';
import { getClientIp } from './clientIp.js';

const configuration = vi.hoisted(() => ({ TRUST_CLOUDFLARE: false }));
vi.mock('../config/env.js', () => ({ env: configuration }));

function requestFixture(headers: Record<string, string> = {}, ip: string | undefined = '192.0.2.2'): Request {
    return { headers, rawHeaders: Object.entries(headers).flat(), ip, socket: { remoteAddress: '127.0.0.1' }, method: 'GET', path: '/products', originalUrl: '/products' } as unknown as Request;
}

describe('rate-limit and audit IP resolution', () => {
    it('ignores arbitrary BFF/ingress headers and request fields without verifier authentication', () => {
        configuration.TRUST_CLOUDFLARE = false;
        const req = requestFixture({ 'x-aranya-bff-client-ip': '198.51.100.10', 'x-aranya-verified-client-ip': '198.51.100.11' });
        Object.assign(req, { verifiedBffClientIp: '198.51.100.12', bffClientIp: '198.51.100.13' });
        expect(getClientIp(req)).toBe('192.0.2.2');
    });
    it('retains the existing CF/Express/socket fallback contract when no identity is verified', () => {
        configuration.TRUST_CLOUDFLARE = true;
        expect(getClientIp(requestFixture({ 'cf-connecting-ip': '198.51.100.20' }))).toBe('198.51.100.20');
        expect(getClientIp(requestFixture())).toBe('192.0.2.2');
        const req = requestFixture();
        Object.defineProperty(req, 'ip', { value: undefined });
        expect(getClientIp(req)).toBe('127.0.0.1');
        Object.assign(req.socket, { remoteAddress: undefined });
        expect(getClientIp(req)).toBe('unknown');
    });
    it('prefers verified BFF identity over forged CF/proxy headers and does not transfer it to another request', () => {
        configuration.TRUST_CLOUDFLARE = true;
        const secret = 'client-ip-test-secret-at-least-thirty-two-chars';
        const time = String(Date.now());
        const ip = '198.51.100.30';
        const signature = createHmac('sha256', secret).update(JSON.stringify([1, time, 'GET', '/products', ip])).digest('base64url');
        const req = requestFixture({ 'x-aranya-bff-client-ip': ip, 'x-aranya-bff-client-time': time, 'x-aranya-bff-client-signature': signature, 'cf-connecting-ip': '198.51.100.99' });
        const next = vi.fn();
        createBffClientIdentity({ secret })(req, {} as Parameters<ReturnType<typeof createBffClientIdentity>>[1], next);
        expect(next).toHaveBeenCalledWith();
        expect(getClientIp(req)).toBe(ip);
        // Copying all public request properties cannot copy the private value.
        expect(getClientIp({ ...req } as Request)).toBe('198.51.100.99');
        expect(getClientIp(requestFixture())).toBe('192.0.2.2');
    });
});
