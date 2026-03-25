import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps async route handlers so thrown errors reach the Express error handler
export const asyncHandler = (fn: RequestHandler) =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };