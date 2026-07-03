import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';

const COOKIE_SECRET = new TextEncoder().encode(env.COOKIE_SECRET);

declare global {
    namespace Express {
        interface Request {
            market?: 'LOCAL' | 'INTERNATIONAL';
        }
    }
}

export async function resolveMarket(req: Request, _res: Response, next: NextFunction) {
    const cookie = req.cookies?.['x-market'];

    if (cookie) {
        try {
            const { payload } = await jwtVerify(cookie, COOKIE_SECRET);
            req.market = payload.market === 'local' ? 'LOCAL' : 'INTERNATIONAL';
            return next();
        } catch { /* invalid cookie — fall through */ }
    }

    // Default to INTERNATIONAL if no cookie (matches geo-detection behaviour)
    req.market = 'INTERNATIONAL';
    next();
}