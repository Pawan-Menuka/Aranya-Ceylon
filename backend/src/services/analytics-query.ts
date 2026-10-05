import { Prisma } from '@prisma/client';

export type DailyOrderAggregate = {
    date: string;
    market: string;
    currency: string;
    status: string;
    orders: number;
    total: Prisma.Decimal;
};

export type ProductAggregate = { productId: string; units: bigint; revenueUsd: Prisma.Decimal };

// PostgreSQL stores Order.createdAt as a UTC-naive TIMESTAMP(3). Format that
// stored calendar date directly, without applying the session time zone.
export function buildDailyOrderAggregateQuery(seriesStart: Date, tomorrowStart: Date): Prisma.Sql {
    return Prisma.sql`
        SELECT to_char(o."createdAt", 'YYYY-MM-DD') AS date,
               o.market, o.currency, o.status,
               COUNT(*)::int AS orders, SUM(o.total) AS total
        FROM "Order" o
        WHERE o."createdAt" >= ${seriesStart} AND o."createdAt" < ${tomorrowStart}
        GROUP BY date, o.market, o.currency, o.status`;
}

// Historical item prices, not current catalog prices, determine product revenue.
// Convert LKR per line before summing and rank by currency-neutral units.
export function buildTopProductsAggregateQuery(currentStart: Date, tomorrowStart: Date, lkrUsdRate: number): Prisma.Sql {
    return Prisma.sql`
        SELECT oi."productId" AS "productId", SUM(oi.quantity)::bigint AS units,
               SUM(oi.quantity * oi."unitPrice" /
                   CASE WHEN o.currency = 'LKR' THEN ${lkrUsdRate}::numeric ELSE 1 END) AS "revenueUsd"
        FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
        WHERE o.status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
          AND o."createdAt" >= ${currentStart} AND o."createdAt" < ${tomorrowStart}
        GROUP BY oi."productId"
        ORDER BY units DESC, oi."productId" ASC
        LIMIT 5`;
}
