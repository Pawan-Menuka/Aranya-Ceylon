import type { Request, Response } from 'express';
import { prisma } from '../../index.js';

export async function getDashboard(_req: Request, res: Response) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Run all aggregations in parallel for speed
    const [
        localRevenue,
        intlRevenue,
        localOrderCount,
        intlOrderCount,
        topLineItems,
        pendingFulfilment,
        lowStockVariants,
        recentAuditLogs,
    ] = await Promise.all([
        // Local revenue (LKR)
        prisma.order.aggregate({
            where: { market: 'LOCAL', status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, createdAt: { gte: thirtyDaysAgo } },
            _sum: { total: true },
            _count: true,
        }),
        // International revenue (USD)
        prisma.order.aggregate({
            where: { market: 'INTERNATIONAL', status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, createdAt: { gte: thirtyDaysAgo } },
            _sum: { total: true },
            _count: true,
        }),
        // Order counts
        prisma.order.count({ where: { market: 'LOCAL', createdAt: { gte: thirtyDaysAgo } } }),
        prisma.order.count({ where: { market: 'INTERNATIONAL', createdAt: { gte: thirtyDaysAgo } } }),
        // Top-product line items in the window. We aggregate in JS (below) because
        // "revenue" must be Σ(quantity × unitPrice) — groupBy can only _sum a single
        // column, which is why the old query summed unitPrice with no quantity and
        // also mixed LKR + USD into one meaningless figure (BUG-15).
        prisma.orderItem.findMany({
            where: { order: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, createdAt: { gte: thirtyDaysAgo } } },
            select: {
                productId: true,
                quantity: true,
                unitPrice: true,
                order: { select: { currency: true } },
            },
        }),
        // Orders needing action
        prisma.order.count({ where: { status: 'PROCESSING' } }),
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
            include: { actor: { select: { name: true, email: true } } },
        }),
    ]);

    // Aggregate per product: units = Σquantity, revenue = Σ(quantity × unitPrice).
    // LKR revenue is normalised to USD (LKR_USD_RATE, default 300) so the single
    // USD figure the dashboard renders is comparable rather than a raw LKR+USD sum;
    // ranking is by units, which is currency-neutral (BUG-15).
    const LKR_USD_RATE = Number(process.env.LKR_USD_RATE ?? 300) || 300;
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
        revenue: {
            local: { total: localRevenue._sum.total, currency: 'LKR', orders: localRevenue._count },
            international: { total: intlRevenue._sum.total, currency: 'USD', orders: intlRevenue._count },
        },
        orders: {
            localCount: localOrderCount,
            intlCount: intlOrderCount,
            pendingFulfilment,
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
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const cursor = req.query.cursor as string | undefined;

    const logs = await prisma.auditLog.findMany({
        where: {
            ...(event && { event }),
            ...(targetType && { targetType }),
            ...(actorId && { actorId }),
        },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasNextPage = logs.length > limit;
    const items = hasNextPage ? logs.slice(0, -1) : logs;

    return res.json({ items, nextCursor: hasNextPage ? items[items.length - 1]?.id : null });
}