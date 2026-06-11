/**
 * Regression tests for confirmOrderPaid (KNOWN_ISSUES #3 + #4).
 *
 *  #3 — idempotency under concurrency: a second/duplicate webhook delivery
 *       must NOT decrement stock again.
 *  #4 — stock decrement is atomic and never oversells; shortfalls are flagged
 *       while the order still ends up PAID (the customer already paid).
 *
 * Uses an in-memory fake of prisma that models the conditional updateMany
 * semantics the real fix relies on. No DB needed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// State + fake prisma live in a hoisted block so the (hoisted) vi.mock
// factory below can reference them without a TDZ error.
const store = vi.hoisted(() => {
    interface OrderRow { id: string; status: string; userId: string | null; }
    interface ItemRow { orderId: string; variantId: string; quantity: number; }
    interface VariantRow { id: string; stock: number; }
    interface EventRow { orderId: string; status: string; note: string; }

    const s = {
        orders: [] as OrderRow[],
        items: [] as ItemRow[],
        variants: [] as VariantRow[],
        events: [] as EventRow[],
        carts: [] as { id: string; userId: string | null }[],
        cartItemsDeleted: 0,
    };

    const db = {
        order: {
            updateMany: async ({ where, data }: any) => {
                const matched = s.orders.filter((o) =>
                    o.id === where.id && (where.status === undefined || o.status === where.status));
                matched.forEach((o) => { o.status = data.status; });
                return { count: matched.length };
            },
            findUnique: async ({ where, include }: any) => {
                const o = s.orders.find((x) => x.id === where.id);
                if (!o) return null;
                return include?.items ? { ...o, items: s.items.filter((i) => i.orderId === o.id) } : { ...o };
            },
        },
        variant: {
            updateMany: async ({ where, data }: any) => {
                const v = s.variants.find((x) => x.id === where.id);
                const minStock = where.stock?.gte ?? 0; // model `stock: { gte: qty }`
                if (!v || v.stock < minStock) return { count: 0 };
                v.stock -= data.stock.decrement;
                return { count: 1 };
            },
        },
        orderEvent: {
            create: async ({ data }: any) => { s.events.push(data); return data; },
        },
        cart: {
            findUnique: async ({ where }: any) => s.carts.find((c) => c.userId === where.userId) ?? null,
        },
        cartItem: {
            deleteMany: async () => { s.cartItemsDeleted++; return { count: 1 }; },
        },
    };

    return { s, db };
});

vi.mock('../index.js', () => ({
    prisma: {
        ...store.db,
        $transaction: async (fn: (tx: typeof store.db) => Promise<void>) => { await fn(store.db); },
    },
}));

// Stub the gateway services so importing the controller doesn't require their env.
vi.mock('../services/stripe.service.js', () => ({ constructWebhookEvent: vi.fn() }));
vi.mock('../services/payhere.service.js', () => ({ verifyPayHereNotification: vi.fn() }));

import { confirmOrderPaid } from './webhook.controller.js';

const { s } = store;

beforeEach(() => {
    s.orders = [{ id: 'order_1', status: 'PENDING', userId: 'user_1' }];
    s.items = [
        { orderId: 'order_1', variantId: 'var_a', quantity: 2 },
        { orderId: 'order_1', variantId: 'var_b', quantity: 1 },
    ];
    s.variants = [
        { id: 'var_a', stock: 10 },
        { id: 'var_b', stock: 5 },
    ];
    s.events = [];
    s.carts = [{ id: 'cart_1', userId: 'user_1' }];
    s.cartItemsDeleted = 0;
});

describe('confirmOrderPaid — #3 idempotency', () => {
    it('marks the order PAID and decrements stock once', async () => {
        await confirmOrderPaid('order_1', 'pay_ref_1', 'Stripe');

        expect(s.orders[0]!.status).toBe('PAID');
        expect(s.variants.find((v) => v.id === 'var_a')!.stock).toBe(8);
        expect(s.variants.find((v) => v.id === 'var_b')!.stock).toBe(4);
        expect(s.events.filter((e) => e.note.includes('Payment confirmed'))).toHaveLength(1);
        expect(s.cartItemsDeleted).toBe(1);
    });

    it('is a no-op on a duplicate delivery — stock is NOT decremented twice', async () => {
        await confirmOrderPaid('order_1', 'pay_ref_1', 'Stripe');
        await confirmOrderPaid('order_1', 'pay_ref_1', 'Stripe'); // retry

        expect(s.variants.find((v) => v.id === 'var_a')!.stock).toBe(8); // still 8, not 6
        expect(s.events.filter((e) => e.note.includes('Payment confirmed'))).toHaveLength(1);
    });

    it('ignores an unknown order id', async () => {
        await confirmOrderPaid('does_not_exist', 'ref', 'Stripe');
        expect(s.events).toHaveLength(0);
    });
});

describe('confirmOrderPaid — #4 oversell handling', () => {
    it('flags oversold lines but still marks the order PAID', async () => {
        s.variants.find((v) => v.id === 'var_a')!.stock = 1; // only 1, order wants 2

        await confirmOrderPaid('order_1', 'pay_ref_1', 'PayHere');

        expect(s.orders[0]!.status).toBe('PAID');                   // customer paid → PAID
        expect(s.variants.find((v) => v.id === 'var_a')!.stock).toBe(1);  // untouched, not negative
        expect(s.variants.find((v) => v.id === 'var_b')!.stock).toBe(4);  // in-stock line still ships
        expect(s.events.some((e) => e.note.includes('OVERSOLD') && e.note.includes('var_a'))).toBe(true);
    });
});
