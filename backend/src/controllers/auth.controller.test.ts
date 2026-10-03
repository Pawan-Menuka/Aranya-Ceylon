/**
 * Regression tests for register() anti-enumeration (KNOWN_ISSUES #9 + #18).
 *
 *  #9  — new vs existing email must return BYTE-IDENTICAL responses (no token,
 *        no user object that would betray which emails are registered).
 *  #18 — a duplicate email (unique-constraint P2002) is swallowed, not 500'd.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { requestDouble, responseDouble } from '../test/httpDoubles.js';

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

vi.mock('../lib/prisma.js', () => ({
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

import { register, forgotPassword, resetPassword, login } from './auth.controller.js';
import { hash, verify } from '@node-rs/bcrypt';
import { registerSchema, loginSchema, checkoutSchema } from '@aranya/shared';

// Minimal Express res double that captures status + json body.
function mockRes() {
    const res = responseDouble<Record<string, unknown>>();
    const cookies: unknown[][] = [];
    return Object.assign(res, {
        cookies,
        cookie(...args: unknown[]) { cookies.push(args); return res; },
    });
}

const req = (email: string) =>
    requestDouble({ body: { name: 'Test', email, password: 'sup3rsecret!' } });

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

const forgotReq = (email: string) => requestDouble({ body: { email } });
const resetReq = (token: string, password: string) => requestDouble({ body: { token, password } });

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

// Final audit #18: the stand-in hash for unknown emails was not valid bcrypt,
// so it was rejected in ~0 ms against ~200 ms for a real account — a timing
// oracle for which emails are registered.
describe('login — unknown emails cost the same as real ones', () => {
    it('compares an unknown email against a real bcrypt hash generated once', async () => {
        store.findUniqueImpl = async () => null;
        const loginReq = (email: string) => requestDouble({ body: { email, password: 'whatever' } });
        // The bcrypt mock is shared with the register tests above.
        const hashCallsBefore = vi.mocked(hash).mock.calls.length;
        const verifyCallsBefore = vi.mocked(verify).mock.calls.length;

        const first = mockRes();
        await login(loginReq('nobody@example.com'), first);
        const second = mockRes();
        await login(loginReq('nobody-else@example.com'), second);

        expect(first.statusCode).toBe(401);
        expect(second.statusCode).toBe(401);
        const hashCalls = vi.mocked(hash).mock.calls.slice(hashCallsBefore);
        const verifyCalls = vi.mocked(verify).mock.calls.slice(verifyCallsBefore);
        // The stand-in is produced by the real hash function at the real cost,
        // once — not on every attempt…
        expect(hashCalls).toHaveLength(1);
        expect(hashCalls[0]![1]).toBe(12);
        // …and both attempts compared against it, never the old invalid literal.
        expect(verifyCalls).toHaveLength(2);
        expect(verifyCalls.every(([, stored]) => stored === '$2b$12$stubbedhashvalue')).toBe(true);
    });
});

// Final audit #20: emails were case-sensitive, so the same address could hold
// two accounts and signing in with a different case failed.
describe('email normalisation', () => {
    it('trims and lower-cases emails at registration and sign-in', () => {
        expect(registerSchema.parse({ name: 'Jo', email: '  John@Gmail.COM ', password: 'Passw0rd!' }).email).toBe('john@gmail.com');
        expect(loginSchema.parse({ email: 'JOHN@gmail.com', password: 'x' }).email).toBe('john@gmail.com');
    });

    it('normalises a guest checkout email the same way', () => {
        const parsed = checkoutSchema.parse({
            guestEmail: 'Guest@Example.com',
            shippingAddress: { firstName: 'A', lastName: 'B', line1: '1 St', city: 'C', country: 'us' },
            shippingMethod: 'STANDARD',
        });
        expect(parsed.guestEmail).toBe('guest@example.com');
    });

    // Final audit #24: inputs were bounded only by the request size.
    it('rejects an oversized password and address line', () => {
        expect(registerSchema.safeParse({ name: 'Jo', email: 'a@b.co', password: 'Aa1!' + 'x'.repeat(200) }).success).toBe(false);
        expect(checkoutSchema.safeParse({
            shippingAddress: { firstName: 'A', lastName: 'B', line1: 'x'.repeat(201), city: 'C', country: 'US' },
            shippingMethod: 'STANDARD',
        }).success).toBe(false);
    });
});
