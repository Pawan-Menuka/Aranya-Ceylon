import { afterEach, expect, it, vi } from 'vitest';

const tx = vi.hoisted(() => ({
    webhookEvent: { findMany: vi.fn(), deleteMany: vi.fn() },
    outboxMessage: { findMany: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock('../lib/prisma.js', () => ({ prisma: { $transaction: (work: (client: typeof tx) => unknown) => work(tx) } }));
vi.mock('../services/email.service.js', () => ({ enqueueEmail: vi.fn(), sendLowStockAlert: vi.fn(), sendAbandonedCartEmail: vi.fn() }));
vi.mock('../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn() }));
import { RETENTION_DAYS, runBoundedRetention } from './leasedScheduler.js';

afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });

it('deletes one page of old webhook payloads and delivered outbox rows, never DEAD rows', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-03T00:00:00Z') });
    tx.webhookEvent.findMany.mockResolvedValue([{ id: 'w1' }, { id: 'w2' }]);
    tx.outboxMessage.findMany.mockResolvedValue([{ id: 'o1' }]);
    tx.webhookEvent.deleteMany.mockResolvedValue({ count: 2 });
    tx.outboxMessage.deleteMany.mockResolvedValue({ count: 1 });

    await expect(runBoundedRetention()).resolves.toBe(3);

    const cutoff = new Date(Date.parse('2026-10-03T00:00:00Z') - RETENTION_DAYS * 86_400_000);
    expect(tx.webhookEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { createdAt: { lt: cutoff } }, take: 200 }));
    expect(tx.outboxMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'DELIVERED', deliveredAt: { lt: cutoff } }, take: 200 }));
    expect(tx.webhookEvent.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['w1', 'w2'] }, createdAt: { lt: cutoff } } });
    expect(tx.outboxMessage.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['o1'] }, status: 'DELIVERED', deliveredAt: { lt: cutoff } } });
});
