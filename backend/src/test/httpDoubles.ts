import type { Request, Response } from 'express';

/** Express supplies the remaining fields; controller tests only provide those they exercise. */
export function requestDouble<T extends object>(fields: T): Request & T {
    return fields as Request & T;
}

export function responseDouble<T = unknown>() {
    const res = {
        statusCode: 200,
        body: undefined as T,
        status(code: number) { this.statusCode = code; return this; },
        json(body: T) { this.body = body; return this; },
        send(body: T) { this.body = body; return this; },
    };
    return res as Response & typeof res;
}
