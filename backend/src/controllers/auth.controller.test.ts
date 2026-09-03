/**
 * Regression tests for register() anti-enumeration (KNOWN_ISSUES #9 + #18).
 *
 *  #9  — new vs existing email must return BYTE-IDENTICAL responses (no token,
 *        no user object that would betray which emails are registered).
 *  #18 — a duplicate email (unique-constraint P2002) is swallowed, not 500'd.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const store = vi.hoisted(() => ({
    createImpl: async (_args: unknown): Promise<void> => {},
    findUniqueImpl: async (_args: unknown): Promise<{ id: string; email: string } | null> => null,
    resetPasswordImpl: async (_token: string, _hash: string): Promise<void> => {},
}));

// bcrypt hash is slow (12 rounds) and irrelevant to these assertions — stub it.
vi.mock('@node-rs/bcrypt', () => ({
    hash: vi.fn(async () => '$2b$12$stubbedhashvalue'),
    verify: vi.fn(async () => true),
}));

vi.mock('../index.js', () => ({
    prisma: {
        user: {
            create: (args: unknown) => store.createImpl(args),
            findUnique: (args: unknown) => store.findUniqueImpl(args),
        },
    },
}));

// Isolate the two controller tests below from token.service's real DB calls —
// it has its own dedicated unit tests (token.service.test.ts).
vi.mock('../services/token.service.js', () => ({
    issueEmailVerificationToken: vi.fn(async () => 'stub-verify-token'),
    issuePasswordResetToken: vi.fn(async () => 'stub-reset-token'),
    resetPasswordWithToken: (token: string, hash: string) => store.resetPasswordImpl(token, hash),
}));
vi.mock('../services/email.service.js', () => ({
    sendVerificationEmail: vi.fn(async () => {}),
    sendPasswordResetEmail: vi.fn(async () => {}),
}));

import { register, forgotPassword, resetPassword } from './auth.controller.js';

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
    store.findUniqueImpl = async () => null; // default: no matching user
    store.resetPasswordImpl = async () => {}; // default: token accepted
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

const forgotReq = (email: string) => ({ body: { email } }) as any;
const resetReq = (token: string, password: string) => ({ body: { token, password } }) as any;

describe('forgotPassword — anti-enumeration', () => {
    it('returns the same neutral message for an existing account', async () => {
        store.findUniqueImpl = async () => ({ id: 'u1', email: 'real@example.com' });

        const res = mockRes();
        await forgotPassword(forgotReq('real@example.com'), res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'If that email is registered, a password reset link has been sent.' });
    });

    it('returns the BYTE-IDENTICAL message for an email that does not exist', async () => {
        store.findUniqueImpl = async () => null;

        const res = mockRes();
        await forgotPassword(forgotReq('nobody@example.com'), res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'If that email is registered, a password reset link has been sent.' });
    });
});

describe('resetPassword', () => {
    it('hashes the new password and delegates to token.service on a valid token', async () => {
        let captured: [string, string] | null = null;
        store.resetPasswordImpl = async (token, hash) => { captured = [token, hash]; };

        const res = mockRes();
        await resetPassword(resetReq('a-valid-token', 'NewPassw0rd!'), res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'Your password has been reset. Please sign in.' });
        expect(captured).toEqual(['a-valid-token', '$2b$12$stubbedhashvalue']);
    });

    it('collapses any token.service failure to one generic 400 — never reveals why', async () => {
        store.resetPasswordImpl = async () => { throw new Error('RESET_TOKEN_EXPIRED'); };

        const res = mockRes();
        await resetPassword(resetReq('an-expired-token', 'NewPassw0rd!'), res);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'That reset link is invalid or has expired. Please request a new one.' });
    });
});
