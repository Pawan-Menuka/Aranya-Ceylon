import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';
import { prisma } from '../index.js';

// Extend Express Request type to include authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: AccessTokenPayload;
        }
    }
}

// --- requireAuth: rejects requests without a valid access token ---
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    try {
        const payload = await verifyAccessToken(token);
        req.user = payload;
        next();
    } catch {
        // Don't leak whether the token was expired vs invalid
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// --- requireRole: rejects requests from users without required role ---
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// --- requireVerified: rejects unverified email accounts ---
// Checks `verified` from the DB (not the JWT, which can be stale during the 15m
// access-token window). Previously this was a no-op that let any authenticated
// request through regardless of verification (BUG-21). Login already blocks
// unverified accounts (SEC-04); this makes the primitive genuinely enforce so
// it's safe to guard sensitive routes with.
export async function requireVerified(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { verified: true },
    });
    if (!user?.verified) {
        return res.status(403).json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' });
    }
    next();
}

// --- optionalAuth: silently populates req.user if a valid token is present ---
// Falls through to next() regardless. Use on public routes that should also
// work when authenticated (e.g. cart, product listings).
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
        try {
            const payload = await verifyAccessToken(authHeader.slice(7));
            req.user = payload;
        } catch {
            // Invalid/expired token — just ignore it and continue as guest
        }
    }

    next();
}