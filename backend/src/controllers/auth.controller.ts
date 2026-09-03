import type { Request, Response } from 'express';
import { hash, verify } from '@node-rs/bcrypt';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { issueTokenPair, rotateRefreshToken, revokeTokenFamily, revokeAllUserTokens, issueEmailVerificationToken, verifyEmailToken, issuePasswordResetToken, resetPasswordWithToken } from '../services/token.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '@aranya/shared';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refreshToken';
// Scope the refresh cookie to /auth (not /auth/refresh) so the browser also
// sends it to POST /auth/logout — otherwise logout never receives the cookie
// and can't revoke the token family server-side (BUG-03 / SEC-10). Both
// endpoints live under /auth, and 'lax' still blocks cross-site POSTs.
const REFRESH_COOKIE_PATH = '/auth';

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
    path: REFRESH_COOKIE_PATH, // sent to /auth/* (refresh + logout)
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
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                // Auto-verify in development so local testing can log in immediately
                verified: process.env.NODE_ENV === 'development',
            },
        });

        // Send the verification email for accounts that aren't auto-verified.
        // Fire-and-forget: keeping it OUT of the awaited path preserves both the
        // response latency and the neutral, timing-flat anti-enumeration profile
        // (a slow mail send must not make "new email" distinguishable). Failures
        // are logged, never surfaced — registration still succeeds.
        if (user && !user.verified) {
            void (async () => {
                try {
                    const token = await issueEmailVerificationToken(user.id);
                    await sendVerificationEmail({ to: user.email, token });
                } catch (mailErr) {
                    console.error('[register] verification email failed:', mailErr);
                }
            })();
        }
    } catch (err) {
        // P2002 = unique violation on email → already registered. Swallow it and
        // return the identical neutral response. Re-throw anything else.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
            throw err;
        }
    }

    return res.status(201).json({ message: NEUTRAL_REGISTER_MESSAGE });
}

// --- Verify email ---
// GET /auth/verify?token=… — clicked from the verification email. Marks the
// account verified, then redirects to the storefront with a result flag.
// Always redirects (never leaks token validity in the body); a bad/expired
// token just lands on ?verified=0. Target is /account (which exists and reads
// the flag) — NOT /login, which has no route and 404'd the whole funnel (FLOW-01).
export async function verifyEmail(req: Request, res: Response) {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0]!.trim();

    try {
        await verifyEmailToken(token);
        return res.redirect(`${frontend}/account?verified=1`);
    } catch {
        return res.redirect(`${frontend}/account?verified=0`);
    }
}

// --- Resend verification email ---
// Neutral response (anti-enumeration): always 200 with the same message whether
// or not the email exists or is already verified. A new link is only actually
// issued + sent for a real, still-unverified account. Rate-limited at the route.
const resendVerificationSchema = z.object({ email: z.string().email() });
const NEUTRAL_RESEND_MESSAGE = 'If that account exists and still needs verifying, a new link has been sent.';
export async function resendVerification(req: Request, res: Response) {
    const { email } = resendVerificationSchema.parse(req.body); // ZodError → 400

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.verified) {
        // Fire-and-forget, mirroring register(): keep the response fast + timing-flat.
        void (async () => {
            try {
                const token = await issueEmailVerificationToken(user.id);
                await sendVerificationEmail({ to: user.email, token });
            } catch (err) {
                console.error('[resend-verification] failed:', err);
            }
        })();
    }

    return res.status(200).json({ message: NEUTRAL_RESEND_MESSAGE });
}

// --- Forgot password ---
// Neutral response (anti-enumeration), same shape as resendVerification:
// always 200 with an identical message whether or not the email is
// registered. A reset token is only actually issued + emailed for a real
// account, and fire-and-forget for the same reason register()'s send is —
// a slow mail send must not make "account exists" distinguishable by timing.
const NEUTRAL_FORGOT_PASSWORD_MESSAGE = 'If that email is registered, a password reset link has been sent.';
export async function forgotPassword(req: Request, res: Response) {
    const { email } = req.body as ForgotPasswordInput;

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        void (async () => {
            try {
                const token = await issuePasswordResetToken(user.id);
                await sendPasswordResetEmail({ to: user.email, token });
            } catch (err) {
                console.error('[forgot-password] failed:', err);
            }
        })();
    }

    return res.status(200).json({ message: NEUTRAL_FORGOT_PASSWORD_MESSAGE });
}

// --- Reset password ---
// Consumes the single-use token, sets the new password, and revokes every
// existing session (see token.service.resetPasswordWithToken). Errors are
// collapsed to one generic message — never reveal whether a token was
// invalid, expired, or already used.
export async function resetPassword(req: Request, res: Response) {
    const { token, password } = req.body as ResetPasswordInput;

    try {
        const passwordHash = await hash(password, BCRYPT_ROUNDS);
        await resetPasswordWithToken(token, passwordHash);
        return res.status(200).json({ message: 'Your password has been reset. Please sign in.' });
    } catch {
        return res.status(400).json({ error: 'That reset link is invalid or has expired. Please request a new one.' });
    }
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

    // Enforce email verification (SEC-04). Until now login issued tokens
    // regardless of `verified`, so the whole verification flow was decorative.
    // Dev auto-verifies on register, so local logins are unaffected.
    if (!user.verified) {
        return res.status(403).json({
            error: 'Please verify your email address before signing in — check your inbox for the verification link.',
            code: 'EMAIL_NOT_VERIFIED',
        });
    }

    const { accessToken, refreshTokenPlaintext } = await issueTokenPair(user);

    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
        await writeAuditLog({
            req,
            actorId: user.id,
            event: 'ADMIN_LOGIN',
            targetType: 'User',
            targetId: user.id,
            diff: { role: user.role },
        });
    }

    res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlaintext, refreshCookieOptions);

    return res.json({
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, newsletterOptIn: user.newsletterOptIn },
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
            user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, newsletterOptIn: user.newsletterOptIn },
        });
    } catch (err: unknown) {
        // Clear cookie on any token error
        res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });

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

    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    return res.json({ message: 'Logged out successfully' });
}

// --- Logout everywhere (all devices) ---
export async function logoutAll(req: Request, res: Response) {
    await revokeAllUserTokens(req.user!.userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
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
            phone: true, newsletterOptIn: true,
        },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
}

export async function patchMe(req: Request, res: Response) {
    const { name, phone, newsletterOptIn } = req.body as { name?: string; phone?: string; newsletterOptIn?: boolean };
    const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(phone !== undefined && { phone: phone.trim() }),
            ...(newsletterOptIn !== undefined && { newsletterOptIn }),
        },
        select: { id: true, name: true, email: true, role: true, verified: true, createdAt: true, phone: true, newsletterOptIn: true },
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
