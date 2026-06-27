import type { Request } from 'express';
import { env } from '../config/env.js';

// Resolves the real client IP for rate limiting and audit logging.
//
// Behind Cloudflare (TRUST_CLOUDFLARE=true) the canonical client IP is the
// CF-Connecting-IP header. Cloudflare sets it on every request and it can't be
// spoofed as long as the origin only accepts Cloudflare traffic (lock the origin
// as part of the Cloudflare rollout). Otherwise we fall back to req.ip, which
// Express derives from X-Forwarded-For according to the TRUST_PROXY hop count.
//
// Centralising this means the rate limiters and the audit log agree on exactly
// what "the client" is, and switching to Cloudflare is a config change, not a
// code change.
export function getClientIp(req: Request): string {
    if (env.TRUST_CLOUDFLARE) {
        const cf = req.headers['cf-connecting-ip'];
        if (typeof cf === 'string' && cf.length > 0) return cf;
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
