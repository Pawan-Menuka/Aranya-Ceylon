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

    // No cookie yet — geo-detect via Cloudflare's country header instead of
    // blindly defaulting every visitor to INTERNATIONAL/USD. Sri Lankan
    // visitors get LOCAL/LKR/PayHere by default, since many can't pay with
    // an international card at all (DEPLOY_READINESS_PLAN.md #0.3). Only
    // trusted when TRUST_CLOUDFLARE=true — same boundary as getClientIp's
    // CF-Connecting-IP (backend/src/lib/clientIp.ts): unspoofable only once
    // the origin is locked to Cloudflare-only traffic. This is still just
    // the *default* absent an explicit choice — a returning visitor's own
    // signed cookie (above) always wins, and they can switch manually at
    // any time via /market/override.
    const cfCountry = req.headers['cf-ipcountry'];
    if (env.TRUST_CLOUDFLARE && typeof cfCountry === 'string' && cfCountry === 'LK') {
        req.market = 'LOCAL';
        return next();
    }

    // Default to INTERNATIONAL otherwise (no geo signal, or Cloudflare isn't
    // the confirmed front door yet).
    req.market = 'INTERNATIONAL';
    next();
}