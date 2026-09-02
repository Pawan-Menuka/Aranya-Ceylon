import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    orders: [] as Array<{ market: 'LOCAL' | 'INTERNATIONAL'; currency: 'LKR' | 'USD'; status: string; total: number; createdAt: Date }>,
    pending: 0,
    newCustomers: 0,
    pendingArgs: undefined as unknown,
    auditArgs: undefined as unknown,
}));

vi.mock('../../index.js', () => ({
    prisma: {
        order: {
            findMany: vi.fn(async () => state.orders),
            count: vi.fn(async (args: unknown) => { state.pendingArgs = args; return state.pending; }),
        },
        orderItem: { findMany: vi.fn(async () => []) },
        variant: { findMany: vi.fn(async () => []) },
        product: { findMany: vi.fn(async () => []) },
        user: { count: vi.fn(async () => state.newCustomers) },
        auditLog: {
            findMany: vi.fn(async (args: unknown) => { state.auditArgs = args; return []; }),
        },
    },
}));

import { getAuditLogs, getDashboard } from './analytics.admin.controller.js';

function responseDouble() {
    const res: any = {};
    res.body = undefined;
    res.json = (body: unknown) => { res.body = body; return res; };
    return res;
}

beforeEach(() => {
    state.orders = [];
    state.pending = 0;
    state.newCustomers = 0;
    state.pendingArgs = undefined;
    state.auditArgs = undefined;
    vi.stubEnv('LKR_USD_RATE', '300');
});

describe('admin dashboard analytics', () => {
    it('returns exact today/current metrics and real previous-period deltas', async () => {
        const today = new Date();
        today.setUTCHours(12, 0, 0, 0);
        const previousPeriod = new Date(today);
        previousPeriod.setUTCDate(previousPeriod.getUTCDate() - 30);

        state.orders = [
            { market: 'LOCAL', currency: 'LKR', status: 'PAID', total: 3000, createdAt: today },
            { market: 'INTERNATIONAL', currency: 'USD', status: 'PENDING', total: 20, createdAt: today },
            { market: 'INTERNATIONAL', currency: 'USD', status: 'PAID', total: 5, createdAt: previousPeriod },
        ];
        state.pending = 4;
        state.newCustomers = 3;

        const res = responseDouble();
        await getDashboard({} as any, res);

        expect(res.body.metrics.today).toEqual({
            revenueUsd: { all: 10, local: 10, international: 0 },
            orders: { all: 2, local: 1, international: 1 },
        });
        expect(res.body.metrics.current30.revenueUsd).toEqual({ all: 10, local: 10, international: 0 });
        expect(res.body.metrics.changes.revenuePct.all).toBe(100);
        expect(res.body.metrics.changes.ordersPct.all).toBe(100);
        expect(res.body.metrics.newCustomers7d).toBe(3);
        expect(res.body.metrics.conversionRate).toBeNull();
        expect(res.body.series).toHaveLength(90);
        expect(res.body.series.at(-1).orders.all).toBe(2);
        expect(res.body.orders.pendingFulfilment).toBe(4);
        expect(state.pendingArgs).toMatchObject({ where: { status: { in: ['PAID', 'PROCESSING'] } } });
    });

    it('returns zero-safe daily and percentage values for an empty database', async () => {
        const res = responseDouble();
        await getDashboard({} as any, res);

        expect(res.body.metrics.today.revenueUsd.all).toBe(0);
        expect(res.body.metrics.changes.revenuePct.all).toBe(0);
        expect(res.body.series.every((day: { all: number }) => day.all === 0)).toBe(true);
    });
});

describe('admin audit log limit', () => {
    it.each([
        ['-20', 2],
        ['not-a-number', 51],
        ['500.8', 201],
    ])('clamps %s to a safe Prisma take', async (limit, expectedTake) => {
        const res = responseDouble();
        await getAuditLogs({ query: { limit } } as any, res);
        expect(state.auditArgs).toMatchObject({ take: expectedTake });
    });
});
