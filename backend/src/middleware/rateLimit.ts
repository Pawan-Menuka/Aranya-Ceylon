import rateLimit from 'express-rate-limit';

// ── Rate limiters (#10) ─────────────────────────────────────────────
// Protect auth endpoints from brute-force and registration spam.
// NOTE: behind a proxy (Render/Railway/Fly/Nginx) set `app.set('trust proxy', 1)`
// so the limiter keys on the real client IP, not the proxy's — done in index.ts.

const json429 = (message: string) => ({
    handler: (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
        res.status(429).json({ error: message });
    },
});

// Tight limiter for login: brute-force protection on credentials.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,                // 10 attempts per IP per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...json429('Too many login attempts. Please try again in a few minutes.'),
});

// Broader limiter for the rest of the auth surface (register, refresh, etc.).
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...json429('Too many requests. Please slow down and try again shortly.'),
});
