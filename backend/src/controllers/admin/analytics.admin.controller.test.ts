import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDouble, responseDouble } from '../../test/httpDoubles.js';

const state = vi.hoisted(() => ({
    dailyRows: [] as Array<{ date: string; market: string; currency: string; status: string; orders: number; total: number }>,
    topRows: [] as Array<{ productId: string; units: bigint; revenueUsd: number }>,
    products: [] as Array<{ id: string; name: string; slug: string }>,
    queries: [] as Array<{ sql: string; params: unknown[] }>,
    pending: 0,
    newCustomers: 0,
    pendingArgs: undefined as unknown,
    auditArgs: undefined as unknown,
}));

vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        $queryRaw: vi.fn(async (query: { sql: string; values: unknown[] }) => {
            state.queries.push({ sql: query.sql, params: query.values });
            return query.sql.includes('FROM "OrderItem"') ? state.topRows : state.dailyRows;
        }),
        order: { count: vi.fn(async (args: unknown) => { state.pendingArgs = args; return state.pending; }) },
        variant: { findMany: vi.fn(async () => []) },
        product: { findMany: vi.fn(async () => state.products) },
        user: { count: vi.fn(async () => state.newCustomers) },
        auditLog: { findMany: vi.fn(async (args: unknown) => { state.auditArgs = args; return []; }) },
    },
}));

import { clearDashboardCache, getAuditLogs, getDashboard } from './analytics.admin.controller.js';


