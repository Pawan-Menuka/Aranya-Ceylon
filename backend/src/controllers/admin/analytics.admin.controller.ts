import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { withCache } from '../../lib/simpleCache.js';
import { buildDailyOrderAggregateQuery, buildTopProductsAggregateQuery } from '../../services/analytics-query.js';
import type { DailyOrderAggregate, ProductAggregate } from '../../services/analytics-query.js';

const REVENUE_STATUSES = new Set(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']);

// The dashboard re-runs a 90-day order scan + aggregation from scratch on
// every load (perf audit #6/#3) — a short TTL means a burst of admin
// pageviews/refreshes shares one computation instead of each re-scanning.
// Not keyed by anything: the response has no per-admin personalization, so a
// single cached value serves every viewer. TTL-only expiry (no active
// invalidation on writes) mirrors how the storefront's own ISR pages already
// tolerate a staleness window — acceptable for an internal analytics view.
const DASHBOARD_CACHE_TTL_MS = 60_000;

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
    const payload = await withCache('admin:dashboard', DASHBOARD_CACHE_TTL_MS, () => computeDashboard());
    return res.json(payload);
}

async function computeDashboard() {
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
        dailyOrders,
        topProducts,
        pendingFulfilment,
        lowStockVariants,
        recentAuditLogs,
        newCustomers,
    ] = await Promise.all([
        // Group at the database boundary. The largest response is bounded by
        // days × markets × currencies × statuses, independent of order volume.
        prisma.$queryRaw<DailyOrderAggregate[]>(buildDailyOrderAggregateQuery(seriesStart, tomorrowStart)),
        // Revenue is the sum of quantity × historical unit price, converted
        // before summing. Refunded/cancelled/pending orders cannot contribute.
        prisma.$queryRaw<ProductAggregate[]>(buildTopProductsAggregateQuery(currentStart, tomorrowStart, LKR_USD_RATE)),
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

    for (const order of dailyOrders) {
        const marketKey = order.market === 'LOCAL' ? 'local' : 'international';
        const createdAt = new Date(`${order.date}T00:00:00Z`);
        const isCurrent = createdAt >= currentStart;
        const isPrevious = createdAt >= previousStart && createdAt < currentStart;
        const isToday = createdAt >= todayStart;
        const earnsRevenue = REVENUE_STATUSES.has(order.status);
        const amount = Number(order.total);
        const revenueUsd = order.currency === 'LKR' ? amount / LKR_USD_RATE : amount;
        const count = Number(order.orders);

        if (isCurrent) {
            currentOrders[marketKey] += count;
            currentOrders.all += count;
            if (earnsRevenue) {
                currentRevenue[marketKey] += revenueUsd;
                currentRevenue.all += revenueUsd;
                currentPaidOrders[marketKey] += count;
                currentPaidOrders.all += count;
            }
        } else if (isPrevious) {
            previousOrders[marketKey] += count;
            previousOrders.all += count;
            if (earnsRevenue) {
                previousRevenue[marketKey] += revenueUsd;
                previousRevenue.all += revenueUsd;
                previousPaidOrders[marketKey] += count;
                previousPaidOrders.all += count;
            }
        }

        if (isToday) {
            todayOrders[marketKey] += count;
            todayOrders.all += count;
            if (earnsRevenue) {
                todayRevenue[marketKey] += revenueUsd;
                todayRevenue.all += revenueUsd;
            }
        }

        const day = daily.get(order.date);
        if (day) {
            if (marketKey === 'local') day.localOrders += count;
            else day.internationalOrders += count;
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

    // Resolve product names for the top-products list in one extra query.
    const productIds = topProducts.map((product) => product.productId);
    const productNames = productIds.length
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, slug: true },
        })
        : [];
    const nameById = Object.fromEntries(productNames.map((p) => [p.id, p]));

    const topProductsWithNames = topProducts.map((product) => ({
        productId: product.productId,
        name: nameById[product.productId]?.name ?? product.productId,
        slug: nameById[product.productId]?.slug ?? '',
        units: Number(product.units),
        revenue: Math.round(Number(product.revenueUsd) * 100) / 100,
    }));

    return {
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
    };
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
