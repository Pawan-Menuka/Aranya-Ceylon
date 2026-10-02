import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { OutboxMessage } from '@prisma/client';
import { encryptOutboxPayload } from '../lib/outbox.js';
const state = vi.hoisted(() => ({ rows: new Map<string, OutboxMessage>(), deliver: vi.fn(), revalidate: vi.fn(), failAck: false,
    cart: undefined as { id: string; updatedAt: Date; marked: boolean } | undefined }));
type Update = { where: { id?: string; leaseToken?: string | null; status?: string }; data: Partial<OutboxMessage> };
vi.mock('../services/email.service.js', () => ({ deliverQueuedEmail: state.deliver }));
vi.mock('../lib/revalidate.js', () => ({ deliverRevalidation: state.revalidate }));
vi.mock('../lib/prisma.js', () => {
    const updateMany = async ({ where, data }: Update) => {
        const row = state.rows.get(where.id ?? '');
        if (!row || (where.status && row.status !== where.status) || (where.leaseToken && row.leaseToken !== where.leaseToken)) return { count: 0 };
        Object.assign(row, data); return { count: 1 };
    };
    const cart = { findFirst: vi.fn(async ({ where }: { where: { id: string; updatedAt: Date } }) => state.cart?.id === where.id && state.cart.updatedAt.getTime() === where.updatedAt.getTime() ? { id: where.id } : null),
        updateMany: vi.fn(async ({ where }: { where: { id: string; updatedAt: Date } }) => {
            if (state.cart?.id === where.id && state.cart.updatedAt.getTime() === where.updatedAt.getTime()) { state.cart.marked = true; return { count: 1 }; }
            return { count: 0 };
        }) };
    const query = async (sql: TemplateStringsArray, ...values: unknown[]) => {
        if (sql.join('').includes('WITH candidates')) {
            const [limit, token] = values as [number, string];
            const rows = [...state.rows.values()].filter(row => (row.status === 'PENDING' && row.availableAt <= new Date()) || (row.status === 'PROCESSING' && row.leaseExpiresAt! <= new Date())).slice(0, limit);
            for (const row of rows) Object.assign(row, { status: 'PROCESSING', leaseToken: token, leaseExpiresAt: new Date(Date.now() + 120_000), firstAttemptAt: row.firstAttemptAt ?? new Date(), attempts: row.attempts + 1 });
            return structuredClone(rows);
        }
        const [id, token] = values as [string, string]; const row = state.rows.get(id);
        return row?.status === 'PROCESSING' && row.leaseToken === token && row.leaseExpiresAt! > new Date() ? [{ now: new Date() }] : [];
    };
    const tx = { $queryRaw: query, cart, outboxMessage: { updateMany } };
    return { prisma: { ...tx, $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
        if (state.failAck) { state.failAck = false; throw new Error('ack transaction unavailable'); }
        return work(tx);
    } } };
});
import { claimOutboxBatch, processOutboxMessage, runOutboxBatch, outboxWorkerEnabled, retryDisposition, retryDelayMs } from './outboxWorker.js';
beforeEach(() => {
    state.rows.clear(); state.deliver.mockReset().mockResolvedValue('receipt'); state.revalidate.mockReset().mockResolvedValue(undefined); state.failAck = false; state.cart = undefined;
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
    vi.stubEnv('OUTBOX_ENABLED', 'true'); vi.stubEnv('OUTBOX_WORKER_ENABLED', 'true'); vi.stubEnv('OUTBOX_ACTIVE_KEY', 'test');
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', JSON.stringify({ test: Buffer.alloc(32, 8).toString('base64') }));
    vi.stubEnv('RESEND_API_KEY', 'test-never-sent'); vi.stubEnv('REVALIDATION_SECRET', 'test-never-sent'); vi.stubEnv('FRONTEND_URL', 'http://test.example');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
function seed(id = 'm1', payload: unknown = { mail: { to: 'private@example.test', html: 'private-token' } }, kind = 'EMAIL') {
    const row: OutboxMessage = { id, kind, version: 1, dedupeKey: id, encryptedPayload: encryptOutboxPayload(payload, `${id}:${kind}:1`),
        status: 'PENDING', attempts: 0, availableAt: new Date(), expiresAt: null, firstAttemptAt: null, leaseToken: null, leaseExpiresAt: null,
        providerReceipt: null, lastErrorCode: null, createdAt: new Date(), deliveredAt: null };
    state.rows.set(id, row); return row;
}
it('claims disjoint rows across two workers, recovers a crashed claim and fences the old owner', async () => {
    seed('a'); seed('b'); seed('c');
    const [first, second] = await Promise.all([claimOutboxBatch(), claimOutboxBatch()]);
    expect(first).toHaveLength(2); expect(second).toHaveLength(1);
    expect(new Set([...first, ...second].map(row => row.id)).size).toBe(3);
    vi.setSystemTime(Date.now() + 121_000);
    const reclaimed = await claimOutboxBatch();
    expect(reclaimed[0]!.leaseToken).not.toBe(first[0]!.leaseToken);
    await processOutboxMessage(first[0]!); expect(state.deliver).not.toHaveBeenCalled();
    await processOutboxMessage(reclaimed[0]!); expect(state.deliver).toHaveBeenCalledOnce();
});
it('reuses exactly the same frozen payload and provider key after an ambiguous accepted send', async () => {
    seed(); const [first] = await claimOutboxBatch();
    state.deliver.mockRejectedValueOnce(new Error('network interrupted after acceptance: private@example.test'));
    await processOutboxMessage(first!);
    expect(state.rows.get('m1')!.status).toBe('PENDING');
    expect(state.rows.get('m1')!.lastErrorCode).toBe('DELIVERY_FAILED');
    vi.setSystemTime(Date.now() + 60_000);
    const [retry] = await claimOutboxBatch(); await processOutboxMessage(retry!);
    expect(state.deliver.mock.calls[1]).toEqual(state.deliver.mock.calls[0]);
    expect(state.deliver.mock.calls[0]![1]).toBe('outbox/m1');
    expect(state.rows.get('m1')!.status).toBe('DELIVERED');
});
it('retries a provider-accepted message when its local acknowledgement failed', async () => {
    seed(); const [row] = await claimOutboxBatch();
    state.deliver.mockImplementationOnce(async () => { state.failAck = true; return 'accepted'; });
    await processOutboxMessage(row!);
    expect(state.rows.get('m1')!.status).toBe('PENDING');
    vi.setSystemTime(Date.now() + 60_000); const [retry] = await claimOutboxBatch(); await processOutboxMessage(retry!);
    expect(state.deliver.mock.calls[1]![1]).toBe(state.deliver.mock.calls[0]![1]);
    expect(state.rows.get('m1')!.providerReceipt).toBe('receipt');
});
it.each(['EXPIRED', 'DELIVERY_UNCERTAIN', 'ATTEMPTS_EXHAUSTED'])('deadletters %s without a provider call', async reason => {
    const original = seed();
    if (reason === 'EXPIRED') original.expiresAt = new Date(Date.now() - 1);
    if (reason === 'DELIVERY_UNCERTAIN') original.firstAttemptAt = new Date(Date.now() - 23 * 3600_000);
    if (reason === 'ATTEMPTS_EXHAUSTED') original.attempts = 8;
    const [row] = await claimOutboxBatch(); await processOutboxMessage(row!);
    expect(state.rows.get('m1')!.status).toBe('DEAD'); expect(state.rows.get('m1')!.lastErrorCode).toBe(reason);
    expect(state.deliver).not.toHaveBeenCalled();
});
it('deadletters tampered ciphertext and rejects an old cart episode before dispatch', async () => {
    const tampered = seed('bad'); tampered.encryptedPayload = 'malformed';
    seed('cart', { mail: {}, guard: { cartId: 'cart1', updatedAt: '2026-10-02T08:00:00Z' } });
    state.cart = { id: 'cart1', updatedAt: new Date('2026-10-02T09:00:00Z'), marked: false };
    const rows = await claimOutboxBatch(); await Promise.all(rows.map(processOutboxMessage));
    expect(state.rows.get('bad')!.lastErrorCode).toBe('INVALID_PAYLOAD'); expect(state.rows.get('cart')!.lastErrorCode).toBe('CART_EPISODE_CHANGED');
    expect(state.deliver).not.toHaveBeenCalled(); expect(state.cart.marked).toBe(false);
});
it('marks a matching cart episode only after provider acknowledgement and leaves a touched cart unmarked', async () => {
    state.cart = { id: 'cart1', updatedAt: new Date('2026-10-02T08:00:00Z'), marked: false };
    seed('same', { mail: {}, guard: { cartId: 'cart1', updatedAt: state.cart.updatedAt.toISOString() } });
    const [same] = await claimOutboxBatch(); await processOutboxMessage(same!); expect(state.cart.marked).toBe(true);
    state.cart.marked = false;
    seed('touched', { mail: {}, guard: { cartId: 'cart1', updatedAt: state.cart.updatedAt.toISOString() } });
    state.deliver.mockImplementationOnce(async () => { state.cart!.updatedAt = new Date(); return 'accepted'; });
    const [touched] = await claimOutboxBatch(); await processOutboxMessage(touched!); expect(state.cart.marked).toBe(false);
});
it('does not acknowledge failed revalidation; retries use the throwing delivery primitive', async () => {
    seed('reval', { paths: ['/products'] }, 'REVALIDATION'); state.revalidate.mockRejectedValueOnce(new Error('unavailable'));
    await runOutboxBatch(); expect(state.rows.get('reval')!.status).toBe('PENDING');
    vi.setSystemTime(Date.now() + 60_000); await runOutboxBatch(); expect(state.rows.get('reval')!.status).toBe('DELIVERED');
    expect(state.revalidate).toHaveBeenCalledTimes(2);
});
it('fails secure on invalid enabled configuration and caps queue claims/retry backoff', async () => {
    await expect(claimOutboxBatch(3)).rejects.toThrow('limit');
    expect(retryDelayMs(1, () => 0)).toBe(22_500); expect(retryDelayMs(100, () => 1)).toBe(3600_000);
    vi.stubEnv('RESEND_API_KEY', undefined); expect(() => outboxWorkerEnabled()).toThrow('RESEND');
    vi.stubEnv('OUTBOX_WORKER_ENABLED', 'false'); expect(outboxWorkerEnabled()).toBe(false);
    expect(retryDisposition({ kind: 'REVALIDATION', attempts: 1, firstAttemptAt: new Date(0), expiresAt: null }, new Date())).toBeUndefined();
});
