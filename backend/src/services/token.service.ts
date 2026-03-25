import crypto from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '../index.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import type { User } from '@prisma/client';

// How long refresh tokens live in the DB
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// --- Hash a plaintext token for DB storage ---
// Plaintext only ever exists in the cookie/email — never in the DB
function hashToken(plaintext: string): string {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
}

// --- Issue a brand new token pair (called at login / register) ---
export async function issueTokenPair(user: User) {
    const family = createId(); // New family ID for this login session
    const tokenId = createId();

    // Plaintext refresh token — goes into the cookie
    const refreshTokenPlaintext = createId() + createId(); // 48 random chars

    // Store only the hash in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.token.create({
        data: {
            id: tokenId,
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

    const refreshToken = await signRefreshToken({
        userId: user.id,
        family,
        tokenId,
    });

    return { accessToken, refreshTokenPlaintext, refreshToken };
}

// --- Rotate refresh token (called on every /auth/refresh request) ---
export async function rotateRefreshToken(refreshTokenCookie: string) {
    // 1. Verify the JWT signature first
    const payload = await verifyRefreshToken(refreshTokenCookie);

    // 2. Look up the token record in DB by tokenId
    const tokenRecord = await prisma.token.findUnique({
        where: { id: payload.tokenId },
        include: { user: true },
    });

    // 3. Token not found — already deleted or never existed
    if (!tokenRecord) {
        throw new Error('INVALID_TOKEN');
    }

    // 4. Token already used — REUSE DETECTED → nuke the entire family
    if (tokenRecord.usedAt !== null) {
        await prisma.token.deleteMany({
            where: { family: tokenRecord.family },
        });
        throw new Error('TOKEN_REUSE_DETECTED');
    }

    // 5. Token expired
    if (tokenRecord.expiresAt < new Date()) {
        await prisma.token.delete({ where: { id: tokenRecord.id } });
        throw new Error('TOKEN_EXPIRED');
    }

    // 6. Mark old token as used (invalidate it)
    await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
    });

    // 7. Issue new token pair with SAME family
    const newTokenId = createId();
    const newPlaintext = createId() + createId();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.token.create({
        data: {
            id: newTokenId,
            userId: tokenRecord.userId,
            tokenHash: hashToken(newPlaintext),
            type: 'REFRESH',
            family: tokenRecord.family, // Same family — keeps the chain trackable
            expiresAt,
        },
    });

    const accessToken = await signAccessToken({
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
    });

    const refreshToken = await signRefreshToken({
        userId: tokenRecord.user.id,
        family: tokenRecord.family,
        tokenId: newTokenId,
    });

    return { accessToken, refreshTokenPlaintext: newPlaintext, refreshToken, user: tokenRecord.user };
}

// --- Revoke all tokens for a user (logout all devices) ---
export async function revokeAllUserTokens(userId: string) {
    await prisma.token.deleteMany({
        where: { userId, type: 'REFRESH' },
    });
}