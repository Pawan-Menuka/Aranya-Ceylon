import type { Request, Response } from 'express';
import { verify } from '@node-rs/bcrypt';
import type { z } from 'zod';
import type { twoFactorEnableSchema, twoFactorDisableSchema } from '@aranya/shared';
import { prisma } from '../lib/prisma.js';
import { secretBoxConfigured } from '../lib/secret-box.js';
import { writeAuditLog } from '../services/audit.service.js';
import {
    TwoFactorError, beginEnrolment, confirmEnrolment, disableTwoFactor, verifySecondFactor,
} from '../services/two-factor.service.js';

// Self-service two-factor management for ADMIN / SUPERADMIN accounts (final audit
// #43). Mounted behind requireAuth + requireRole in auth.routes.ts; the request
// bodies are validated there by the shared schemas.

const FAILURE_STATUS = { ALREADY_ENABLED: 409, NO_PENDING_ENROLMENT: 409, INVALID_CODE: 400 } as const;
const FAILURE_MESSAGE = {
    ALREADY_ENABLED: 'Two-factor authentication is already turned on.',
    NO_PENDING_ENROLMENT: 'Start setup first.',
    INVALID_CODE: 'That code is not valid. Check your authenticator app and try again.',
} as const;

function unavailable(res: Response): boolean {
    if (secretBoxConfigured()) return false;
    res.status(503).json({
        error: 'Two-factor authentication is not configured on this server.',
        code: 'TWO_FACTOR_UNAVAILABLE',
    });
    return true;
}

function fail(res: Response, err: unknown): void {
    if (err instanceof TwoFactorError) {
        res.status(FAILURE_STATUS[err.code]).json({ error: FAILURE_MESSAGE[err.code], code: err.code });
        return;
    }
    throw err;
}

// --- Step 1: get a secret to add to an authenticator app ---
export async function setup(req: Request, res: Response) {
    if (unavailable(res)) return;
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, email: true, twoFactorEnabled: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    try {
        const { secret, otpauthUri } = await beginEnrolment(user);
        // The secret is shown once, here. It is stored encrypted and not active until confirmed.
        res.json({ secret, otpauthUri, message: 'Add this to your authenticator app, then confirm with a 6-digit code.' });
    } catch (err) { fail(res, err); }
}

// --- Step 2: prove the app works, switch two-factor on, receive recovery codes ---
export async function enable(req: Request, res: Response) {
    if (unavailable(res)) return;
    const { code } = req.body as z.infer<typeof twoFactorEnableSchema>;

    try {
        const recoveryCodes = await confirmEnrolment(req.user!.userId, code);
        await writeAuditLog({ req, event: 'USER_2FA_ENABLE', targetType: 'User', targetId: req.user!.userId });
        res.json({
            enabled: true,
            recoveryCodes,
            message: 'Two-factor authentication is on. Save these recovery codes somewhere safe: each works once, and they are not shown again.',
        });
    } catch (err) { fail(res, err); }
}

// --- Turn it off: needs the password AND a current code (or a recovery code) ---
export async function disable(req: Request, res: Response) {
    if (unavailable(res)) return;
    const { password, totpCode, recoveryCode } = req.body as z.infer<typeof twoFactorDisableSchema>;

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (!user.twoFactorEnabled) { res.status(409).json({ error: 'Two-factor authentication is not turned on.', code: 'NOT_ENABLED' }); return; }

    // A stolen access token alone must not be enough to remove the second factor.
    if (!(await verify(password, user.passwordHash)) || !(await verifySecondFactor(user, { totpCode, recoveryCode }))) {
        res.status(401).json({ error: 'Password or code is incorrect.', code: 'INVALID_CREDENTIALS' });
        return;
    }

    await disableTwoFactor(user.id);
    await writeAuditLog({ req, event: 'USER_2FA_DISABLE', targetType: 'User', targetId: user.id });
    res.json({ enabled: false });
}
