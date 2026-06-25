import type { Request, Response, NextFunction } from 'express';

// Per-request inactivity timeout.
//
// res.setTimeout arms the underlying socket's idle timer: it fires only when the
// socket goes quiet for `ms`, so it does NOT interrupt an actively streaming
// upload/download — it catches the cases we actually care about: a slow-loris
// client that opens a connection and stalls, or a handler hung on a downstream
// call (DB, payment gateway) that never responds. Either way we free the
// connection with a 503 instead of holding it open indefinitely.
//
// Webhook routes are mounted BEFORE this in index.ts, so gateway deliveries are
// exempt and never get cut off mid-processing.
export function requestTimeout(ms: number) {
    return (_req: Request, res: Response, next: NextFunction) => {
        res.setTimeout(ms, () => {
            if (!res.headersSent) {
                res.status(503).json({ error: 'Request timed out. Please try again.' });
            }
        });
        next();
    };
}