function field(value: unknown, ...path: string[]): unknown {
    for (const key of path) {
        if (!value || typeof value !== 'object' || !(key in value)) throw new Error(`Missing response field: ${path.join('.')}`);
        value = (value as Record<string, unknown>)[key];
    }
    return value;
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T12:00:00.000Z'));
    state.dailyRows = [];
    state.topRows = [];
    state.products = [];
    state.queries = [];
    state.pending = 0;
    state.newCustomers = 0;
    state.pendingArgs = undefined;
    state.auditArgs = undefined;
    vi.stubEnv('LKR_USD_RATE', '300');
    vi.stubEnv('DASHBOARD_ROLLUPS_ENABLED', 'false');
    clearDashboardCache();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe('admin dashboard analytics', () => {
    it('preserves UTC window boundaries, order counts, and paid revenue by market', async () => {
        state.dailyRows = [
            { date: '2026-10-02', market: 'LOCAL', currency: 'LKR', status: 'PAID', orders: 2, total: 3000 },
            { date: '2026-10-02', market: 'INTERNATIONAL', currency: 'USD', status: 'PENDING', orders: 1, total: 20 },
            { date: '2026-09-03', market: 'INTERNATIONAL', currency: 'USD', status: 'DELIVERED', orders: 1, total: 5 },
            { date: '2026-09-02', market: 'LOCAL', currency: 'LKR', status: 'PAID', orders: 1, total: 600 },
        ];
        state.pending = 4;
        state.newCustomers = 3;

        const res = responseDouble();
        await getDashboard(requestDouble({}), res);

        expect(field(res.body, 'metrics', 'today')).toEqual({
            revenueUsd: { all: 10, local: 10, international: 0 },
            orders: { all: 3, local: 2, international: 1 },
        });
        expect(field(res.body, 'metrics', 'current30', 'revenueUsd')).toEqual({ all: 15, local: 10, international: 5 });
        expect(field(res.body, 'metrics', 'current30', 'orders')).toEqual({ all: 4, local: 2, international: 2 });
        expect(field(res.body, 'metrics', 'changes', 'revenuePct', 'all')).toBe(650);
        expect(field(res.body, 'metrics', 'changes', 'ordersPct', 'all')).toBe(300);
        expect(field(res.body, 'metrics', 'newCustomers7d')).toBe(3);
        expect(field(res.body, 'metrics', 'conversionRate')).toBeNull();
        const series = field(res.body, 'series') as Array<{ orders: { all: number } }>;
        expect(series).toHaveLength(90);
        expect(series.at(-1)?.orders.all).toBe(3);
        expect(field(res.body, 'orders', 'pendingFulfilment')).toBe(4);
        expect(state.pendingArgs).toMatchObject({ where: { status: { in: ['PAID', 'PROCESSING'] } } });
        expect(state.queries[0]!.params).toEqual([new Date('2026-07-05T00:00:00.000Z'), new Date('2026-10-03T00:00:00.000Z')]);
        expect(state.queries[1]!.params).toEqual([300, new Date('2026-09-03T00:00:00.000Z'), new Date('2026-10-03T00:00:00.000Z')]);
    });

    it('excludes refunded and cancelled revenue while retaining their order counts', async () => {
        state.dailyRows = [
            { date: '2026-10-02', market: 'LOCAL', currency: 'LKR', status: 'REFUNDED', orders: 2, total: 6000 },
            { date: '2026-10-02', market: 'INTERNATIONAL', currency: 'USD', status: 'CANCELLED', orders: 1, total: 30 },
            { date: '2026-10-02', market: 'INTERNATIONAL', currency: 'USD', status: 'PROCESSING', orders: 1, total: 8 },
        ];
        const res = responseDouble();
        await getDashboard(requestDouble({}), res);

        expect(field(res.body, 'metrics', 'today', 'orders')).toEqual({ all: 4, local: 2, international: 2 });
        expect(field(res.body, 'metrics', 'today', 'revenueUsd')).toEqual({ all: 8, local: 0, international: 8 });
        expect(field(res.body, 'metrics', 'current30', 'aovUsd')).toEqual({ all: 8, local: 0, international: 8 });
        expect((field(res.body, 'series') as Array<{ orders: { all: number } }>).at(-1)?.orders.all).toBe(4);
        expect(state.queries[1]!.sql).toContain("o.status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')");
    });

    it('returns normalized top-product revenue, deterministic ties, and name fallbacks', async () => {
        state.topRows = [
            { productId: 'a', units: 4n, revenueUsd: 14.125 },
            { productId: 'b', units: 4n, revenueUsd: 9.5 },
        ];
        state.products = [{ id: 'a', name: 'Tea', slug: 'tea' }];
        const res = responseDouble();
        await getDashboard(requestDouble({}), res);

        expect(field(res.body, 'topProducts')).toEqual([
            { productId: 'a', name: 'Tea', slug: 'tea', units: 4, revenue: 14.13 },
            { productId: 'b', name: 'b', slug: '', units: 4, revenue: 9.5 },
        ]);
        expect(state.queries[1]!.sql).toContain('oi.quantity * oi."unitPrice"');
        expect(state.queries[1]!.sql).toContain('ORDER BY units DESC, oi."productId" ASC');
        expect(state.queries[1]!.sql).toContain('LIMIT 5');
    });

    it('returns zero-safe daily and percentage values for an empty database', async () => {
        const res = responseDouble();
        await getDashboard(requestDouble({}), res);

        expect(field(res.body, 'metrics', 'today', 'revenueUsd', 'all')).toBe(0);
        expect(field(res.body, 'metrics', 'changes', 'revenuePct', 'all')).toBe(0);
        expect((field(res.body, 'series') as Array<{ all: number }>).every(day => day.all === 0)).toBe(true);
        expect(field(res.body, 'topProducts')).toEqual([]);
    });
});

describe('admin audit log limit', () => {
    it.each([
        ['-20', 2],
        ['not-a-number', 51],
        ['500.8', 201],
    ])('clamps %s to a safe Prisma take', async (limit, expectedTake) => {
        const res = responseDouble();
        await getAuditLogs(requestDouble({ query: { limit } }), res);
        expect(state.auditArgs).toMatchObject({ take: expectedTake });
    });
});

describe('dashboard cache boundaries', () => {
    it('single-flights concurrent admins and sets a private HTTP policy', async () => {
        const responses = Array.from({ length: 12 }, () => responseDouble());
        await Promise.all(responses.map(res => getDashboard(requestDouble({}), res)));
        expect(state.queries).toHaveLength(2);
        for (const res of responses) expect(res.headers['cache-control']).toBe('private, no-store');
    });
    it('does not reuse a previous UTC day or exchange rate response', async () => {
        const first = responseDouble(); await getDashboard(requestDouble({}), first);
        vi.stubEnv('LKR_USD_RATE', '325');
        const changed = responseDouble(); await getDashboard(requestDouble({}), changed);
        expect(field(changed.body, 'fxRate')).toBe(325);
        expect(state.queries).toHaveLength(4);
        vi.setSystemTime(new Date('2026-10-03T00:00:00.000Z'));
        const nextDay = responseDouble(); await getDashboard(requestDouble({}), nextDay);
        expect(state.queries).toHaveLength(6);
        expect(state.queries[4]!.params).toEqual([new Date('2026-07-06T00:00:00.000Z'), new Date('2026-10-04T00:00:00.000Z')]);
    });
});
