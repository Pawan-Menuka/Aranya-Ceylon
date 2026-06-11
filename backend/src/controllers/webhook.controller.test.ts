/**
 * Regression tests for the payment webhooks (KNOWN_ISSUES #3, #4, #15, #16).
 *
 *  #3  — idempotency: a duplicate delivery must NOT decrement stock again.
 *  #4  — stock decrement is atomic, never oversells; shortfalls are flagged.
 *  #15 — PayHere webhook rejects wrong merchant_id and mismatched amount.
 *  #16 — a failed payment does NOT cancel the order (retry is allowed).
 *
 * Uses an in-memory fake of prisma that models the conditional updateMany
 * semantics the real fixes rely on. No DB needed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = vi.hoisted(() => {
    interface OrderRow {
        id: string; status: string; userId: string | null;
        total: number; currency: string; paymentIntentId: string | null;
        couponId?: string | null;
    }
    interface ItemRow { orderId: string; variantId: string; quantity: number; }
    interface VariantRow { id: string; stock: number; }
    interface EventRow { orderId: string; status: string; note: string; }

    const s = {
        orders: [] as OrderRow[],
        items: [] as ItemRow[],
        variants: [] as VariantRow[],
        events: [] as EventRow[],
        carts: [] as { id: string; userId: string | null }[],
        coupons: [] as { id: string; usageCount: number }[],
        cartItemsDeleted: 0,
    };

    // Does an order row satisfy a `where` of scalar fields?
    const matchOrder = (o: OrderRow, where: any) =>
        (where.id === undefined || o.id === where.id) &&
        (where.status === undefined || o.status === where.status) &&
        (where.paymentIntentId === undefined || o.paymentIntentId === where.paymentIntentId);

    const db = {
        order: {
            updateMany: async ({ where, data }: any) => {
                const matched = s.orders.filter((o) => matchOrder(o, where));
                matched.forEach((o) => { o.status = data.status; });
                return { count: matched.length };
            },
            findUnique: async ({ where, include }: any) => {
                const o = s.orders.find((x) => matchOrder(x, where));
                if (!o) return null;
                return include?.items ? { ...o, items: s.items.filter((i) => i.orderId === o.id) } : { ...o };
            },
        },
        variant: {
            updateMany: async ({ where, data }: any) => {
                const v = s.variants.find((x) => x.id === where.id);
                const minStock = where.stock?.gte ?? 0;
                if (!v || v.stock < minStock) return { count: 0 };
                v.stock -= data.stock.decrement;
                return { count: 1 };
            },
        },
        orderEvent: {
            create: async ({ data }: any) => { s.events.push(data); return data; },
        },
        coupon: {
            update: async ({ where, data }: any) => {
                const c = s.coupons.find((x) => x.id === where.id);
                if (c && data.usageCount?.increment) c.usageCount += data.usageCount.increment;
                return c;
            },
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

vi.mock('../services/stripe.service.js', () => ({ constructWebhookEvent: vi.fn() }));
vi.mock('../services/payhere.service.js', () => ({ verifyPayHereNotification: vi.fn() }));

import { confirmOrderPaid, stripeWebhook, payHereWebhook } from './webhook.controller.js';
import { constructWebhookEvent } from '../services/stripe.service.js';
import { verifyPayHereNotification } from '../services/payhere.service.js';

const { s } = store;

// Minimal Express res double.
function mockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = (n: number) => { res.statusCode = n; return res; };
    res.json = (b: unknown) => { res.body = b; return res; };
    res.send = (b: unknown) => { res.body = b; return res; };
    return res;
}

beforeEach(() => {
    s.orders = [{
        id: 'order_1', status: 'PENDING', userId: 'user_1',
        total: 2500, currency: 'LKR', paymentIntentId: 'pi_123',
    }];
    s.items = [
        { orderId: 'order_1', variantId: 'var_a', quantity: 2 },
        { orderId: 'order_1', variantId: 'var_b', quantity: 1 },
    ];
    s.variants = [{ id: 'var_a', stock: 10 }, { id: 'var_b', stock: 5 }];
    s.events = [];
    s.carts = [{ id: 'cart_1', userId: 'user_1' }];
    s.coupons = [];
    s.cartItemsDeleted = 0;
    process.env.PAYHERE_MERCHANT_ID = 'MERCHANT_OK';
    vi.mocked(verifyPayHereNotification).mockReturnValue(true);
});

// ── #3 / #4 ─────────────────────────────────────────────────────────────
describe('confirmOrderPaid — #3 idempotency', () => {
    it('marks the order PAID and decrements stock once', async () => {
        await confirmOrderPaid('order_1', 'ref', 'Stripe');
        expect(s.orders[0]!.status).toBe('PAID');
        expect(s.variants.find((v) => v.id === 'var_a')!.stock).toBe(8);
        expect(s.cartItemsDeleted).toBe(1);
    });

    it('is a no-op on a duplicate delivery', async () => {
        await confirmOrderPaid('order_1', 'ref', 'Stripe');
        await confirmOrderPaid('order_1', 'ref', 'Stripe');
        expect(s.variants.find((v) => v.id === 'var_a')!.stock).toBe(8); // not 6
        expect(s.events.filter((e) => e.note.includes('Payment confirmed'))).toHaveLength(1);
    });
});

describe('confirmOrderPaid — #4 oversell handling', () => {
    it('flags oversold lines but still marks the order PAID', async () => {
        s.variants.find((v) => v.id === 'var_a')!.stock = 1;
        await confirmOrderPaid('order_1', 'ref', 'PayHere');
        expect(s.orders[0]!.status).toBe('PAID');
        expect(s.variants.find((v) => v.id === 'var_a')!.stock).toBe(1);
        expect(s.events.some((e) => e.note.includes('OVERSOLD'))).toBe(true);
    });
});

describe('confirmOrderPaid — #5 coupon redemption', () => {
    it('increments the coupon usage count once on payment', async () => {
        s.orders[0]!.couponId = 'coupon_1';
        s.coupons = [{ id: 'coupon_1', usageCount: 0 }];

        await confirmOrderPaid('order_1', 'ref', 'Stripe');
        expect(s.coupons[0]!.usageCount).toBe(1);

        // Duplicate delivery must NOT double-count the redemption
        await confirmOrderPaid('order_1', 'ref', 'Stripe');
        expect(s.coupons[0]!.usageCount).toBe(1);
    });

    it('does not touch coupons for an order without one', async () => {
        s.coupons = [{ id: 'coupon_1', usageCount: 0 }];
        await confirmOrderPaid('order_1', 'ref', 'Stripe');
        expect(s.coupons[0]!.usageCount).toBe(0);
    });
});

// ── #15 PayHere cross-checks ────────────────────────────────────────────
function payHereReq(overrides: Record<string, string> = {}) {
    return {
        body: {
            merchant_id: 'MERCHANT_OK',
            order_id: 'order_1',
            payment_id: 'ph_pay_1',
            payhere_amount: '2500.00',
            payhere_currency: 'LKR',
            status_code: '2',
            md5sig: 'sig',
            ...overrides,
        },
    } as any;
}

describe('payHereWebhook — #15 cross-checks', () => {
    it('confirms the order when merchant, amount and currency all match', async () => {
        await payHereWebhook(payHereReq(), mockRes());
        expect(s.orders[0]!.status).toBe('PAID');
    });

    it('rejects a notification for a different merchant', async () => {
        const res = mockRes();
        await payHereWebhook(payHereReq({ merchant_id: 'SOMEONE_ELSE' }), res);
        expect(res.statusCode).toBe(400);
        expect(s.orders[0]!.status).toBe('PENDING'); // never confirmed
    });

    it('rejects a tampered amount', async () => {
        const res = mockRes();
        await payHereWebhook(payHereReq({ payhere_amount: '1.00' }), res);
        expect(res.statusCode).toBe(400);
        expect(s.orders[0]!.status).toBe('PENDING');
    });

    it('rejects a mismatched currency', async () => {
        const res = mockRes();
        await payHereWebhook(payHereReq({ payhere_currency: 'USD' }), res);
        expect(res.statusCode).toBe(400);
        expect(s.orders[0]!.status).toBe('PENDING');
    });

    it('rejects an invalid signature before anything else', async () => {
        vi.mocked(verifyPayHereNotification).mockReturnValue(false);
        const res = mockRes();
        await payHereWebhook(payHereReq(), res);
        expect(res.statusCode).toBe(400);
        expect(s.orders[0]!.status).toBe('PENDING');
    });
});

// ── #16 failed payments don't cancel ────────────────────────────────────
describe('payHereWebhook — #16 failure handling', () => {
    it('leaves the order PENDING on a failed payment (-2) and logs it', async () => {
        await payHereWebhook(payHereReq({ status_code: '-2' }), mockRes());
        expect(s.orders[0]!.status).toBe('PENDING'); // NOT cancelled — retry allowed
        expect(s.events.some((e) => e.note.includes('failed') && e.note.includes('retry'))).toBe(true);
    });

    it('cancels the order on explicit cancellation (-1)', async () => {
        await payHereWebhook(payHereReq({ status_code: '-1' }), mockRes());
        expect(s.orders[0]!.status).toBe('CANCELLED');
    });
});

describe('stripeWebhook — #16 failure handling', () => {
    const stripeReq = () => ({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') }) as any;

    it('does NOT cancel the order on payment_failed — leaves it open for retry', async () => {
        vi.mocked(constructWebhookEvent).mockReturnValue({
            type: 'payment_intent.payment_failed',
            data: { object: { id: 'pi_123', last_payment_error: { message: 'card_declined' } } },
        } as any);

        await stripeWebhook(stripeReq(), mockRes());

        expect(s.orders[0]!.status).toBe('PENDING'); // critical: not CANCELLED
        expect(s.events.some((e) => e.note.includes('card_declined'))).toBe(true);
    });

    it('cancels the order on payment_intent.canceled', async () => {
        vi.mocked(constructWebhookEvent).mockReturnValue({
            type: 'payment_intent.canceled',
            data: { object: { id: 'pi_123' } },
        } as any);

        await stripeWebhook(stripeReq(), mockRes());
        expect(s.orders[0]!.status).toBe('CANCELLED');
    });

    it('confirms the order on payment_intent.succeeded', async () => {
        vi.mocked(constructWebhookEvent).mockReturnValue({
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_123', metadata: { orderId: 'order_1' } } },
        } as any);

        await stripeWebhook(stripeReq(), mockRes());
        expect(s.orders[0]!.status).toBe('PAID');
    });
});
