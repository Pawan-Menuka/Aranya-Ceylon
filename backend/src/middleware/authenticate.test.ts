/**
 * Tests for requireRole (final audit #21). The role inside an access token is
 * a claim from when it was issued; a demoted or deleted admin used to keep
 * console access until the token expired.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextFunction } from 'express';
import { requestDouble, responseDouble } from '../test/httpDoubles.js';

const db = vi.hoisted(() => ({ role: 'ADMIN' as string | null, fail: false, suspended: false }));

vi.mock('../lib/prisma.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(async () => {
                if (db.fail) throw new Error('db down');
                return db.role === null ? null : { role: db.role, suspendedAt: db.suspended ? new Date() : null };
            }),
        },
    },
}));

import { requireRole } from './authenticate.js';
import { prisma } from '../lib/prisma.js';

const adminReq = () => requestDouble({ user: { userId: 'u1', email: 'a@example.com', role: 'ADMIN' } });

async function run(req = adminReq()) {
    const res = responseDouble<{ error: string }>();
    let nextArg: unknown = 'not called';
    await new Promise<void>((resolve) => {
        const next: NextFunction = (arg?: unknown) => { nextArg = arg; resolve(); };
        const json = res.json.bind(res);
        res.json = ((body: { error: string }) => { const out = json(body); resolve(); return out; }) as typeof res.json;
        requireRole('ADMIN', 'SUPERADMIN')(req, res, next);
    });
    return { res, nextArg };
}

beforeEach(() => {
    db.role = 'ADMIN';
    db.fail = false;
    db.suspended = false;
    vi.clearAllMocks();
});

describe('requireRole', () => {
    it('lets a current admin through', async () => {
        const { nextArg } = await run();
        expect(nextArg).toBeUndefined();
    });

    it('refuses an admin who has been demoted since the token was issued', async () => {
        db.role = 'CUSTOMER';
        const { res, nextArg } = await run();
        expect(res.statusCode).toBe(403);
        expect(nextArg).toBe('not called');
    });

    it('refuses a suspended admin immediately, not when the token expires', async () => {
        db.suspended = true;
        const { res, nextArg } = await run();
        expect(res.statusCode).toBe(403);
        expect(res.body).toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
        expect(nextArg).toBe('not called');
    });

    it('refuses a token whose account no longer exists', async () => {
        db.role = null;
        const { res } = await run();
        expect(res.statusCode).toBe(403);
    });

    it('rejects a token that never claimed the role without touching the database', async () => {
        const { res } = await run(requestDouble({ user: { userId: 'u1', email: 'c@example.com', role: 'CUSTOMER' } }));
        expect(res.statusCode).toBe(403);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('passes a database failure to the error handler instead of hanging', async () => {
        db.fail = true;
        const { nextArg } = await run();
        expect(nextArg).toBeInstanceOf(Error);
    });

    it('uses the current role from the database for the rest of the request', async () => {
        db.role = 'SUPERADMIN';
        const req = adminReq();
        await run(req);
        expect(req.user?.role).toBe('SUPERADMIN');
    });
});
