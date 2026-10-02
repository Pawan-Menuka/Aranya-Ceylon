// Owned disposable-PostgreSQL contract tests. Excluded from unit runs; never run against production.
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { enqueueOutbox, decryptOutboxPayload } from '../../lib/outbox.js';
import { acquireJobLease } from '../../jobs/jobLease.js';
import { prisma, assertIntegrationDatabase, uniqueTestId } from './helpers.js';

const prefix = uniqueTestId('phase9');
beforeEach(() => {
    assertIntegrationDatabase();
    vi.stubEnv('OUTBOX_ENABLED', 'true'); vi.stubEnv('OUTBOX_ACTIVE_KEY', 'test');
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', JSON.stringify({ test: Buffer.alloc(32, 6).toString('base64') }));
});
afterAll(async () => {
    assertIntegrationDatabase();
    await prisma.outboxMessage.deleteMany({ where: { dedupeKey: { startsWith: prefix } } });
    await prisma.jobLease.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    vi.unstubAllEnvs();
    await prisma.$disconnect();
});
it('rolls back a business record and its queue event together, then commits both together', async () => {
    const email = `${prefix}_rollback@example.test`, dedupeKey = `${prefix}:rollback`;
    await expect(prisma.$transaction(async tx => {
        await tx.user.create({ data: { name: 'Queue transaction test', email, passwordHash: 'test-only-unused' } });
        await enqueueOutbox(tx, { kind: 'EMAIL', dedupeKey, payload: { mail: { to: email, html: 'test-only-never-delivered' } } });
        throw new Error('force rollback');
    })).rejects.toThrow('force rollback');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect(await prisma.outboxMessage.findUnique({ where: { dedupeKey } })).toBeNull();
    await prisma.$transaction(async tx => {
        await tx.user.create({ data: { name: 'Queue transaction test', email, passwordHash: 'test-only-unused' } });
        await enqueueOutbox(tx, { kind: 'EMAIL', dedupeKey, payload: { mail: { to: email, html: 'test-only-never-delivered' } } });
    });
    expect(await prisma.user.findUnique({ where: { email } })).not.toBeNull();
    const row = await prisma.outboxMessage.findUniqueOrThrow({ where: { dedupeKey } });
    expect(row.encryptedPayload).not.toContain(email);
    expect(decryptOutboxPayload(row.encryptedPayload, `${row.id}:EMAIL:1`)).toEqual({ mail: { to: email, html: 'test-only-never-delivered' } });
});
it('deduplicates concurrent producer transactions to one immutable event', async () => {
    const dedupeKey = `${prefix}:concurrent`;
    const ids = await Promise.all(Array.from({ length: 10 }, () => prisma.$transaction(tx => enqueueOutbox(tx, { kind: 'REVALIDATION', dedupeKey, payload: { paths: ['/products'] } }))));
    expect(new Set(ids).size).toBe(1);
    expect(await prisma.outboxMessage.count({ where: { dedupeKey } })).toBe(1);
});
it('elects one of two real database owners and rejects stale commits after expired-owner recovery', async () => {
    const name = `${prefix}:lease`;
    const contenders = await Promise.all([acquireJobLease(name), acquireJobLease(name)]);
    expect(contenders.filter(Boolean)).toHaveLength(1);
    const original = contenders.find(Boolean)!;
    await prisma.jobLease.update({ where: { name }, data: { expiresAt: new Date(0) } });
    const replacement = (await acquireJobLease(name))!;
    expect(replacement.owner).not.toBe(original.owner);
    expect(replacement.fence).toBeGreaterThan(original.fence);
    await expect(prisma.$transaction(tx => original.assertOwned(tx))).rejects.toThrow('JOB_LEASE_LOST');
    await prisma.$transaction(tx => replacement.assertOwned(tx));
    await original.release();
    expect((await prisma.jobLease.findUniqueOrThrow({ where: { name } })).owner).toBe(replacement.owner);
});

it('makes new messages immediately eligible even in a Sri Lankan database session timezone', async () => {
    const dedupeKey = prefix + ':utc-default';
    const result = await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'Asia/Colombo'");
        const id = await enqueueOutbox(tx, { kind: 'REVALIDATION', dedupeKey, payload: { paths: ['/products'] } });
        const [row] = await tx.$queryRaw<Array<{ eligible: boolean; createdRecently: boolean }>>`
            SELECT "availableAt" <= (clock_timestamp() AT TIME ZONE 'UTC') AS eligible,
                abs(extract(epoch FROM "createdAt" - (clock_timestamp() AT TIME ZONE 'UTC'))) < 5 AS "createdRecently"
            FROM "OutboxMessage" WHERE id = ${id}`;
        return row;
    });
    expect(result).toEqual({ eligible: true, createdRecently: true });
});
