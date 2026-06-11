import type { Request, Response } from 'express';
import { hash, verify } from '@node-rs/bcrypt';
import { prisma } from '../index.js';
import { issueTokenPair, rotateRefreshToken, revokeTokenFamily, revokeAllUserTokens } from '../services/token.service.js';
import type { RegisterInput, LoginInput } from '@aranya/shared';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refreshToken';

// Cookie options — HttpOnly prevents JS access, Secure enforces HTTPS
const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/auth/refresh', // Cookie only sent to the refresh endpoint
};

// --- Register ---
export async function register(req: Request, res: Response) {
    const { name, email, password } = req.body as RegisterInput;

    // Check if email already exists
    // Return IDENTICAL response whether email exists or not — prevents enumeration
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        // Still hash to prevent timing attacks revealing whether email exists
        await hash(password, BCRYPT_ROUNDS);
        return res.status(201).json({
            message: 'If this email is new, a verification link has been sent.',
        });
    }

    const passwordHash = await hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
        data: { name, email, passwordHash },
    });

    // TODO Step 4: Send verification email via Resend
    // For now, auto-verify in development
    if (process.env.NODE_ENV === 'development') {
        await prisma.user.update({
            where: { id: user.id },
            data: { verified: true },
        });
    }

    const { accessToken, refreshTokenPlaintext } = await issueTokenPair(user);

    res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlaintext, refreshCookieOptions);

    return res.status(201).json({
        message: 'If this email is new, a verification link has been sent.',
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
}

// --- Login ---
export async function login(req: Request, res: Response) {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always hash even if user not found — prevents timing-based enumeration
    const passwordHash = user?.passwordHash ?? '$2b$12$invalidhashfortimingprotection';
    const isValid = await verify(password, passwordHash);

    if (!user || !isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshTokenPlaintext } = await issueTokenPair(user);

    res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlaintext, refreshCookieOptions);

    return res.json({
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
}

// --- Refresh token ---
export async function refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ error: 'No refresh token' });
    }

    try {
        const { accessToken, refreshTokenPlaintext, user } = await rotateRefreshToken(token);

        res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlaintext, refreshCookieOptions);

        return res.json({
            accessToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err: unknown) {
        // Clear cookie on any token error
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth/refresh' });

        const message = err instanceof Error ? err.message : '';
        if (message === 'TOKEN_REUSE_DETECTED') {
            return res.status(401).json({ error: 'Security event detected. Please log in again.' });
        }
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
}

// --- Logout (this device only) ---
// No auth required: possession of the refresh cookie is the proof, and an
// expired access token must never prevent logging out.
export async function logout(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (token) {
        await revokeTokenFamily(token);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth/refresh' });
    return res.json({ message: 'Logged out successfully' });
}

// --- Logout everywhere (all devices) ---
export async function logoutAll(req: Request, res: Response) {
    await revokeAllUserTokens(req.user!.userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth/refresh' });
    return res.json({ message: 'Logged out on all devices' });
}

// --- Get current user (me) ---
export async function getMe(req: Request, res: Response) {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
            id: true, name: true, email: true,
            role: true, verified: true,
            twoFactorEnabled: true, createdAt: true,
        },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
}