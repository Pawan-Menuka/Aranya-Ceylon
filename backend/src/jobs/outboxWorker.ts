import { randomUUID } from 'node:crypto';
import { Prisma, type OutboxMessage } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { decryptOutboxPayload, outboxEnabled } from '../lib/outbox.js';
import { deliverQueuedEmail } from '../services/email.service.js';
import { deliverRevalidation } from '../lib/revalidate.js';

const BATCH_SIZE = 2;
const MAX_ATTEMPTS = 8;
const EMAIL_RETRY_WINDOW_MS = 23 * 3600_000;
type Payload = { paths?: string[]; guard?: { cartId: string; updatedAt: string } };
export function outboxWorkerEnabled(): boolean {
    const flag = process.env.OUTBOX_WORKER_ENABLED ?? 'false';
    if (!['true', 'false'].includes(flag)) throw new Error('OUTBOX_WORKER_ENABLED must be true or false');
    if (flag === 'true' && !outboxEnabled()) throw new Error('Outbox worker requires OUTBOX_ENABLED');
    if (flag === 'true' && !process.env.RESEND_API_KEY) throw new Error('Outbox worker requires RESEND_API_KEY');
    if (flag === 'true' && !process.env.REVALIDATION_SECRET) throw new Error('Outbox worker requires REVALIDATION_SECRET');
    if (flag === 'true') {
        const url = new URL((process.env.FRONTEND_URL ?? '').split(',')[0]!.trim());
        if (!['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Invalid worker FRONTEND_URL');
    }
    return flag === 'true';
}
export async function claimOutboxBatch(limit = BATCH_SIZE): Promise<OutboxMessage[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > BATCH_SIZE) throw new Error('Invalid outbox batch limit');
    const token = randomUUID();
    return prisma.$transaction(tx => tx.$queryRaw<OutboxMessage[]>`
        WITH candidates AS (
          SELECT "id" FROM "OutboxMessage"
          WHERE ("status" = 'PENDING' AND "availableAt" <= clock_timestamp() AT TIME ZONE 'UTC')
             OR ("status" = 'PROCESSING' AND "leaseExpiresAt" <= clock_timestamp() AT TIME ZONE 'UTC')
          ORDER BY "availableAt", "id" LIMIT ${limit} FOR UPDATE SKIP LOCKED
        ) UPDATE "OutboxMessage" AS m SET "status" = 'PROCESSING',
          "leaseToken" = ${token}, "leaseExpiresAt" = (clock_timestamp() AT TIME ZONE 'UTC') + interval '120 seconds',
          "firstAttemptAt" = COALESCE(m."firstAttemptAt", clock_timestamp() AT TIME ZONE 'UTC'), "attempts" = m."attempts" + 1
        FROM candidates WHERE m."id" = candidates."id" RETURNING m.*`, { timeout: 5_000, maxWait: 2_000 });
}
export function retryDisposition(row: Pick<OutboxMessage, 'kind' | 'attempts' | 'firstAttemptAt' | 'expiresAt'>, now: Date) {
    if (row.expiresAt && row.expiresAt <= now) return 'EXPIRED';
    if (row.kind === 'EMAIL' && row.firstAttemptAt && now.getTime() - row.firstAttemptAt.getTime() >= EMAIL_RETRY_WINDOW_MS) return 'DELIVERY_UNCERTAIN';
    if (row.attempts > MAX_ATTEMPTS) return 'ATTEMPTS_EXHAUSTED';
    return undefined;
}
export function retryDelayMs(attempt: number, random = Math.random): number {
    return Math.floor(Math.min(3600_000, 30_000 * 2 ** Math.min(attempt - 1, 7)) * (0.75 + random() * 0.25));
}
async function finish(row: OutboxMessage, data: Prisma.OutboxMessageUpdateManyMutationInput) {
    return prisma.$transaction(tx => tx.outboxMessage.updateMany({ where: { id: row.id, status: 'PROCESSING', leaseToken: row.leaseToken },
        data: { ...data, leaseToken: null, leaseExpiresAt: null } }), { timeout: 5_000, maxWait: 2_000 });
}
export async function processOutboxMessage(row: OutboxMessage): Promise<void> {
    const [owned] = await prisma.$transaction(tx => tx.$queryRaw<Array<{ now: Date }>>`
        SELECT clock_timestamp() AT TIME ZONE 'UTC' AS now FROM "OutboxMessage"
        WHERE "id" = ${row.id} AND "leaseToken" = ${row.leaseToken} AND "status" = 'PROCESSING'
          AND "leaseExpiresAt" > clock_timestamp() AT TIME ZONE 'UTC'`, { timeout: 5_000, maxWait: 2_000 });
    if (!owned) return;
    const terminal = retryDisposition(row, owned.now);
    if (terminal) { await finish(row, { status: 'DEAD', lastErrorCode: terminal }); return; }
    try {
        if (row.version !== 1) throw new Error('OUTBOX_INVALID_PAYLOAD');
        let payload: Payload;
        try { payload = decryptOutboxPayload(row.encryptedPayload, `${row.id}:${row.kind}:${row.version}`) as Payload; }
        catch { throw new Error('OUTBOX_INVALID_PAYLOAD'); }
        if (!payload || typeof payload !== 'object') throw new Error('OUTBOX_INVALID_PAYLOAD');
        let receipt: string | undefined;
        if (row.kind === 'EMAIL') {
            if (payload.guard) {
                const guard = payload.guard;
                const cart = await prisma.$transaction(tx => tx.cart.findFirst({ where: { id: guard.cartId, updatedAt: new Date(guard.updatedAt), items: { some: {} } }, select: { id: true } }), { timeout: 5_000, maxWait: 2_000 });
                if (!cart) { await finish(row, { status: 'DEAD', lastErrorCode: 'CART_EPISODE_CHANGED' }); return; }
            }
            receipt = await deliverQueuedEmail(payload, `outbox/${row.id}`);
        } else if (row.kind === 'REVALIDATION' && Array.isArray(payload.paths)) {
            await deliverRevalidation(payload.paths);
        } else throw new Error('OUTBOX_INVALID_PAYLOAD');
        await prisma.$transaction(async tx => {
            const done = await tx.outboxMessage.updateMany({ where: { id: row.id, status: 'PROCESSING', leaseToken: row.leaseToken },
                data: { status: 'DELIVERED', deliveredAt: new Date(), providerReceipt: receipt, leaseToken: null, leaseExpiresAt: null, lastErrorCode: null } });
            if (done.count && payload.guard) await tx.cart.updateMany({ where: { id: payload.guard.cartId, updatedAt: new Date(payload.guard.updatedAt) }, data: { abandonedEmailSentAt: new Date(), updatedAt: new Date(payload.guard.updatedAt) } });
        }, { timeout: 5_000, maxWait: 2_000 });
    } catch (error) {
        const invalid = error instanceof Error && ['OUTBOX_INVALID_PAYLOAD', 'REVALIDATION_INVALID_PAYLOAD'].includes(error.message);
        const code = retryDisposition(row, new Date());
        await finish(row, { status: invalid || code || row.attempts >= MAX_ATTEMPTS ? 'DEAD' : 'PENDING',
            lastErrorCode: invalid ? 'INVALID_PAYLOAD' : code ?? 'DELIVERY_FAILED',
            availableAt: new Date(Date.now() + retryDelayMs(row.attempts)) });
    }
}
export async function runOutboxBatch(): Promise<number> {
    if (!outboxWorkerEnabled()) return 0;
    const rows = await claimOutboxBatch();
    let next = 0;
    const consume = async () => { while (next < rows.length) { const row = rows[next++]!; await processOutboxMessage(row); } };
    await Promise.all([consume(), consume()]);
    return rows.length;
}
export async function outboxStatus() {
    return prisma.outboxMessage.groupBy({ by: ['status', 'kind'], _count: { id: true }, _min: { createdAt: true } });
}
// Retain firstAttemptAt, payload, and idempotency key; never reset an uncertain provider window.
export async function replayDeadOutbox(id: string): Promise<boolean> {
    const result = await prisma.outboxMessage.updateMany({ where: { id, status: 'DEAD', lastErrorCode: 'DELIVERY_FAILED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        AND: [{ OR: [{ kind: 'REVALIDATION' }, { kind: 'EMAIL', firstAttemptAt: { gt: new Date(Date.now() - EMAIL_RETRY_WINDOW_MS) } }] }] },
        data: { status: 'PENDING', attempts: 0, availableAt: new Date(), lastErrorCode: null } });
    return result.count === 1;
}
