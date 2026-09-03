/**
 * Tests for checkout: market re-validation (#19), guest checkout (#17), stub
 * vs live payment routing, and stock reservation at checkout (roadmap) — the
 * atomic reserve-then-create-order transaction that replaced a read-only
 * stock check, closing the race where two concurrent checkouts for the last
 * unit could both pass validation and only one would fail at payment time.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const store = vi.hoisted(() => ({
    cart: null as any,
    createdOrder: { id: 'order_1' },
    lastOrderData: null as any,
    // Live stock, separate from cart.items[].variant.stock (a moments-old
    // cached read) — mutated only by the atomic tx.variant.updateMany below,
    // so tests can simulate a race: the cache says available, live stock
    // doesn't. Keyed by variantId.
    variantStock: {} as Record<string, number>,
}));

const couponStore = vi.hoisted(() => ({
    coupon: null as any,
    cartUpdated: null as any,
}));

vi.mock('../index.js', () => ({
    prisma: {
        cart: {
            findUnique: async () => store.cart,
            update: async (args: any) => { couponStore.cartUpdated = args.data; return store.cart; },
        },
        coupon: { findUnique: async () => couponStore.coupon },
        // Used only to build a helpful error response AFTER a rolled-back
        // reservation — see the StockReservationError catch block.
        variant: {
            findMany: async ({ where }: any) => {
                const ids: string[] = where.id.in;
                return ids.map((id) => ({ id, stock: store.variantStock[id] ?? 0 }));
            },
        },
        order: {
            update: async () => store.createdOrder,
            findUnique: async () => store.createdOrder,
        },
        address: { create: async () => ({}) },
        user: { findUnique: async () => ({ name: 'Test', email: 't@e.com' }) },
        // Models the real atomic reserve-then-create transaction: each
        // tx.variant.updateMany call decrements live stock only if enough is
        // available, and any failure part-way through must be observable as
        // "nothing committed" (tests assert stock is unchanged after a 409).
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
            const snapshot = { ...store.variantStock };
            const tx = {
                variant: {
                    updateMany: async ({ where, data }: any) => {
                        const cur = store.variantStock[where.id] ?? 0;
                        const minStock = where.stock?.gte ?? 0;
                        if (cur < minStock) return { count: 0 };
                        store.variantStock[where.id] = cur - data.stock.decrement;
                        return { count: 1 };
                    },
                },
                order: {
                    create: async (args: any) => { store.lastOrderData = args.data; return store.createdOrder; },
                },
            };
            try {
                return await fn(tx);
            } catch (err) {
                store.variantStock = snapshot; // roll back partial decrements
                throw err;
            }
        },
    },
}));

vi.mock('../services/stripe.service.js', () => ({
    createPaymentIntent: vi.fn(async () => ({ id: 'pi_1', client_secret: 'cs_1' })),
}));
vi.mock('../services/payhere.service.js', () => ({
    buildPayHerePayload: vi.fn(() => ({ merchant_id: 'M', amount: '100.00' })),
    PAYHERE_CHECKOUT_URL: 'https://sandbox.payhere.lk/pay/checkout',
}));
vi.mock('../services/cart.service.js', () => ({
    calculateCartTotal: vi.fn(async () => ({
        totalInCents: 10000, total: 100, shippingCost: 4.99, discount: 0,
        couponId: null, currency: 'USD',
    })),
}));
vi.mock('./webhook.controller.js', () => ({ confirmOrderPaid: vi.fn() }));

import { createIntent, stubComplete } from './checkout.controller.js';
import { confirmOrderPaid } from './webhook.controller.js';

function mockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = (n: number) => { res.statusCode = n; return res; };
    res.json = (b: unknown) => { res.body = b; return res; };
    return res;
}

const intlAddress = { firstName: 'Jane', lastName: 'Doe', line1: '1 St', city: 'NYC', country: 'US', postalCode: '10001' };
const userReq = ({ body = {}, ...rest }: any = {}) =>
    ({
        user: { userId: 'user_1' },
        market: 'INTERNATIONAL',
        cookies: {},
        ...rest,
        body: { shippingAddress: intlAddress, shippingMethod: 'STANDARD', saveAddress: false, ...body },
    }) as any;

function cartWith(variant: { market: string; currency: string }) {
    return {
        id: 'cart_1', couponId: null,
        items: [{
            productId: 'p1', variantId: 'v1', quantity: 1,
            variant: { id: 'v1', stock: 10, price: '50.00', ...variant },
            product: { id: 'p1' },
        }],
    };
}

function multiItemCart() {
    return {
        id: 'cart_1', couponId: null,
        items: [
            {
                productId: 'p1', variantId: 'v1', quantity: 1,
                variant: { id: 'v1', stock: 10, price: '50.00', market: 'INTERNATIONAL', currency: 'USD' },
                product: { id: 'p1' },
            },
            {
                productId: 'p2', variantId: 'v2', quantity: 1,
                variant: { id: 'v2', stock: 10, price: '25.00', market: 'INTERNATIONAL', currency: 'USD' },
                product: { id: 'p2' },
            },
        ],
    };
}

beforeEach(() => {
    store.cart = cartWith({ market: 'INTERNATIONAL', currency: 'USD' });
    store.lastOrderData = null;
    store.variantStock = { v1: 10, v2: 10 };
    vi.unstubAllEnvs(); // default → stub payments
    vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

describe('createIntent — #19 market re-validation', () => {
    it('rejects a cross-market item', async () => {
        store.cart = cartWith({ market: 'LOCAL', currency: 'LKR' });
        const res = mockRes();
        await createIntent(userReq(), res);
        expect(res.statusCode).toBe(409);
        expect(res.body.items).toEqual([{ productId: 'p1', variantId: 'v1' }]);
    });

    it('rejects a currency mismatch even when the market tag fits', async () => {
        store.cart = cartWith({ market: 'BOTH', currency: 'LKR' });
        const res = mockRes();
        await createIntent(userReq(), res);
        expect(res.statusCode).toBe(409);
    });

    it('lets a matching INTERNATIONAL/USD cart through', async () => {
        const res = mockRes();
        await createIntent(userReq(), res);
        expect(res.statusCode).toBe(200);
        expect(res.body.orderId).toBe('order_1');
    });
});

describe('createIntent — #17 guest checkout', () => {
    const guestReq = (body: any = {}) =>
        ({ user: undefined, market: 'INTERNATIONAL', cookies: { guestCartToken: 'g1' }, body: { shippingAddress: intlAddress, shippingMethod: 'STANDARD', ...body } }) as any;

    it('rejects a guest with no email', async () => {
        const res = mockRes();
        await createIntent(guestReq(), res);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/email/i);
    });

    it('creates a guest order (userId null + guestEmail) when email is provided', async () => {
        const res = mockRes();
        await createIntent(guestReq({ guestEmail: 'guest@example.com' }), res);
        expect(res.statusCode).toBe(200);
        expect(store.lastOrderData.userId).toBeNull();
        expect(store.lastOrderData.guestEmail).toBe('guest@example.com');
    });

    it('does not store guestEmail for an authenticated user', async () => {
        const res = mockRes();
        await createIntent(userReq({ body: { guestEmail: 'ignored@example.com' } }), res);
        expect(store.lastOrderData.userId).toBe('user_1');
        expect(store.lastOrderData.guestEmail).toBeNull();
    });
});

describe('createIntent — payment mode routing', () => {
    it('returns gateway "stub" by default (no PAYMENTS_MODE)', async () => {
        const res = mockRes();
        await createIntent(userReq(), res);
        expect(res.body.provider).toBe('stub');
    });

    it('routes INTERNATIONAL to Stripe in live mode', async () => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        const res = mockRes();
        await createIntent(userReq(), res);
        expect(res.body.provider).toBe('stripe');
        expect(res.body.clientSecret).toBe('cs_1');
    });

    it('routes LOCAL to PayHere in live mode', async () => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        store.cart = cartWith({ market: 'LOCAL', currency: 'LKR' });
        const res = mockRes();
        await createIntent(userReq({ market: 'LOCAL', body: { shippingAddress: { ...intlAddress, country: 'LK' } } }), res);
        expect(res.body.provider).toBe('payhere');
    });
});

describe('createIntent — P1-1 couponCode at checkout', () => {
    beforeEach(() => { couponStore.coupon = null; couponStore.cartUpdated = null; });

    it('returns 400 for an unknown coupon code', async () => {
        couponStore.coupon = null;
        const res = mockRes();
        await createIntent(userReq({ body: { couponCode: 'BAD' } }), res);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/not valid/i);
    });

    it('returns 400 for an expired coupon', async () => {
        couponStore.coupon = { id: 'c1', expiresAt: new Date('2000-01-01'), usageLimit: null, usageCount: 0 };
        const res = mockRes();
        await createIntent(userReq({ body: { couponCode: 'EXP' } }), res);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/expired/i);
    });

    it('persists a valid couponCode to the cart and proceeds', async () => {
        couponStore.coupon = { id: 'c1', expiresAt: null, usageLimit: null, usageCount: 0 };
        const res = mockRes();
        await createIntent(userReq({ body: { couponCode: 'SAVE10' } }), res);
        expect(res.statusCode).toBe(200);
        expect(couponStore.cartUpdated).toEqual({ couponId: 'c1' });
    });
});

describe('createIntent — stock reservation at checkout (roadmap)', () => {
    it('reserves (decrements) live stock atomically as part of order creation', async () => {
        const res = mockRes();
        await createIntent(userReq(), res);
        expect(res.statusCode).toBe(200);
        expect(store.variantStock.v1).toBe(9); // 10 - 1
    });

    it('rejects with 409 when live stock is insufficient, even though the cached cart read looked fine', async () => {
        // The cart's own cached variant.stock still says 10 (loaded moments
        // ago) — only the live store, checked atomically inside the
        // transaction, reflects that someone else just took the last unit.
        store.variantStock.v1 = 0;
        const res = mockRes();
        await createIntent(userReq(), res);

        expect(res.statusCode).toBe(409);
        expect(res.body.items).toEqual([
            { productId: 'p1', variantId: 'v1', requested: 1, available: 0 },
        ]);
        expect(store.lastOrderData).toBeNull(); // no order was created
    });

    it('rolls back an already-reserved line when a LATER line in the same order fails', async () => {
        store.cart = multiItemCart();
        store.variantStock = { v1: 10, v2: 0 }; // v1 has stock, v2 doesn't

        const res = mockRes();
        await createIntent(userReq(), res);

        expect(res.statusCode).toBe(409);
        expect(store.variantStock.v1).toBe(10); // NOT left decremented
        expect(store.lastOrderData).toBeNull();
    });
});

describe('stubComplete', () => {
    it('confirms the order via confirmOrderPaid in stub mode', async () => {
        const res = mockRes();
        await stubComplete({ body: { orderId: 'order_1' } } as any, res);
        expect(res.statusCode).toBe(200);
        expect(confirmOrderPaid).toHaveBeenCalledWith('order_1', expect.stringContaining('STUB-'), 'Stub');
    });

    it('is disabled (404) in live mode', async () => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        const res = mockRes();
        await stubComplete({ body: { orderId: 'order_1' } } as any, res);
        expect(res.statusCode).toBe(404);
        expect(confirmOrderPaid).not.toHaveBeenCalled();
    });
});
