import cors from 'cors';
import type { RequestHandler } from 'express';

interface BrowserCorsConfig {
    nodeEnv?: string;
    frontendUrl?: string;
}

/** Browser-origin gate; downstream authentication still owns access to data. */
export function browserCors(config: BrowserCorsConfig = {
    nodeEnv: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
}): RequestHandler {
    // Only an explicit development environment may relax this gate. In
    // particular, do not use env.NODE_ENV's development default here.
    const isDev = config.nodeEnv === 'development';
    const allowedOrigins = (config.frontendUrl ?? 'http://localhost:3000')
        .split(',').map(origin => origin.trim()).filter(Boolean);
    const browser = cors({ origin: true, credentials: true });

    return (req, res, next) => {
        const origin = req.get('Origin');
        res.vary('Origin');
        if (isDev || (origin !== undefined && origin !== '' && origin !== 'null' && allowedOrigins.includes(origin))) {
            return browser(req, res, next);
        }
        // Next's server reads and same-origin BFF GETs can omit Origin. They
        // need no CORS response headers. This exception never authorizes a
        // write or OPTIONS preflight, even with cookies/Authorization or
        // Sec-Fetch-Site: same-origin (those are not trusted BFF credentials).
        if (origin === undefined && (req.method === 'GET' || req.method === 'HEAD')) {
            return next();
        }
        // An explicit "null"/empty/untrusted Origin is never a server read.
        const error = new Error('CORS: origin not allowed') as Error & { status: number; expose: boolean };
        error.status = 403;
        error.expose = true;
        return next(error);
    };
}
