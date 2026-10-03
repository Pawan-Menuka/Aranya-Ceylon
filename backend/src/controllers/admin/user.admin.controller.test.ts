import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDouble, responseDouble } from '../../test/httpDoubles.js';

interface UserRow {
    id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN' | 'SUPERADMIN'; verified: boolean;
    twoFactorEnabled: boolean; suspendedAt: Date | null; createdAt: Date;
}

const state = vi.hoisted(() => ({
    users: [] as UserRow[],
    audit: [] as Array<Record<string, unknown>>,
    revoked: [] as string[],
    transactionError: undefined as unknown,
}));

vi.mock('../../lib/prisma.js', () => {
    const user = {
        findMany: vi.fn(async ({ where, take }: { where: { role?: string; suspendedAt?: unknown; OR?: Array<{ email?: { contains: string }; name?: { contains: string } }> }; take: number }) => {
            let rows = [...state.users];
            if (where.role) rows = rows.filter((u) => u.role === where.role);
            if (where.suspendedAt === null) rows = rows.filter((u) => u.suspendedAt === null);
            else if (where.suspendedAt) rows = rows.filter((u) => u.suspendedAt !== null);
            if (where.OR) rows = rows.filter((u) => where.OR!.some((c) => (c.email && u.email.includes(c.email.contains)) || (c.name && u.name.toLowerCase().includes(c.name.contains.toLowerCase()))));
            return rows.slice(0, take);
        }),
        // Copies, like Prisma: a later update must not rewrite a row the caller already read.
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => { const u = state.users.find((x) => x.id === where.id); return u ? { ...u } : null; }),
        count: vi.fn(async ({ where }: { where: { role: string; suspendedAt: null } }) =>
            state.users.filter((u) => u.role === where.role && u.suspendedAt === null).length),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
            const row = state.users.find((u) => u.id === where.id)!;
            Object.assign(row, data);
            return { ...row };
        }),
    };
    return {
        prisma: {
            user,
            $transaction: vi.fn(async (callback: (tx: { user: typeof user }) => Promise<unknown>) => {
                if (state.transactionError) throw state.transactionError;
                return callback({ user });
            }),
        },
    };
});
vi.mock('../../services/token.service.js', () => ({ revokeAllUserTokens: vi.fn(async (id: string) => { state.revoked.push(id); }) }));
vi.mock('../../services/audit.service.js', () => ({ writeAuditLog: vi.fn(async (entry: Record<string, unknown>) => { state.audit.push(entry); }) }));

import { changeUserRole, listUsers, suspendUser, unsuspendUser } from './user.admin.controller.js';

const make = (id: string, role: UserRow['role'], extra: Partial<UserRow> = {}): UserRow => ({
    id, name: `User ${id}`, email: `${id}@example.com`, role, verified: true, twoFactorEnabled: false,
    suspendedAt: null, createdAt: new Date(), ...extra,
});
const run = async (fn: (req: never, res: never) => Promise<void>, req: object) => {
    const res = responseDouble<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    await fn(requestDouble(req) as never, res as never);
    return res;
};
const as = (actor: string, id: string, body: object = {}) => ({ user: { userId: actor }, params: { id }, body });

beforeEach(() => {
    state.users = [make('boss', 'SUPERADMIN'), make('other', 'SUPERADMIN'), make('adm', 'ADMIN'), make('cust', 'CUSTOMER'), make('new', 'CUSTOMER', { verified: false })];
    state.audit = []; state.revoked = []; state.transactionError = undefined;
});

describe('listing users', () => {
    it('filters by role, suspension and search, and never exposes password or 2FA secrets', async () => {
        state.users[3]!.suspendedAt = new Date();
        expect((await run(listUsers, { query: { role: 'ADMIN' } })).body.users.map((u: UserRow) => u.id)).toEqual(['adm']);
        expect((await run(listUsers, { query: { suspended: 'true' } })).body.users.map((u: UserRow) => u.id)).toEqual(['cust']);
        expect((await run(listUsers, { query: { search: 'OTHER@' } })).body.users).toHaveLength(1);
        const body = (await run(listUsers, { query: {} })).body;
        expect(JSON.stringify(body)).not.toMatch(/passwordHash|twoFactorSecret|recovery/i);
    });
});

