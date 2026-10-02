import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { Request, RequestHandler } from 'express';

const IP_HEADER = 'x-aranya-bff-client-ip';
const TIME_HEADER = 'x-aranya-bff-client-time';
const SIGNATURE_HEADER = 'x-aranya-bff-client-signature';
const IDENTITY_HEADERS = [IP_HEADER, TIME_HEADER, SIGNATURE_HEADER];
const MAX_AGE_MS = 30_000;
const PUBLIC_READ = /^\/(?:products(?:\/[a-z0-9-]+)?|categories|blog(?:\/[a-z0-9-]+)?|recipes(?:\/[a-z0-9-]+)?|gifts(?:\/[a-z0-9-]+)?|health)\/?$/;
const verifiedIps = new WeakMap<Request, string>();

/** Canonical literal IPs only: no ports, zones, comma chains or DNS names. */
export function canonicalBffClientIp(input: string): string | undefined {
    const value = input.trim();
    const family = isIP(value);
    if (family === 4) return value;
    if (family !== 6 || value.includes('%')) return undefined;
    const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1).toLowerCase();
    const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(normalized);
    if (!mapped) return normalized;
    const high = Number.parseInt(mapped[1]!, 16);
    const low = Number.parseInt(mapped[2]!, 16);
    return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
}

/** Only the verifier can install this value; incoming headers never set it. */
export function getVerifiedBffClientIp(req: Request): string | undefined {
    return verifiedIps.get(req);
}

function rejectIdentity(): Error & { status: number; expose: boolean } {
    const error = new Error('BFF client identity rejected') as Error & { status: number; expose: boolean };
    error.status = 403;
    error.expose = true;
    return error;
}

export function createBffClientIdentity(options: {
    secret: string;
    required?: boolean;
    trustedPeers?: readonly string[];
    now?: () => number;
}): RequestHandler {
    if (options.secret.trim().length < 32) throw new Error('BFF_CLIENT_IP_SECRET must contain at least 32 non-padding characters.');
    const peers = new Set((options.trustedPeers ?? ['127.0.0.1', '::1']).map(peer => {
        const normalized = canonicalBffClientIp(peer);
        if (!normalized) throw new Error('BFF_TRUSTED_PEERS must contain only literal IP addresses.');
        return normalized;
    }));
    if (peers.size === 0) throw new Error('BFF_TRUSTED_PEERS must contain at least one literal IP address.');
    const now = options.now ?? Date.now;
    return (req, _res, next) => {
        verifiedIps.delete(req);
        // rawHeaders detects duplicates even when Node joins their values in
        // req.headers. A repeated/partial assertion must never fall back to IP.
        const counts = IDENTITY_HEADERS.map(name => {
            let count = 0;
            for (let index = 0; index < req.rawHeaders.length; index += 2) {
                if (req.rawHeaders[index]!.toLowerCase() === name) count++;
            }
            return count;
        });
        const hasMetadata = counts.some(count => count > 0)
            || IDENTITY_HEADERS.some(name => req.headers[name] !== undefined);
        if (!hasMetadata) {
            if (!options.required) return next();
            // Only local bounded public SSR/cache fills and health may omit
            // visitor identity. This is a socket-peer check, never XFF/CF.
            const peer = canonicalBffClientIp(req.socket.remoteAddress ?? '');
            if ((req.method === 'GET' || req.method === 'HEAD') && PUBLIC_READ.test(req.path)
                && peer !== undefined && peers.has(peer)) return next();
            return next(rejectIdentity());
        }
        if (counts.some(count => count !== 1)) return next(rejectIdentity());
        const ip = req.headers[IP_HEADER];
        const time = req.headers[TIME_HEADER];
        const signature = req.headers[SIGNATURE_HEADER];
        if (typeof ip !== 'string' || typeof time !== 'string' || typeof signature !== 'string') return next(rejectIdentity());
        const canonicalIp = canonicalBffClientIp(ip);
        if (!canonicalIp || ip !== canonicalIp || !/^[1-9]\d{0,15}$/.test(time)) return next(rejectIdentity());
        const timestamp = Number(time);
        const currentTime = now();
        if (!Number.isSafeInteger(timestamp) || !Number.isFinite(currentTime)
            || timestamp > currentTime || currentTime - timestamp > MAX_AGE_MS) return next(rejectIdentity());
        if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return next(rejectIdentity());
        const provided = Buffer.from(signature, 'base64url');
        if (provided.length !== 32 || provided.toString('base64url') !== signature) return next(rejectIdentity());
        const payload = JSON.stringify([1, time, req.method.toUpperCase(), req.originalUrl, canonicalIp]);
        const expected = createHmac('sha256', options.secret).update(payload).digest();
        if (!timingSafeEqual(provided, expected)) return next(rejectIdentity());
        verifiedIps.set(req, canonicalIp);
        return next();
    };
}

/** Validate rollout configuration at boot; the default preserves legacy behavior. */
export function bffClientIdentityFromEnv(environment: NodeJS.ProcessEnv): RequestHandler | undefined {
    const requiredFlag = environment.BFF_CLIENT_IP_REQUIRED ?? 'false';
    if (requiredFlag !== 'true' && requiredFlag !== 'false') throw new Error('BFF_CLIENT_IP_REQUIRED must be true or false.');
    const required = requiredFlag === 'true';
    const secret = environment.BFF_CLIENT_IP_SECRET;
    if (!secret) {
        if (required) throw new Error('BFF_CLIENT_IP_SECRET is required when BFF_CLIENT_IP_REQUIRED=true.');
        return undefined;
    }
    const trustedPeers = environment.BFF_TRUSTED_PEERS?.split(',').map(peer => peer.trim());
    return createBffClientIdentity({ secret, required, trustedPeers });
}
