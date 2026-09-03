/**
 * Unit tests for the refresh-token lifecycle (KNOWN_ISSUES #1 regression suite).
 *
 * Uses an in-memory fake of prisma.token so no database is needed. The key
 * regression: the EXACT string handed to the cookie by issueTokenPair must
 * round-trip through rotateRefreshToken — this is the wiring that was broken
 * (cookie held an opaque string, rotation expected a JWT).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Token, User } from '@prisma/client';

// vi.hoisted runs before the hoisted vi.mock and the static imports below,
// so the module under test sees this env at load time.
vi.hoisted(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-for-vitest-only';
});

// ── In-memory fake of the prisma.token model ──────────────────────────
type TokenRow = Token & { user?: User };
let rows: TokenRow[] = [];
let idSeq = 0;

const testUser = {
    id: 'user_1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'x',
    role: 'CUSTOMER',
    verified: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    createdAt: new Date(),
    updatedAt: new Date(),
} as User;

const userUpdateCalls: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];

vi.mock('../index.js', () => ({
    prisma: {
        user: {
            update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
                userUpdateCalls.push(args);
                return { ...testUser, ...args.data };
            },
        },
        // Array-form $transaction: the real Prisma client runs these atomically;
        // the fake just awaits each already-invoked operation in order, which is
        // enough for these unit tests (no real DB/rollback semantics needed).
        $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
        token: {
            create: async ({ data }: { data: Partial<Token> }) => {
                const row = {
                    id: data.id ?? `tok_${++idSeq}`,
                    usedAt: null,
                    createdAt: new Date(),
                    ...data,
                } as TokenRow;
                rows.push(row);
                return row;
            },
            findUnique: async ({ where, include }: { where: Partial<Token>; include?: { user?: boolean } }) => {
                const row = rows.find((r) =>
                    where.tokenHash ? r.tokenHash === where.tokenHash : r.id === where.id,
                );
                if (!row) return null;
                return include?.user ? { ...row, user: testUser } : { ...row };
            },
            update: async ({ where, data }: { where: { id: string }; data: Partial<Token> }) => {
                const row = rows.find((r) => r.id === where.id);
                if (!row) throw new Error('NOT_FOUND');
                Object.assign(row, data);
                return row;
            },
            updateMany: async ({ where, data }: { where: Partial<Token>; data: Partial<Token> }) => {
                const matched = rows.filter((r) =>
                    (where.id === undefined || r.id === where.id) &&
                    (where.usedAt === undefined || r.usedAt === where.usedAt),
                );
                matched.forEach((r) => Object.assign(r, data));
                return { count: matched.length };
            },
            delete: async ({ where }: { where: { id: string } }) => {
                rows = rows.filter((r) => r.id !== where.id);
            },
            deleteMany: async ({ where }: { where: Partial<Token> }) => {
                const before = rows.length;
                rows = rows.filter((r) =>
                    !((where.family === undefined || r.family === where.family) &&
                      (where.userId === undefined || r.userId === where.userId) &&
                      (where.type === undefined || r.type === where.type)),
                );
                return { count: before - rows.length };
            },
        },
    },
}));

import { issueTokenPair, rotateRefreshToken, revokeTokenFamily, revokeAllUserTokens, issuePasswordResetToken, resetPasswordWithToken, issueEmailVerificationToken } from './token.service.js';

beforeEach(() => {
    rows = [];
    idSeq = 0;
    userUpdateCalls.length = 0;
});

describe('issueTokenPair', () => {
    it('returns an access token and a refresh plaintext, storing only the hash', async () => {
        const { accessToken, refreshTokenPlaintext } = await issueTokenPair(testUser);

        expect(accessToken.split('.')).toHaveLength(3); // a real JWT
        expect(refreshTokenPlaintext.length).toBeGreaterThanOrEqual(40);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.tokenHash).not.toBe(refreshTokenPlaintext); // never store plaintext
        expect(rows[0]!.type).toBe('REFRESH');
        expect(rows[0]!.family).toBeTruthy();
    });
});

describe('rotateRefreshToken — THE #1 regression test', () => {
    it('accepts the exact cookie value issued by issueTokenPair', async () => {
        const { refreshTokenPlaintext } = await issueTokenPair(testUser);

        // This call used to throw "Invalid Compact JWS" on 100% of requests
        const rotated = await rotateRefreshToken(refreshTokenPlaintext);

        expect(rotated.accessToken.split('.')).toHaveLength(3);
        expect(rotated.refreshTokenPlaintext).not.toBe(refreshTokenPlaintext);
        expect(rotated.user.id).toBe(testUser.id);
    });

    it('keeps the new token in the same family and marks the old one used', async () => {
        const { refreshTokenPlaintext } = await issueTokenPair(testUser);
        const family = rows[0]!.family;

        await rotateRefreshToken(refreshTokenPlaintext);

        expect(rows).toHaveLength(2);
        expect(rows[0]!.usedAt).not.toBeNull();      // old: consumed
        expect(rows[1]!.usedAt).toBeNull();          // new: fresh
        expect(rows[1]!.family).toBe(family);        // same session chain
    });

    it('rejects an unknown token with INVALID_TOKEN', async () => {
        await expect(rotateRefreshToken('not-a-real-token')).rejects.toThrow('INVALID_TOKEN');
    });

    it('detects reuse of a consumed token and nukes the whole family', async () => {
        const { refreshTokenPlaintext } = await issueTokenPair(testUser);
        await rotateRefreshToken(refreshTokenPlaintext); // legit rotation

        // Replaying the OLD token = theft signal
        await expect(rotateRefreshToken(refreshTokenPlaintext)).rejects.toThrow('TOKEN_REUSE_DETECTED');
        expect(rows).toHaveLength(0); // entire family revoked
    });

    it('rejects an expired token with TOKEN_EXPIRED and deletes it', async () => {
        const { refreshTokenPlaintext } = await issueTokenPair(testUser);
        rows[0]!.expiresAt = new Date(Date.now() - 1000);

        await expect(rotateRefreshToken(refreshTokenPlaintext)).rejects.toThrow('TOKEN_EXPIRED');
        expect(rows).toHaveLength(0);
    });
});

describe('revocation', () => {
    it('revokeTokenFamily kills only the cookie\'s session', async () => {
        const session1 = await issueTokenPair(testUser);
        await issueTokenPair(testUser); // second device
        expect(rows).toHaveLength(2);

        await revokeTokenFamily(session1.refreshTokenPlaintext);

        expect(rows).toHaveLength(1); // other device untouched
    });

    it('revokeTokenFamily is a no-op for unknown cookies', async () => {
        await issueTokenPair(testUser);
        await revokeTokenFamily('garbage-cookie-value');
        expect(rows).toHaveLength(1);
    });

    it('revokeAllUserTokens clears every session for the user', async () => {
        await issueTokenPair(testUser);
        await issueTokenPair(testUser);
        await revokeAllUserTokens(testUser.id);
        expect(rows).toHaveLength(0);
    });
});

describe('issuePasswordResetToken', () => {
    it('stores a PASSWORD_RESET token hash, never the plaintext', async () => {
        const plaintext = await issuePasswordResetToken(testUser.id);

        expect(plaintext.length).toBeGreaterThanOrEqual(40);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.type).toBe('PASSWORD_RESET');
        expect(rows[0]!.tokenHash).not.toBe(plaintext);
        expect(rows[0]!.usedAt).toBeNull();
    });
});

describe('resetPasswordWithToken', () => {
    it('updates the password, burns the token, and revokes every REFRESH session', async () => {
        // Two existing logged-in devices for this user.
        await issueTokenPair(testUser);
        await issueTokenPair(testUser);
        const plaintext = await issuePasswordResetToken(testUser.id);

        await resetPasswordWithToken(plaintext, '$2b$12$newhashvalue');

        expect(userUpdateCalls).toHaveLength(1);
        expect(userUpdateCalls[0]).toEqual({
            where: { id: testUser.id },
            data: { passwordHash: '$2b$12$newhashvalue' },
        });

        const remaining = rows.filter((r) => r.type === 'REFRESH');
        expect(remaining).toHaveLength(0); // both sessions killed

        const resetRow = rows.find((r) => r.type === 'PASSWORD_RESET');
        expect(resetRow!.usedAt).not.toBeNull(); // single-use, burned
    });

    it('rejects an unknown token', async () => {
        await expect(resetPasswordWithToken('not-a-real-token', 'x')).rejects.toThrow('INVALID_RESET_TOKEN');
        expect(userUpdateCalls).toHaveLength(0);
    });

    it('rejects a replayed (already-used) token', async () => {
        const plaintext = await issuePasswordResetToken(testUser.id);
        await resetPasswordWithToken(plaintext, '$2b$12$first');

        await expect(resetPasswordWithToken(plaintext, '$2b$12$second')).rejects.toThrow('INVALID_RESET_TOKEN');
        expect(userUpdateCalls).toHaveLength(1); // only the first call went through
    });

    it('rejects an expired token and deletes it', async () => {
        const plaintext = await issuePasswordResetToken(testUser.id);
        rows[0]!.expiresAt = new Date(Date.now() - 1000);

        await expect(resetPasswordWithToken(plaintext, 'x')).rejects.toThrow('RESET_TOKEN_EXPIRED');
        expect(rows).toHaveLength(0);
        expect(userUpdateCalls).toHaveLength(0);
    });

    it('rejects a token of the wrong type (e.g. an email-verification token)', async () => {
        const verifyPlaintext = await issueEmailVerificationToken(testUser.id);

        await expect(resetPasswordWithToken(verifyPlaintext, 'x')).rejects.toThrow('INVALID_RESET_TOKEN');
        expect(userUpdateCalls).toHaveLength(0);
    });
});
