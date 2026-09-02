import type { Request, Response } from 'express';
import { prisma } from '../../index.js';

const REVENUE_STATUSES = new Set(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']);

type MarketValues = { all: number; local: number; international: number };

function percentChange(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

function changes(current: MarketValues, previous: MarketValues): Record<keyof MarketValues, number | null> {
    return {
        all: percentChange(current.all, previous.all),
        local: percentChange(current.local, previous.local),
        international: percentChange(current.international, previous.international),
    };
}

export async function getDashboard(_req: Request, res: Response) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const currentStart = new Date(todayStart);
    currentStart.setUTCDate(currentStart.getUTCDate() - 29);
    const previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - 30);
    const seriesStart = new Date(todayStart);
    seriesStart.setUTCDate(seriesStart.getUTCDate() - 89);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const LKR_USD_RATE = Number(process.env.LKR_USD_RATE ?? 300) || 300;

    // Run all aggregations in parallel for speed
    const [
        recentOrders,
        topLineItems,
        pendingFulfilment,
        lowStockVariants,
        recentAuditLogs,
        newCustomers,
    ] = await Promise.all([
        // One bounded order read powers the 90-day chart, exact today metrics,
        // and current-vs-previous 30-day comparisons.
        prisma.order.findMany({
            where: { createdAt: { gte: seriesStart, lt: tomorrowStart } },
            select: { market: true, currency: true, status: true, total: true, createdAt: true },
        }),
        // Top-product line items in the window. We aggregate in JS (below) because
        // "revenue" must be Σ(quantity × unitPrice) — groupBy can only _sum a single
        // column, which is why the old query summed unitPrice with no quantity and
        // also mixed LKR + USD into one meaningless figure (BUG-15).
        prisma.orderItem.findMany({
            where: { order: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, createdAt: { gte: currentStart, lt: tomorrowStart } } },
            select: {
                productId: true,
                quantity: true,
                unitPrice: true,
                order: { select: { currency: true } },
            },
        }),
        // Orders needing action
        prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
        // Low stock variants
        prisma.variant.findMany({
            where: { stock: { lte: Number(process.env.LOW_STOCK_THRESHOLD ?? 10) } },
            include: { product: { select: { name: true } } },
            orderBy: { stock: 'asc' },
            take: 20,
        }),
        // Recent audit activity
        prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { actor: { select: { name: true, email: true, role: true } } },
        }),
        prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: sevenDaysAgo } } }),
    ]);

    const emptyValues = (): MarketValues => ({ all: 0, local: 0, international: 0 });
    const currentRevenue = emptyValues();
    const previousRevenue = emptyValues();
    const currentOrders = emptyValues();
    const previousOrders = emptyValues();
    const currentPaidOrders = emptyValues();
    const previousPaidOrders = emptyValues();
    const todayRevenue = emptyValues();
    const todayOrders = emptyValues();

    const daily = new Map<string, { localRevenueUsd: number; internationalRevenueUsd: number; localOrders: number; internationalOrders: number }>();
    for (let i = 0; i < 90; i += 1) {
        const date = new Date(seriesStart);
        date.setUTCDate(date.getUTCDate() + i);
        daily.set(date.toISOString().slice(0, 10), { localRevenueUsd: 0, internationalRevenueUsd: 0, localOrders: 0, internationalOrders: 0 });
    }

    for (const order of recentOrders) {
        const marketKey = order.market === 'LOCAL' ? 'local' : 'international';
        const createdAt = new Date(order.createdAt);
        const isCurrent = createdAt >= currentStart;
        const isPrevious = createdAt >= previousStart && createdAt < currentStart;
        const isToday = createdAt >= todayStart;
        const earnsRevenue = REVENUE_STATUSES.has(order.status);
        const amount = Number(order.total);
        const revenueUsd = order.currency === 'LKR' ? amount / LKR_USD_RATE : amount;

        if (isCurrent) {
            currentOrders[marketKey] += 1;
            currentOrders.all += 1;
            if (earnsRevenue) {
                currentRevenue[marketKey] += revenueUsd;
                currentRevenue.all += revenueUsd;
                currentPaidOrders[marketKey] += 1;
                currentPaidOrders.all += 1;
            }
        } else if (isPrevious) {
            previousOrders[marketKey] += 1;
            previousOrders.all += 1;
            if (earnsRevenue) {
                previousRevenue[marketKey] += revenueUsd;
                previousRevenue.all += revenueUsd;
                previousPaidOrders[marketKey] += 1;
                previousPaidOrders.all += 1;
            }
        }

        if (isToday) {
            todayOrders[marketKey] += 1;
            todayOrders.all += 1;
            if (earnsRevenue) {
                todayRevenue[marketKey] += revenueUsd;
                todayRevenue.all += revenueUsd;
            }
        }

        const day = daily.get(createdAt.toISOString().slice(0, 10));
        if (day) {
            if (marketKey === 'local') day.localOrders += 1;
            else day.internationalOrders += 1;
            if (earnsRevenue) {
                if (marketKey === 'local') day.localRevenueUsd += revenueUsd;
                else day.internationalRevenueUsd += revenueUsd;
            }
        }
    }

    const aov = (revenue: MarketValues, paidOrders: MarketValues): MarketValues => ({
        all: paidOrders.all ? revenue.all / paidOrders.all : 0,
        local: paidOrders.local ? revenue.local / paidOrders.local : 0,
        international: paidOrders.international ? revenue.international / paidOrders.international : 0,
    });
    const currentAov = aov(currentRevenue, currentPaidOrders);
    const previousAov = aov(previousRevenue, previousPaidOrders);
    const roundValues = (values: MarketValues): MarketValues => ({
        all: Math.round(values.all * 100) / 100,
        local: Math.round(values.local * 100) / 100,
        international: Math.round(values.international * 100) / 100,
    });

    // Aggregate per product: units = Σquantity, revenue = Σ(quantity × unitPrice).
    // LKR revenue is normalised to USD (LKR_USD_RATE, default 300) so the single
    // USD figure the dashboard renders is comparable rather than a raw LKR+USD sum;
    // ranking is by units, which is currency-neutral (BUG-15).
    const perProduct = new Map<string, { units: number; revenueUsd: number }>();
    for (const li of topLineItems) {
        const acc = perProduct.get(li.productId) ?? { units: 0, revenueUsd: 0 };
        const lineTotal = Number(li.unitPrice) * li.quantity;
        acc.units += li.quantity;
        acc.revenueUsd += li.order.currency === 'LKR' ? lineTotal / LKR_USD_RATE : lineTotal;
        perProduct.set(li.productId, acc);
    }
    const ranked = [...perProduct.entries()]
        .sort((a, b) => b[1].units - a[1].units)
        .slice(0, 5);

    // Resolve product names for the top-products list in one extra query.
    const productIds = ranked.map(([productId]) => productId);
    const productNames = productIds.length
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, slug: true },
        })
        : [];
    const nameById = Object.fromEntries(productNames.map((p) => [p.id, p]));

    const topProductsWithNames = ranked.map(([productId, agg]) => ({
        productId,
        name: nameById[productId]?.name ?? productId,
        slug: nameById[productId]?.slug ?? '',
        units: agg.units,
        revenue: Math.round(agg.revenueUsd * 100) / 100,
    }));

    return res.json({
        // Return the exact conversion rate used for server-side aggregates so
        // the dashboard never has to mirror a separate public environment var.
        fxRate: LKR_USD_RATE,
        revenue: {
            local: { total: Math.round(currentRevenue.local * LKR_USD_RATE * 100) / 100, currency: 'LKR', orders: currentPaidOrders.local },
            international: { total: Math.round(currentRevenue.international * 100) / 100, currency: 'USD', orders: currentPaidOrders.international },
        },
        orders: {
            localCount: currentOrders.local,
            intlCount: currentOrders.international,
            pendingFulfilment,
        },
        series: [...daily.entries()].map(([date, value]) => ({
            date,
            label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)),
            ...roundValues({
                all: value.localRevenueUsd + value.internationalRevenueUsd,
                local: value.localRevenueUsd,
                international: value.internationalRevenueUsd,
            }),
            orders: {
                all: value.localOrders + value.internationalOrders,
                local: value.localOrders,
                international: value.internationalOrders,
            },
        })),
        metrics: {
            today: { revenueUsd: roundValues(todayRevenue), orders: todayOrders },
            current30: { revenueUsd: roundValues(currentRevenue), orders: currentOrders, aovUsd: roundValues(currentAov) },
            changes: {
                revenuePct: changes(currentRevenue, previousRevenue),
                ordersPct: changes(currentOrders, previousOrders),
                aovPct: changes(currentAov, previousAov),
            },
            newCustomers7d: newCustomers,
            // No visitor/session dataset exists, so conversion is intentionally
            // unavailable instead of being synthesized from unrelated records.
            conversionRate: null,
            conversionChangePct: null,
        },
        topProducts: topProductsWithNames,
        lowStockVariants,
        recentAuditLogs,
    });
}

export async function getAuditLogs(req: Request, res: Response) {
    const event = req.query.event as string | undefined;
    const targetType = req.query.targetType as string | undefined;
    const actorId = req.query.actorId as string | undefined;
    const requestedLimit = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 200)
        : 50;
    const cursor = req.query.cursor as string | undefined;

    const logs = await prisma.auditLog.findMany({
        where: {
            ...(event && { event }),
            ...(targetType && { targetType }),
            ...(actorId && { actorId }),
        },
        include: { actor: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasNextPage = logs.length > limit;
    const items = hasNextPage ? logs.slice(0, -1) : logs;

    return res.json({ items, nextCursor: hasNextPage ? items[items.length - 1]?.id : null });
}
