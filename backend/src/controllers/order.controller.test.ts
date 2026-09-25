/**
 * Tests for the customer orders endpoints (Phase 3b): scoping to req.user and
 * the IDOR guard on getMyOrder.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestDouble, responseDouble } from '../test/httpDoubles.js';

interface OrderRow {
    [key: string]: string | number | null;
    id: string;
    userId: string | null;
    status: string;
    total: number;
    currency: string;
}
type OrderQuery = {
    where: { id?: string; userId?: string | null };
    select?: Record<string, boolean>;
    take?: number;
};

const store = vi.hoisted(() => ({
    orders: [] as OrderRow[],
    lastFindManyWhere: null as OrderQuery['where'] | null,
    lastFindManyArgs: null as OrderQuery | null,
    lastFindUniqueWhere: null as OrderQuery['where'] | null,
}));

vi.mock('../lib/prisma.js', () => ({
    prisma: {
        order: {
            findMany: async (args: OrderQuery) => {
                store.lastFindManyWhere = args.where;
                store.lastFindManyArgs = args;
                return store.orders.filter((o) => o.userId === args.where.userId);
            },
            findUnique: async ({ where, select }: OrderQuery) => {
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

const mockRes = () => responseDouble<{ orders: OrderRow[]; order: Pick<OrderRow, 'id' | 'status' | 'total' | 'currency'> }>();

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
        await listMyOrders(requestDouble({ user: { userId: 'user_1' } }), res);
        expect(store.lastFindManyWhere).toEqual({ userId: 'user_1' });
        expect(res.body.orders).toHaveLength(2);
    });

    it('bounds the query at 200 rows (perf audit #12 — was fully unbounded)', async () => {
        const res = mockRes();
        await listMyOrders(requestDouble({ user: { userId: 'user_1' } }), res);
        expect(store.lastFindManyArgs?.take).toBe(200);
    });
});

describe('getMyOrder — IDOR guard (#29)', () => {
    it('returns the order when it belongs to the user', async () => {
        const res = mockRes();
        await getMyOrder(requestDouble({ user: { userId: 'user_1' }, params: { id: 'order_1' } }), res);
        expect(res.statusCode).toBe(200);
        expect(res.body.order.id).toBe('order_1');
    });

    it('403s (not 404) when the order exists but belongs to another user', async () => {
        const res = mockRes();
        await getMyOrder(requestDouble({ user: { userId: 'attacker' }, params: { id: 'order_1' } }), res);
        expect(res.statusCode).toBe(403);
    });

    it('404s only when the order truly does not exist', async () => {
        const res = mockRes();
        await getMyOrder(requestDouble({ user: { userId: 'user_1' }, params: { id: 'no-such-order' } }), res);
        expect(res.statusCode).toBe(404);
    });
});

describe('getGuestOrder — #29 must never leak userId', () => {
    it('returns only id/status/total/currency for a guest order, no userId key at all', async () => {
        const res = mockRes();
        await getGuestOrder(requestDouble({ params: { id: 'order_guest' } }), res);
        expect(res.statusCode).toBe(200);
        expect(res.body.order).toEqual({ id: 'order_guest', status: 'PENDING', total: 15, currency: 'LKR' });
        expect('userId' in res.body.order).toBe(false);
    });

    it('403s an authenticated-user\'s order instead of exposing it', async () => {
        const res = mockRes();
        await getGuestOrder(requestDouble({ params: { id: 'order_1' } }), res);
        expect(res.statusCode).toBe(403);
    });

    it('404s for an unknown order id', async () => {
        const res = mockRes();
        await getGuestOrder(requestDouble({ params: { id: 'no-such-order' } }), res);
        expect(res.statusCode).toBe(404);
    });
});
