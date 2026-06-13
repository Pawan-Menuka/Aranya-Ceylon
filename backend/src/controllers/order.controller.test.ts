/**
 * Tests for the customer orders endpoints (Phase 3b): scoping to req.user and
 * the IDOR guard on getMyOrder.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = vi.hoisted(() => ({
    orders: [] as any[],
    lastFindManyWhere: null as any,
    lastFindFirstWhere: null as any,
}));

vi.mock('../index.js', () => ({
    prisma: {
        order: {
            findMany: async ({ where }: any) => { store.lastFindManyWhere = where; return store.orders; },
            findFirst: async ({ where }: any) => {
                store.lastFindFirstWhere = where;
                return store.orders.find((o) => o.id === where.id && o.userId === where.userId) ?? null;
            },
        },
    },
}));

import { listMyOrders, getMyOrder } from './order.controller.js';

function mockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = (n: number) => { res.statusCode = n; return res; };
    res.json = (b: unknown) => { res.body = b; return res; };
    return res;
}

beforeEach(() => {
    store.orders = [{ id: 'order_1', userId: 'user_1' }, { id: 'order_2', userId: 'user_1' }];
    store.lastFindManyWhere = null;
    store.lastFindFirstWhere = null;
});

describe('listMyOrders', () => {
    it('returns only the authenticated user\'s orders (scoped by userId)', async () => {
        const res = mockRes();
        await listMyOrders({ user: { userId: 'user_1' } } as any, res);
        expect(store.lastFindManyWhere).toEqual({ userId: 'user_1' });
        expect(res.body.orders).toHaveLength(2);
    });
});

describe('getMyOrder — IDOR guard', () => {
    it('returns the order when it belongs to the user', async () => {
        const res = mockRes();
        await getMyOrder({ user: { userId: 'user_1' }, params: { id: 'order_1' } } as any, res);
        expect(store.lastFindFirstWhere).toEqual({ id: 'order_1', userId: 'user_1' });
        expect(res.statusCode).toBe(200);
        expect(res.body.order.id).toBe('order_1');
    });

    it('404s when the order belongs to another user', async () => {
        const res = mockRes();
        await getMyOrder({ user: { userId: 'attacker' }, params: { id: 'order_1' } } as any, res);
        expect(res.statusCode).toBe(404);
        // The userId is part of the query, so another user's order is simply not found.
        expect(store.lastFindFirstWhere).toEqual({ id: 'order_1', userId: 'attacker' });
    });
});
