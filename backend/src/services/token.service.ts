import crypto from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '../index.js';
import { signAccessToken } from '../lib/jwt.js';
import type { User } from '@prisma/client';

// How long refresh tokens live in the DB
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// --- Hash a plaintext token for DB storage ---
// Plaintext only ever exists in the cookie/email — never in the DB
function hashToken(plaintext: string): string {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
}

// --- Issue a brand new token pair (called at login / register) ---
// The refresh token is an opaque random string: plaintext goes in the
// HttpOnly cookie, only its SHA-256 hash is stored. Rotation looks the
// cookie value up by hash — no JWT involved.
export async function issueTokenPair(user: User) {
    const family = createId(); // New family ID for this login session

    // Plaintext refresh token — goes into the cookie
    const refreshTokenPlaintext = createId() + createId(); // 48 random chars

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.token.create({
        data: {
            userId: user.id,
            tokenHash: hashToken(refreshTokenPlaintext),
            type: 'REFRESH',
            family,
            expiresAt,
        },
    });

    const accessToken = await signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    return { accessToken, refreshTokenPlaintext };
}

// --- Rotate refresh token (called on every /auth/refresh request) ---
export async function rotateRefreshToken(refreshTokenCookie: string) {
    // 1. Look up the token record by the hash of the cookie value
    const tokenRecord = await prisma.token.findUnique({
        where: { tokenHash: hashToken(refreshTokenCookie) },
        include: { user: true },
    });

    // 2. Token not found — already deleted or never existed
    if (!tokenRecord || tokenRecord.type !== 'REFRESH') {
        throw new Error('INVALID_TOKEN');
    }

    // 3. Token already used — REUSE DETECTED → nuke the entire family
    if (tokenRecord.usedAt !== null) {
        await prisma.token.deleteMany({
            where: { family: tokenRecord.family },
        });
        throw new Error('TOKEN_REUSE_DETECTED');
    }

    // 4. Token expired
    if (tokenRecord.expiresAt < new Date()) {
        await prisma.token.delete({ where: { id: tokenRecord.id } });
        throw new Error('TOKEN_EXPIRED');
    }

    // 5. Mark old token as used (invalidate it). updateMany with a usedAt
    // guard so two concurrent refreshes can't both win the rotation.
    const { count } = await prisma.token.updateMany({
        where: { id: tokenRecord.id, usedAt: null },
        data: { usedAt: new Date() },
    });
    if (count === 0) {
        // Lost the race — treat like reuse: kill the family
        await prisma.token.deleteMany({ where: { family: tokenRecord.family } });
        throw new Error('TOKEN_REUSE_DETECTED');
    }

    // 6. Issue new token in the SAME family — keeps the chain trackable
    const newPlaintext = createId() + createId();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.token.create({
        data: {
            userId: tokenRecord.userId,
            tokenHash: hashToken(newPlaintext),
            type: 'REFRESH',
            family: tokenRecord.family,
            expiresAt,
        },
    });

    const accessToken = await signAccessToken({
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
    });

    return { accessToken, refreshTokenPlaintext: newPlaintext, user: tokenRecord.user };
}

// --- Revoke the session (token family) the cookie belongs to ---
// Used by logout: kills this device's session only. No auth required —
// possession of the refresh cookie IS the proof.
export async function revokeTokenFamily(refreshTokenCookie: string) {
    const tokenRecord = await prisma.token.findUnique({
        where: { tokenHash: hashToken(refreshTokenCookie) },
        select: { family: true },
    });

    if (tokenRecord?.family) {
        await prisma.token.deleteMany({ where: { family: tokenRecord.family } });
    }
}

// --- Revoke all tokens for a user (logout all devices) ---
export async function revokeAllUserTokens(userId: string) {
    await prisma.token.deleteMany({
        where: { userId, type: 'REFRESH' },
    });
}

// How long an email-verification link stays valid
const EMAIL_VERIFY_TOKEN_EXPIRY_HOURS = 24;

// --- Issue a single-use email-verification token ---
// Same opaque-token + SHA-256-hash pattern as refresh tokens: the plaintext
// goes only into the emailed link, the DB stores only its hash.
export async function issueEmailVerificationToken(userId: string): Promise<string> {
    const plaintext = createId() + createId(); // 48 random chars

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFY_TOKEN_EXPIRY_HOURS);

    await prisma.token.create({
        data: {
            userId,
            tokenHash: hashToken(plaintext),
            type: 'EMAIL_VERIFY',
            expiresAt,
        },
    });

    return plaintext;
}

// --- Consume an email-verification token ---
// Marks the user verified and burns the token (single-use). Throws on any
// invalid/expired/already-used token so the caller can show a neutral result.
export async function verifyEmailToken(plaintext: string): Promise<void> {
    if (!plaintext) throw new Error('INVALID_VERIFICATION_TOKEN');

    const record = await prisma.token.findUnique({
        where: { tokenHash: hashToken(plaintext) },
    });

    if (!record || record.type !== 'EMAIL_VERIFY' || record.usedAt !== null) {
        throw new Error('INVALID_VERIFICATION_TOKEN');
    }

    if (record.expiresAt < new Date()) {
        await prisma.token.delete({ where: { id: record.id } });
        throw new Error('VERIFICATION_TOKEN_EXPIRED');
    }

    // Flip verified + burn the token atomically so a replayed link can't re-run.
    await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { verified: true } }),
        prisma.token.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
}
