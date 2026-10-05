import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { JobLeaseHandle } from '../jobs/jobLease.js';
import type { DailyOrderAggregate, ProductAggregate } from './analytics-query.js';

export function dashboardRollupsEnabled(): boolean {
    const value = process.env.DASHBOARD_ROLLUPS_ENABLED ?? 'false';
    if (!['true', 'false'].includes(value)) throw new Error('DASHBOARD_ROLLUPS_ENABLED must be true or false');
    return value === 'true';
}

/** Clean-day checks and reads share a snapshot; partial or dirty backfills use live SQL. */
export async function readDashboardRollups(seriesStart: Date, currentStart: Date, tomorrowStart: Date, fxRate: number)
    : Promise<{ dailyOrders: DailyOrderAggregate[]; topProducts: ProductAggregate[] } | undefined> {
    if (!dashboardRollupsEnabled()) return undefined;
    return prisma.$transaction(async tx => {
        const [coverage] = await tx.$queryRaw<Array<{ days: number; clean: number }>>`
            SELECT COUNT(*)::int AS days,
                COUNT(*) FILTER (WHERE "builtAt" IS NOT NULL AND "builtRevision" = revision)::int AS clean
            FROM "DashboardRollupDay" WHERE day >= ${seriesStart}::date AND day < ${tomorrowStart}::date`;
        const expected = Math.round((tomorrowStart.getTime() - seriesStart.getTime()) / 86_400_000);
        if (coverage?.days !== expected || coverage.clean !== expected) return undefined;
        const dailyOrders = await tx.$queryRaw<DailyOrderAggregate[]>`
            SELECT to_char(day, 'YYYY-MM-DD') AS date, market, currency, status, orders, total
            FROM "DashboardDailyOrder" WHERE day >= ${seriesStart}::date AND day < ${tomorrowStart}::date`;
        const topProducts = await tx.$queryRaw<ProductAggregate[]>`
            SELECT "productId", SUM(units)::bigint AS units,
                SUM(revenue / CASE WHEN currency = 'LKR' THEN ${fxRate}::numeric ELSE 1 END) AS "revenueUsd"
            FROM "DashboardDailyProduct"
            WHERE day >= ${currentStart}::date AND day < ${tomorrowStart}::date
                AND status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
            GROUP BY "productId" ORDER BY units DESC, "productId" ASC LIMIT 5`;
        return { dailyOrders, topProducts };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 10_000 });
}

/** Resumable backfill: at most four day transactions, fenced before each write. */
export async function rebuildDashboardRollups(lease: JobLeaseHandle, options: { maxDays?: number; timeBudgetMs?: number } = {}) {
    if (!dashboardRollupsEnabled()) return 0;
    const maxDays = Math.min(4, Math.max(1, Math.trunc(options.maxDays ?? 4)));
    const budget = Math.min(15_000, Math.max(1, options.timeBudgetMs ?? 15_000));
    const deadline = Date.now() + budget;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - 89 * 86_400_000);
    const end = new Date(today.getTime() + 86_400_000);
    await prisma.$transaction(async tx => {
        await lease.assertOwned(tx);
        await tx.$executeRaw`INSERT INTO "DashboardRollupDay" (day)
            SELECT d::date FROM generate_series(${start}::timestamp, ${today}::timestamp, interval '1 day') d
            ON CONFLICT (day) DO NOTHING`;
    }, { timeout: 5_000 });
    let completed = 0;
    while (completed < maxDays && Date.now() < deadline) {
        const updated = await prisma.$transaction(async tx => {
            await lease.assertOwned(tx);
            const [dirty] = await tx.$queryRaw<Array<{ day: Date; revision: bigint }>>`
                SELECT day, revision FROM "DashboardRollupDay"
                WHERE day >= ${start}::date AND day < ${end}::date
                    AND ("builtAt" IS NULL OR "builtRevision" <> revision)
                ORDER BY day FOR UPDATE SKIP LOCKED LIMIT 1`;
            if (!dirty) return false;
            const next = new Date(dirty.day.getTime() + 86_400_000);
            // The metadata lock blocks trigger dirties until commit. Waiting mutations then
            // increment revision, so they cannot make an old aggregate appear current.
            await tx.$executeRaw`DELETE FROM "DashboardDailyOrder" WHERE day = ${dirty.day}::date`;
            await tx.$executeRaw`INSERT INTO "DashboardDailyOrder" (day, market, currency, status, orders, total)
                SELECT ${dirty.day}::date, market, currency, status, COUNT(*)::int, SUM(total)
                FROM "Order" WHERE "createdAt" >= ${dirty.day} AND "createdAt" < ${next}
                GROUP BY market, currency, status`;
            await tx.$executeRaw`DELETE FROM "DashboardDailyProduct" WHERE day = ${dirty.day}::date`;
            await tx.$executeRaw`INSERT INTO "DashboardDailyProduct" (day, "productId", market, currency, status, units, revenue)
                SELECT ${dirty.day}::date, oi."productId", o.market, o.currency, o.status,
                    SUM(oi.quantity)::bigint, SUM(oi.quantity * oi."unitPrice")
                FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
                WHERE o."createdAt" >= ${dirty.day} AND o."createdAt" < ${next}
                GROUP BY oi."productId", o.market, o.currency, o.status`;
            await tx.$executeRaw`UPDATE "DashboardRollupDay" SET "builtRevision" = ${dirty.revision},
                "builtAt" = clock_timestamp() AT TIME ZONE 'UTC'
                WHERE day = ${dirty.day}::date AND revision = ${dirty.revision}`;
            return true;
        }, { timeout: Math.min(5_000, Math.max(1, deadline - Date.now())) });
        if (!updated) break;
        completed += 1;
    }
    return completed;
}
