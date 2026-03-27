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
        topProducts,
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
        // Top products by order count
        prisma.orderItem.groupBy({
            by: ['productId'],
            _count: { productId: true },
            _sum: { quantity: true },
            orderBy: { _count: { productId: 'desc' } },
            take: 5,
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
        topProducts,
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