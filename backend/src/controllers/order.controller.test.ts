/**
 * Tests for the customer orders endpoints (Phase 3b): scoping to req.user and
 * the IDOR guard on getMyOrder.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = vi.hoisted(() => ({
    orders: [] as any[],
    lastFindManyWhere: null as any,
    lastFindUniqueWhere: null as any,
}));

vi.mock('../index.js', () => ({
    prisma: {
        order: {
            findMany: async ({ where }: any) => {
                store.lastFindManyWhere = where;
                return store.orders.filter((o) => o.userId === where.userId);
            },
            findUnique: async ({ where, select }: any) => {
                store.lastFindUniqueWhere = where;
                const order = store.orders.find((o) => o.id === where.id) ?? null;
                if (!order || !select) return order;
                // Mimic Prisma's select projection so tests can assert exactly
                // which keys reach the handler (the userId-leak this guards against).
                return Object.fromEntries(
                    Object.keys(select).filter((k) => select[k]).map((k) => [k, order[k]]),
                );
            },
        },
    },
}));

import { listMyOrders, getMyOrder, getGuestOrder } from './order.controller.js';

function mockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = (n: number) => { res.statusCode = n; return res; };
    res.json = (b: unknown) => { res.body = b; return res; };
    return res;
}

beforeEach(() => {
    store.orders = [
        { id: 'order_1', userId: 'user_1', status: 'PAID', total: 25, currency: 'USD' },
        { id: 'order_2', userId: 'user_1', status: 'PENDING', total: 10, currency: 'USD' },
        { id: 'order_guest', userId: null, status: 'PENDING', total: 15, currency: 'LKR' },
    ];
    store.lastFindManyWhere = null;
    store.lastFindUniqueWhere = null;
});

describe('listMyOrders', () => {
    it('returns only the authenticated user\'s orders (scoped by userId)', async () => {
        const res = mockRes();
        await listMyOrders({ user: { userId: 'user_1' } } as any, res);
        expect(store.lastFindManyWhere).toEqual({ userId: 'user_1' });
        expect(res.body.orders).toHaveLength(2);
    });
});

describe('getMyOrder — IDOR guard (#29)', () => {
    it('returns the order when it belongs to the user', async () => {
        const res = mockRes();
        await getMyOrder({ user: { userId: 'user_1' }, params: { id: 'order_1' } } as any, res);
        expect(res.statusCode).toBe(200);
        expect(res.body.order.id).toBe('order_1');
    });

    it('403s (not 404) when the order exists but belongs to another user', async () => {
        const res = mockRes();
        await getMyOrder({ user: { userId: 'attacker' }, params: { id: 'order_1' } } as any, res);
        expect(res.statusCode).toBe(403);
    });

    it('404s only when the order truly does not exist', async () => {
        const res = mockRes();
        await getMyOrder({ user: { userId: 'user_1' }, params: { id: 'no-such-order' } } as any, res);
        expect(res.statusCode).toBe(404);
    });
});

describe('getGuestOrder — #29 must never leak userId', () => {
    it('returns only id/status/total/currency for a guest order, no userId key at all', async () => {
        const res = mockRes();
        await getGuestOrder({ params: { id: 'order_guest' } } as any, res);
        expect(res.statusCode).toBe(200);
        expect(res.body.order).toEqual({ id: 'order_guest', status: 'PENDING', total: 15, currency: 'LKR' });
        expect('userId' in res.body.order).toBe(false);
    });

    it('403s an authenticated-user\'s order instead of exposing it', async () => {
        const res = mockRes();
        await getGuestOrder({ params: { id: 'order_1' } } as any, res);
        expect(res.statusCode).toBe(403);
    });

    it('404s for an unknown order id', async () => {
        const res = mockRes();
        await getGuestOrder({ params: { id: 'no-such-order' } } as any, res);
        expect(res.statusCode).toBe(404);
    });
});
