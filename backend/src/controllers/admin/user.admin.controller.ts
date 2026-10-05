import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { adminListUsersQuerySchema, changeUserRoleSchema, suspendUserSchema } from '@aranya/shared';
import { prisma } from '../../lib/prisma.js';
import { revokeAllUserTokens } from '../../services/token.service.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { disableTwoFactor } from '../../services/two-factor.service.js';

// SUPERADMIN-only user management (final audit #43). Mounted behind
// requireRole('SUPERADMIN') in admin.routes.ts.
//
// Safety rails, all enforced here rather than left to the caller:
//   - you cannot change your own role or suspend yourself;
//   - the last active SUPERADMIN can never be demoted or suspended, so the
//     console cannot lock itself out (checked inside a serializable
//     transaction, so two SUPERADMINs cannot remove each other at once);
//   - only a verified account can be given an admin role.

const userSelect = {
    id: true, name: true, email: true, role: true, verified: true,
    twoFactorEnabled: true, suspendedAt: true, createdAt: true,
} as const;

const SERIALIZABLE = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;

class Refusal extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
}

// Sends the refusal as JSON; anything else (including a serialization
// conflict between two simultaneous changes) is reported as retryable or rethrown.
function fail(res: Response, err: unknown): void {
    if (err instanceof Refusal) { res.status(err.status).json({ error: err.message, code: err.code }); return; }
    if ((err as { code?: string }).code === 'P2034') {
        res.status(409).json({ error: 'Another change was in progress. Please try again.', code: 'CONFLICT_RETRY' });
        return;
    }
    throw err;
}

async function activeSuperadminCount(tx: Prisma.TransactionClient): Promise<number> {
    return tx.user.count({ where: { role: 'SUPERADMIN', suspendedAt: null } });
}

export async function listUsers(req: Request, res: Response) {
    const { search, role, suspended, limit, cursor } = adminListUsersQuerySchema.parse(req.query);

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (suspended) where.suspendedAt = suspended === 'true' ? { not: null } : null;
    if (search) where.OR = [{ email: { contains: search.toLowerCase() } }, { name: { contains: search, mode: 'insensitive' } }];

    const rows = await prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: userSelect,
    });
    const page = rows.slice(0, limit);

    res.json({ users: page, nextCursor: rows.length > limit ? page[page.length - 1]!.id : null });
}

export async function changeUserRole(req: Request, res: Response) {
    const id = req.params.id!;
    const { role } = changeUserRoleSchema.parse(req.body);
    if (id === req.user!.userId) {
        res.status(409).json({ error: 'You cannot change your own role.', code: 'CANNOT_CHANGE_SELF' });
        return;
    }

    let result: { from: string; user: { id: string; role: string } };
    try {
        result = await prisma.$transaction(async (tx) => {
            const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, verified: true, suspendedAt: true } });
            if (!target) throw new Refusal(404, 'NOT_FOUND', 'User not found');
            const from = target.role; // read before the write; never re-derive it from `target` afterwards
            if (from === role) return { from, user: target };

            if (role !== 'CUSTOMER' && !target.verified) {
                throw new Refusal(409, 'EMAIL_NOT_VERIFIED', 'This account has not verified its email, so it cannot be given an admin role.');
            }
            // Removing SUPERADMIN from the last active one would leave nobody able to manage users.
            if (target.role === 'SUPERADMIN' && !target.suspendedAt && (await activeSuperadminCount(tx)) <= 1) {
                throw new Refusal(409, 'LAST_SUPERADMIN', 'This is the last active SUPERADMIN and cannot be demoted.');
            }
            const user = await tx.user.update({ where: { id }, data: { role }, select: { id: true, role: true } });
            return { from, user };
        }, SERIALIZABLE);
    } catch (err) { fail(res, err); return; }

    if (result.from === role) { res.json({ user: result.user, changed: false }); return; }

    // Sessions carry the old role in their access token; force a fresh sign-in.
    await revokeAllUserTokens(id);
    await writeAuditLog({ req, event: 'USER_ROLE_CHANGE', targetType: 'User', targetId: id, diff: { from: result.from, to: role } });

    res.json({ user: result.user, changed: true });
}

async function setSuspended(req: Request, res: Response, suspend: boolean) {
    const id = req.params.id!;
    const { reason } = suspend ? suspendUserSchema.parse(req.body ?? {}) : { reason: undefined };
    if (id === req.user!.userId) {
        res.status(409).json({ error: 'You cannot suspend your own account.', code: 'CANNOT_CHANGE_SELF' });
        return;
    }

    let changed = false;
    let user: { id: string; role: string; suspendedAt: Date | null };
    try {
        user = await prisma.$transaction(async (tx) => {
            const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, suspendedAt: true } });
            if (!target) throw new Refusal(404, 'NOT_FOUND', 'User not found');
            if (suspend === (target.suspendedAt !== null)) return target; // already in that state

            if (suspend && target.role === 'SUPERADMIN' && (await activeSuperadminCount(tx)) <= 1) {
                throw new Refusal(409, 'LAST_SUPERADMIN', 'This is the last active SUPERADMIN and cannot be suspended.');
            }
            changed = true;
            return tx.user.update({ where: { id }, data: { suspendedAt: suspend ? new Date() : null }, select: { id: true, role: true, suspendedAt: true } });
        }, SERIALIZABLE);
    } catch (err) { fail(res, err); return; }

    if (changed) {
        // Suspension takes effect on the next refresh (and immediately for admin
        // routes, which re-read the account); ending all sessions makes it prompt.
        if (suspend) await revokeAllUserTokens(id);
        await writeAuditLog({
            req, event: 'USER_SUSPEND', targetType: 'User', targetId: id,
            diff: { suspended: suspend, ...(reason ? { reason } : {}) },
        });
    }

    res.json({ user, changed });
}

export const suspendUser = (req: Request, res: Response) => setSuspended(req, res, true);
export const unsuspendUser = (req: Request, res: Response) => setSuspended(req, res, false);

// Recovery path for an admin who lost their authenticator and recovery codes: a
// different SUPERADMIN switches their two-factor off (they can re-enrol after
// signing in with their password). Not available on yourself; use the
// self-service disable, which needs a code.
export async function resetTwoFactor(req: Request, res: Response) {
    const id = req.params.id!;
    if (id === req.user!.userId) {
        res.status(409).json({ error: 'Use the two-factor settings to turn off your own two-factor sign-in.', code: 'CANNOT_CHANGE_SELF' });
        return;
    }
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, twoFactorEnabled: true } });
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }
    if (!target.twoFactorEnabled) { res.json({ user: { id, twoFactorEnabled: false }, changed: false }); return; }

    await disableTwoFactor(id);
    // The reset is usually a recovery, so end any session that may be in doubt.
    await revokeAllUserTokens(id);
    await writeAuditLog({ req, event: 'USER_2FA_RESET', targetType: 'User', targetId: id });

    res.json({ user: { id, twoFactorEnabled: false }, changed: true });
}
