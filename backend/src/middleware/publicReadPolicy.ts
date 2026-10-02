import type { Request, Response, NextFunction } from 'express';

// Conditional browser reads may reuse their own representation only after
// checking the server. Cookie/Authorization select the market; shared edge
// caches must never reuse these responses across visitors or markets.
const PUBLIC_READ = /^\/(?:products(?:\/[a-z0-9-]+)?|categories|search|blog(?:\/[a-z0-9-]+)?|recipes(?:\/[a-z0-9-]+)?|gifts(?:\/[a-z0-9-]+)?)\/?$/;

export function publicReadPolicy(req: Request, res: Response, next: NextFunction) {
    const publicRead = (req.method === 'GET' || req.method === 'HEAD') && PUBLIC_READ.test(req.path);
    res.setHeader('Cache-Control', publicRead ? 'private, no-cache' : 'private, no-store');
    if (publicRead) {
        res.vary('Cookie');
        res.vary('Authorization');
    }
    next();
}
