/**
 * Regression tests for register() anti-enumeration (KNOWN_ISSUES #9 + #18).
 *
 *  #9  — new vs existing email must return BYTE-IDENTICAL responses (no token,
 *        no user object that would betray which emails are registered).
 *  #18 — a duplicate email (unique-constraint P2002) is swallowed, not 500'd.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const store = vi.hoisted(() => ({ createImpl: async (_args: unknown): Promise<void> => {} }));

// bcrypt hash is slow (12 rounds) and irrelevant to these assertions — stub it.
vi.mock('@node-rs/bcrypt', () => ({
    hash: vi.fn(async () => '$2b$12$stubbedhashvalue'),
    verify: vi.fn(async () => true),
}));

vi.mock('../index.js', () => ({
    prisma: { user: { create: (args: unknown) => store.createImpl(args) } },
}));

import { register } from './auth.controller.js';

// Minimal Express res double that captures status + json body.
function mockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.body = undefined;
    res.cookies = [] as unknown[];
    res.status = (n: number) => { res.statusCode = n; return res; };
    res.json = (b: unknown) => { res.body = b; return res; };
    res.cookie = (...args: unknown[]) => { res.cookies.push(args); return res; };
    return res;
}

const req = (email: string) =>
    ({ body: { name: 'Test', email, password: 'sup3rsecret!' } }) as any;

beforeEach(() => {
    store.createImpl = async () => {}; // default: success (new email)
});

describe('register — #9 anti-enumeration', () => {
    it('returns the neutral message with NO token for a brand-new email', async () => {
        const res = mockRes();
        await register(req('new@example.com'), res);

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({ message: 'If this email is new, a verification link has been sent.' });
        expect(res.body.accessToken).toBeUndefined();
        expect(res.body.user).toBeUndefined();
        expect(res.cookies).toHaveLength(0); // no session established on signup
    });

    it('returns a BYTE-IDENTICAL response for an already-registered email', async () => {
        // Simulate the unique-constraint violation Prisma throws on duplicate email.
        store.createImpl = async () => {
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002', clientVersion: 'test',
            });
        };

        const newRes = mockRes();
        await register(req('new@example.com'), (newRes));

        store.createImpl = async () => {
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002', clientVersion: 'test',
            });
        };
        const dupRes = mockRes();
        await register(req('taken@example.com'), dupRes);

        expect(dupRes.statusCode).toBe(201);
        expect(dupRes.body).toEqual({ message: 'If this email is new, a verification link has been sent.' });
        expect(dupRes.cookies).toHaveLength(0);
    });

    it('re-throws non-P2002 errors instead of masking them', async () => {
        store.createImpl = async () => { throw new Error('DB exploded'); };
        await expect(register(req('boom@example.com'), mockRes())).rejects.toThrow('DB exploded');
    });
});
