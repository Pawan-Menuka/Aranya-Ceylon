import type { Request, Response } from 'express';
import { hash, verify } from '@node-rs/bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { issueTokenPair, rotateRefreshToken, revokeTokenFamily, revokeAllUserTokens } from '../services/token.service.js';
import type { RegisterInput, LoginInput } from '@aranya/shared';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refreshToken';

// Identical response for both new and existing emails — see register().
const NEUTRAL_REGISTER_MESSAGE = 'If this email is new, a verification link has been sent.';

// Cookie options — HttpOnly prevents JS access, Secure enforces HTTPS.
// sameSite: 'lax' (not 'strict') so the cookie survives the cross-site
// top-level redirect back from PayHere/Stripe (#14). The refresh endpoint is
// POST-only, and 'lax' still blocks cross-site POSTs, so CSRF protection is
// preserved. NOTE: if the frontend and API end up on DIFFERENT registrable
// domains, this must become `sameSite: 'none'` + `secure: true` for the
// cookie to be sent on cross-site fetches at all.
const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/auth/refresh', // Cookie only sent to the refresh endpoint
};

// --- Register ---
// Returns the SAME neutral response whether or not the email already exists,
// so an attacker can't enumerate registered accounts (#9). No token is issued
// here — the user signs in via /login afterwards (and, once email verification
// ships, after clicking the verification link). The unique-constraint catch
// also closes the TOCTOU race two concurrent signups would otherwise hit (#18).
export async function register(req: Request, res: Response) {
    const { name, email, password } = req.body as RegisterInput;

    // Hash unconditionally so response time doesn't reveal whether the email
    // already existed (timing-based enumeration). Both branches also perform a
    // DB write attempt, keeping the timing profiles close.
    const passwordHash = await hash(password, BCRYPT_ROUNDS);

    try {
        await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                // Auto-verify in development so local testing can log in immediately
                verified: process.env.NODE_ENV === 'development',
            },
        });
        // TODO (roadmap): send verification email via Resend here.
    } catch (err) {
        // P2002 = unique violation on email → already registered. Swallow it and
        // return the identical neutral response. Re-throw anything else.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
            throw err;
        }
    }

    return res.status(201).json({ message: NEUTRAL_REGISTER_MESSAGE });
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

export async function patchMe(req: Request, res: Response) {
    const { name } = req.body as { name?: string };
    const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { ...(name !== undefined && { name: name.trim() }) },
        select: { id: true, name: true, email: true, role: true, verified: true, createdAt: true },
    });
    return res.json({ user });
}

// --- Addresses ---

export async function listAddresses(req: Request, res: Response) {
    const addresses = await prisma.address.findMany({
        where: { userId: req.user!.userId },
        orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    return res.json({ addresses });
}

export async function createAddress(req: Request, res: Response) {
    const { label, line1, line2, city, country, postalCode, isDefault } =
        req.body as { label?: string; line1: string; line2?: string; city: string; country: string; postalCode?: string; isDefault?: boolean };

    const userId = req.user!.userId;

    const address = await prisma.$transaction(async (tx) => {
        if (isDefault) {
            await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        return tx.address.create({
            data: { userId, label, line1, line2, city, country, postalCode: postalCode ?? '', isDefault: !!isDefault },
        });
    });

    return res.status(201).json({ address });
}

export async function updateAddress(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.address.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Address not found.' });

    const { label, line1, line2, city, country, postalCode, isDefault } =
        req.body as { label?: string; line1?: string; line2?: string; city?: string; country?: string; postalCode?: string; isDefault?: boolean };
    const address = await prisma.$transaction(async (tx) => {
        if (isDefault) {
            await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        return tx.address.update({
            where: { id },
            data: { label, line1, line2, city, country, postalCode, isDefault },
        });
    });

    return res.json({ address });
}

export async function deleteAddress(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.address.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Address not found.' });

    await prisma.address.delete({ where: { id } });
    return res.json({ ok: true });
}