describe('changing a role', () => {
    it('promotes a verified customer, ends their sessions and audits the change', async () => {
        const res = await run(changeUserRole, as('boss', 'cust', { role: 'ADMIN' }));
        expect(res.body).toMatchObject({ changed: true, user: { id: 'cust', role: 'ADMIN' } });
        expect(state.revoked).toEqual(['cust']);
        expect(state.audit[0]).toMatchObject({ event: 'USER_ROLE_CHANGE', targetId: 'cust', diff: { from: 'CUSTOMER', to: 'ADMIN' } });
    });

    it('refuses to change your own role', async () => {
        const res = await run(changeUserRole, as('boss', 'boss', { role: 'CUSTOMER' }));
        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('CANNOT_CHANGE_SELF');
        expect(state.users[0]!.role).toBe('SUPERADMIN');
    });

    it('refuses to give an unverified account an admin role', async () => {
        const res = await run(changeUserRole, as('boss', 'new', { role: 'ADMIN' }));
        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('lets one SUPERADMIN be demoted while another is active, but never the last one', async () => {
        const first = await run(changeUserRole, as('boss', 'other', { role: 'ADMIN' }));
        expect(first.body.changed).toBe(true);

        // 'boss' is now the only SUPERADMIN left: a different actor may not demote them.
        state.users.push(make('actor', 'SUPERADMIN', { suspendedAt: new Date() })); // suspended, so not "active"
        const last = await run(changeUserRole, as('actor', 'boss', { role: 'ADMIN' }));
        expect(last.statusCode).toBe(409);
        expect(last.body.code).toBe('LAST_SUPERADMIN');
        expect(state.users[0]!.role).toBe('SUPERADMIN');
    });

    it('treats an unchanged role as a no-op without revoking sessions or auditing', async () => {
        const res = await run(changeUserRole, as('boss', 'adm', { role: 'ADMIN' }));
        expect(res.body.changed).toBe(false);
        expect(state.revoked).toHaveLength(0);
        expect(state.audit).toHaveLength(0);
    });

    it('404s for an unknown user, validates the role, and reports a serialization conflict as retryable', async () => {
        expect((await run(changeUserRole, as('boss', 'nobody', { role: 'ADMIN' }))).statusCode).toBe(404);
        await expect(run(changeUserRole, as('boss', 'cust', { role: 'OWNER' }))).rejects.toThrow();
        state.transactionError = Object.assign(new Error('write conflict'), { code: 'P2034' });
        const res = await run(changeUserRole, as('boss', 'cust', { role: 'ADMIN' }));
        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('CONFLICT_RETRY');
    });
});

describe('suspending users', () => {
    it('suspends, ends sessions and records the reason in the audit trail only', async () => {
        const res = await run(suspendUser, as('boss', 'cust', { reason: 'chargeback abuse' }));
        expect(res.body.changed).toBe(true);
        expect(state.users[3]!.suspendedAt).toBeInstanceOf(Date);
        expect(state.revoked).toEqual(['cust']);
        expect(state.audit[0]).toMatchObject({ event: 'USER_SUSPEND', diff: { suspended: true, reason: 'chargeback abuse' } });
        expect(JSON.stringify(res.body)).not.toContain('chargeback');
    });

    it('is idempotent: suspending twice changes and audits once', async () => {
        await run(suspendUser, as('boss', 'cust'));
        const again = await run(suspendUser, as('boss', 'cust'));
        expect(again.body.changed).toBe(false);
        expect(state.audit).toHaveLength(1);
    });

    it('refuses to suspend yourself or the last active SUPERADMIN', async () => {
        expect((await run(suspendUser, as('boss', 'boss'))).body.code).toBe('CANNOT_CHANGE_SELF');
        await run(suspendUser, as('boss', 'other')); // fine: boss is still active
        state.users.push(make('actor', 'SUPERADMIN', { suspendedAt: new Date() }));
        const last = await run(suspendUser, as('actor', 'boss'));
        expect(last.statusCode).toBe(409);
        expect(last.body.code).toBe('LAST_SUPERADMIN');
        expect(state.users[0]!.suspendedAt).toBeNull();
    });

    it('reinstates a user without revoking anything', async () => {
        await run(suspendUser, as('boss', 'cust'));
        state.revoked = [];
        const res = await run(unsuspendUser, as('boss', 'cust'));
        expect(res.body.changed).toBe(true);
        expect(state.users[3]!.suspendedAt).toBeNull();
        expect(state.revoked).toHaveLength(0);
        expect(state.audit.at(-1)).toMatchObject({ event: 'USER_SUSPEND', diff: { suspended: false } });
    });
});
