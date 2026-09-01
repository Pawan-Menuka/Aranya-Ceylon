import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { getClientIp } from '../lib/clientIp.js';

// ── Rate limiters (#10) ─────────────────────────────────────────────
// Protect auth endpoints from brute-force and registration spam.
// NOTE: behind a proxy (Render/Railway/Fly/Nginx) set TRUST_PROXY (hop count)
// and, when fronted by Cloudflare, TRUST_CLOUDFLARE=true so the limiter keys on
// the real client IP, not an edge IP — see lib/clientIp.ts + index.ts.

const json429 = (message: string) => ({
    handler: (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
        res.status(429).json({ error: message });
    },
});

// All limiters key on the resolved client IP. ipKeyGenerator normalises IPv6
// (grouping a /64) so a single client can't sidestep limits by rotating within
// its address block.
const keyGenerator = (req: Request) => ipKeyGenerator(getClientIp(req));

// Tight limiter for login: brute-force protection on credentials.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,                // 10 attempts per IP per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    ...json429('Too many login attempts. Please try again in a few minutes.'),
});

// Broader limiter for the rest of the auth surface (register, refresh, etc.).
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    ...json429('Too many requests. Please slow down and try again shortly.'),
});

// Global baseline limiter applied to every API route (mounted in index.ts).
// Generous enough for normal browsing — a product page fires several API calls —
// but caps scripted abuse on the endpoints that previously had no limiter at all
// (cart, products, etc.). Webhooks are mounted ABOVE this in index.ts and are
// intentionally exempt: payment gateways legitimately retry. /health is skipped
// so uptime monitors aren't throttled.
export const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 120,          // 120 requests per IP per minute
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    skip: (req: { path?: string }) => req.path === '/health',
    ...json429('Too many requests. Please slow down.'),
});

// Admin endpoints can fan out into expensive aggregation queries. Apply this
// after authentication so limits are isolated per staff account (with the
// resolved client IP as a defensive fallback) rather than shared by an office.
export const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.user?.userId ?? keyGenerator(req),
    ...json429('Too many admin requests. Please wait a moment and try again.'),
});

// Tight limiter for checkout: POST /checkout/create-intent creates a Stripe
// PaymentIntent (an external, billable API call) and is reachable by guests.
// Without this, the endpoint can be hammered to run up gateway cost / noise.
export const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    ...json429('Too many checkout attempts. Please wait a moment and try again.'),
});

// Anti-spam limiter for the public, unauthenticated contact form.
export const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    ...json429('Too many messages sent. Please try again later.'),
});
