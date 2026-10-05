import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acquireJobLease } from '../../jobs/jobLease.js';
import { readDashboardRollups, rebuildDashboardRollups } from '../../services/dashboard-rollups.js';
import { buildDailyOrderAggregateQuery, buildTopProductsAggregateQuery } from '../../services/analytics-query.js';
import { createCatalogItem, prisma, resetIntegrationDatabase, uniqueTestId } from './helpers.js';
import type { DailyOrderAggregate, ProductAggregate } from '../../services/analytics-query.js';
const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const tomorrow = new Date(today.getTime() + 86_400_000);
const start = new Date(today.getTime() - 89 * 86_400_000);
const current = new Date(today.getTime() - 29 * 86_400_000);
const normalize = (rows: unknown[]) => JSON.parse(JSON.stringify(rows, (_, v: unknown) => typeof v === 'bigint' ? v.toString() : v)) as unknown[];
async function backfill() {
    const lease = await acquireJobLease('dashboard-rollup-integration');
    expect(lease).toBeDefined();
    try { for (let n = 0; n < 25; n++) if (await rebuildDashboardRollups(lease!, { maxDays: 4 }) === 0) break; }
    finally { await lease!.release(); }
}
async function sample() {
    const { product, variant } = await createCatalogItem({ prefix: uniqueTestId('rollup'), stock: 100 });
    const order = await prisma.order.create({ data: {
        status: 'PAID', total: '602.15', shippingCost: '2.15', market: 'LOCAL', currency: 'LKR',
        shippingAddress: {}, createdAt: new Date(today.getTime() + 1000),
        items: { create: { productId: product.id, variantId: variant.id, quantity: 2, unitPrice: '300.00' } },
    }, include: { items: true } });
    return order;
}
beforeEach(async () => { vi.stubEnv('DASHBOARD_ROLLUPS_ENABLED', 'true'); await resetIntegrationDatabase(); });
afterAll(async () => { vi.unstubAllEnvs(); await resetIntegrationDatabase(); await prisma.$disconnect(); });

describe('dashboard rollups against PostgreSQL', () => {
    it('backfills empty days and preserves native currency, counts and historical item revenue', async () => {
        await sample();
        await prisma.order.create({ data: { status: 'REFUNDED', total: '19.99', shippingCost: '0', market: 'INTERNATIONAL', currency: 'USD', shippingAddress: {}, createdAt: today } });
        expect(await readDashboardRollups(start, current, tomorrow, 300)).toBeUndefined();
        await backfill();
        expect(await prisma.dashboardRollupDay.count()).toBe(90);
        for (const fx of [300, 325]) {
            const rolled = await readDashboardRollups(start, current, tomorrow, fx);
            expect(rolled).toBeDefined();
            const daily = await prisma.$queryRaw<DailyOrderAggregate[]>(buildDailyOrderAggregateQuery(start, tomorrow));
            const top = await prisma.$queryRaw<ProductAggregate[]>(buildTopProductsAggregateQuery(current, tomorrow, fx));
            expect(normalize(rolled!.dailyOrders).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
                .toEqual(normalize(daily).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
            expect(normalize(rolled!.topProducts)).toEqual(normalize(top));
        }
    });
    it('detects refund, item-price and creation-day changes before serving aggregates', async () => {
        const order = await sample(); await backfill();
        await prisma.order.update({ where: { id: order.id }, data: { status: 'REFUNDED', createdAt: new Date(today.getTime() - 86_400_000) } });
        await prisma.orderItem.update({ where: { id: order.items[0]!.id }, data: { unitPrice: '301.00', quantity: 3 } });
        expect(await readDashboardRollups(start, current, tomorrow, 300)).toBeUndefined();
        await backfill();
        expect((await readDashboardRollups(start, current, tomorrow, 300))!.topProducts).toEqual([]);
        await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
        expect(await readDashboardRollups(start, current, tomorrow, 300)).toBeUndefined();
        await backfill();
        expect(Number((await readDashboardRollups(start, current, tomorrow, 300))!.topProducts[0]!.revenueUsd)).toBe(3.01);
    });
    it('rolls trigger dirties back with the business transaction', async () => {
        const order = await sample(); await backfill();
        const before = await prisma.dashboardRollupDay.findMany({ orderBy: { day: 'asc' } });
        await expect(prisma.$transaction(async tx => {
            await tx.order.update({ where: { id: order.id }, data: { total: '999.00' } });
            throw new Error('rollback');
        })).rejects.toThrow('rollback');
        expect(await prisma.dashboardRollupDay.findMany({ orderBy: { day: 'asc' } })).toEqual(before);
        expect(await readDashboardRollups(start, current, tomorrow, 300)).toBeDefined();
    });
    it('rejects a stale worker fence before any aggregate write', async () => {
        await sample();
        const old = await acquireJobLease('dashboard-rollup-fence');
        expect(old).toBeDefined();
        await prisma.$executeRaw`UPDATE "JobLease" SET "expiresAt" = (clock_timestamp() AT TIME ZONE 'UTC') - interval '1 second' WHERE name = 'dashboard-rollup-fence'`;
        const newer = await acquireJobLease('dashboard-rollup-fence');
        expect(newer!.fence).toBeGreaterThan(old!.fence);
        await expect(rebuildDashboardRollups(old!)).rejects.toThrow('JOB_LEASE_LOST');
        expect(await prisma.dashboardDailyOrder.count()).toBe(0);
        await old!.release();
        expect(await prisma.jobLease.count({ where: { name: 'dashboard-rollup-fence' } })).toBe(1);
        await newer!.release();
    });
});
