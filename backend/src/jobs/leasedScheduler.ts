import cron from 'node-cron';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { enqueueOutbox, outboxEnabled } from '../lib/outbox.js';
import { enqueueEmail, sendLowStockAlert, sendAbandonedCartEmail } from '../services/email.service.js';
import { revalidateFrontend } from '../lib/revalidate.js';
import { cancelOrderAndReleaseStock } from '../controllers/webhook.controller.js';
import { withJobLease, type JobLeaseHandle } from './jobLease.js';

const PAGE = 200;
const RUN_BUDGET_MS = 25_000;
const transactions = { timeout: 5_000, maxWait: 2_000 };
type Work = (lease?: JobLeaseHandle) => Promise<number>;
const tasks: ReturnType<typeof cron.schedule>[] = [];
const pending = new Set<Promise<void>>();
const guarded = async <T>(lease: JobLeaseHandle | undefined, work: (tx: Prisma.TransactionClient) => Promise<T>) =>
    prisma.$transaction(async tx => { await lease?.assertOwned(tx); return work(tx); }, transactions);

export async function runBoundedPublications(lease?: JobLeaseHandle): Promise<number> {
    const deadline = Date.now() + RUN_BUDGET_MS;
    const due = await guarded(lease, tx => tx.blog.findMany({ where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
        select: { id: true, slug: true, scheduledAt: true }, orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }], take: PAGE }));
    let published = 0;
    for (const blog of due) {
        if (Date.now() >= deadline) break;
        const paths = ['/', '/journal', '/search', `/journal/${blog.slug}`];
        try {
            const changed = await guarded(lease, async tx => {
                const result = await tx.blog.updateMany({ where: { id: blog.id, status: 'SCHEDULED', scheduledAt: blog.scheduledAt }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
                if (result.count) await enqueueOutbox(tx, { kind: 'REVALIDATION', dedupeKey: `publish:${blog.id}:${blog.scheduledAt!.getTime()}`, payload: { paths } });
                return result.count;
            });
            if (changed) { published++; await revalidateFrontend(paths); }
        } catch (error) {
            if (error instanceof Error && error.message === 'JOB_LEASE_LOST') throw error;
            console.warn('[jobs] publication failed', { code: 'PUBLICATION_FAILED' });
        }
    }
    return published;
}
export async function runBoundedCartExpiry(lease?: JobLeaseHandle): Promise<number> {
    return guarded(lease, async tx => {
        const rows = await tx.cart.findMany({ where: { userId: null, expiresAt: { lte: new Date() } }, select: { id: true }, orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], take: PAGE });
        const result = await tx.cart.deleteMany({ where: { id: { in: rows.map(row => row.id) }, userId: null, expiresAt: { lte: new Date() } } });
        return result.count;
    });
}
export async function runBoundedTokenPruning(lease?: JobLeaseHandle): Promise<number> {
    return guarded(lease, async tx => {
        const rows = await tx.token.findMany({ where: { expiresAt: { lt: new Date() } }, select: { id: true }, orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], take: PAGE });
        return (await tx.token.deleteMany({ where: { id: { in: rows.map(row => row.id) }, expiresAt: { lt: new Date() } } })).count;
    });
}
export async function runBoundedStaleOrders(lease?: JobLeaseHandle): Promise<number> {
    const deadline = Date.now() + RUN_BUDGET_MS;
    const cutoff = new Date(Date.now() - 24 * 3600_000);
    const rows = await guarded(lease, tx => tx.order.findMany({ where: { status: 'PENDING', createdAt: { lt: cutoff } }, select: { id: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: PAGE }));
    let processed = 0;
    for (const row of rows) {
        if (Date.now() >= deadline) break;
        await cancelOrderAndReleaseStock(row.id, 'Cancelled — stale PENDING order older than 24h.', lease);
        processed++;
    }
    return processed;
}
export async function runBoundedLowStock(lease?: JobLeaseHandle): Promise<number> {
    const deadline = Date.now() + RUN_BUDGET_MS;
    const threshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 10);
    if (!Number.isInteger(threshold) || threshold < 1) throw new Error('Invalid LOW_STOCK_THRESHOLD');
    let total = 0;
    const day = new Date().toISOString().slice(0, 10);
    // Bounded pages and a time budget; a fixed checkpoint resumes unfinished daily cycles.
    for (let page = 0; page < 10 && Date.now() < deadline; page++) {
        const result = await guarded(lease, async tx => {
            const previous = await tx.jobCheckpoint.findUnique({ where: { name: 'low-stock' } });
            if (previous?.cursor === null && previous.cycle === day) return { count: 0, complete: true };
            const cycle = previous?.cursor ? previous.cycle : day;
            const cursor = previous?.cursor ?? undefined;
            const rows = await tx.variant.findMany({ where: { stock: { gt: 0, lte: threshold }, ...(cursor ? { id: { gt: cursor } } : {}) },
                include: { product: { select: { name: true } } }, orderBy: { id: 'asc' }, take: PAGE });
            if (rows.length) await enqueueEmail(tx, `stock:${cycle}:${rows[0]!.id}:${rows.at(-1)!.id}`,
                () => sendLowStockAlert(rows.map(row => ({ name: row.product.name, sku: row.sku, stock: row.stock }))));
            const complete = rows.length < PAGE;
            const state = { cycle, cursor: complete ? null : rows.at(-1)!.id };
            await tx.jobCheckpoint.upsert({ where: { name: 'low-stock' }, create: { name: 'low-stock', ...state }, update: state });
            return { count: rows.length, complete };
        });
        total += result.count;
        if (result.complete) break;
    }
    return total;
}
export async function runBoundedAbandonedCarts(lease?: JobLeaseHandle): Promise<number> {
    const deadline = Date.now() + RUN_BUDGET_MS;
    const cutoff = new Date(Date.now() - 3 * 3600_000);
    // Dedupe keys are indexed episode identities, so failed/pending reminders cannot starve later carts.
    const ids = await guarded(lease, tx => tx.$queryRaw<Array<{ id: string }>>`
        SELECT c.id FROM "Cart" c WHERE c."userId" IS NOT NULL AND c."updatedAt" < ${cutoff}
          AND c."abandonedEmailSentAt" IS NULL AND EXISTS (SELECT 1 FROM "CartItem" i WHERE i."cartId" = c.id)
          AND NOT EXISTS (SELECT 1 FROM "OutboxMessage" m WHERE m."dedupeKey" =
            'cart:' || c.id || ':' || ((extract(epoch FROM c."updatedAt") * 1000)::bigint)::text)
        ORDER BY c."updatedAt", c.id LIMIT ${PAGE}`);
    let accepted = 0;
    for (const row of ids) {
        if (Date.now() >= deadline) break;
        const queued = await guarded(lease, async tx => {
            const cart = await tx.cart.findFirst({ where: { id: row.id, userId: { not: null }, updatedAt: { lt: cutoff }, abandonedEmailSentAt: null, items: { some: {} } },
                include: { user: { select: { email: true } }, items: { include: { product: { select: { name: true } } } } } });
            if (!cart?.user?.email) return false;
            await enqueueEmail(tx, `cart:${cart.id}:${cart.updatedAt.getTime()}`,
                () => sendAbandonedCartEmail({ to: cart.user!.email, items: cart.items.map(item => ({ name: item.product.name, quantity: item.quantity })) }),
                new Date(Date.now() + 24 * 3600_000), { cartId: cart.id, updatedAt: cart.updatedAt.toISOString() });
            return true;
        });
        if (queued) accepted++;
    }
    return accepted;
}
export function startLeasedJobs(): void {
    if (!outboxEnabled()) throw new Error('Distributed jobs require OUTBOX_ENABLED');
    const timezone = process.env.JOB_TIMEZONE ?? 'UTC';
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); } catch { throw new Error('Invalid JOB_TIMEZONE'); }
    const schedule = (name: string, expression: string, work: Work) => {
        tasks.push(cron.schedule(expression, () => {
            const run = withJobLease(name, async lease => { await work(lease); }).catch(() => { console.error('[jobs] run failed', { name, code: 'JOB_FAILED' }); });
            pending.add(run); void run.finally(() => pending.delete(run));
            return run;
        }, { noOverlap: true, timezone }));
    };
    schedule('scheduled-posts', '* * * * *', runBoundedPublications);
    schedule('cart-expiry', '0 * * * *', runBoundedCartExpiry);
    schedule('low-stock', '0 8 * * *', runBoundedLowStock);
    schedule('stale-orders', '0 * * * *', runBoundedStaleOrders);
    schedule('token-pruning', '0 3 * * *', runBoundedTokenPruning);
    schedule('abandoned-carts', '30 * * * *', runBoundedAbandonedCarts);
}
export async function stopLeasedJobs(): Promise<void> {
    await Promise.all(tasks.splice(0).map(task => task.stop()));
    await Promise.all([...pending]);
}
