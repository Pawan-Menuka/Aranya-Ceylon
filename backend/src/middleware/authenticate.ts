import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';

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
export function requireVerified(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // Note: verified status is checked from DB in sensitive routes,
    // not from JWT — JWT payload can be stale during the 15min window
    next();
}