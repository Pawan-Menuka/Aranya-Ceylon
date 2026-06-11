/**
 * Tests for checkout market/currency re-validation (KNOWN_ISSUES #19).
 *
 * A variant's market/currency can change while a cart sits. Checkout must
 * reject cross-market or mismatched-currency lines (409) and only let a
 * clean, same-currency cart through to a payment intent.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = vi.hoisted(() => ({
    cart: null as any,
    createdOrder: { id: 'order_1' },
}));

vi.mock('../index.js', () => ({
    prisma: {
        cart: { findUnique: async () => store.cart },
        order: {
            create: async () => store.createdOrder,
            update: async () => store.createdOrder,
        },
        address: { create: async () => ({}) },
        user: { findUnique: async () => ({ name: 'Test', email: 't@e.com' }) },
    },
}));

// Stubbed services (the real Stripe service needs an API key at import).
vi.mock('../services/stripe.service.js', () => ({
    createPaymentIntent: vi.fn(async () => ({ id: 'pi_1', client_secret: 'cs_1' })),
}));
vi.mock('../services/payhere.service.js', () => ({
    buildPayHerePayload: vi.fn(() => ({ merchant_id: 'M', amount: '100.00' })),
}));
vi.mock('../services/cart.service.js', () => ({
    calculateCartTotal: vi.fn(async () => ({
        totalInCents: 10000, total: 100, shippingCost: 4.99, discount: 0,
        couponId: null, currency: 'USD',
    })),
}));

import { createIntent } from './checkout.controller.js';

function mockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = (n: number) => { res.statusCode = n; return res; };
    res.json = (b: unknown) => { res.body = b; return res; };
    return res;
}

const reqBody = {
    shippingAddress: { line1: '1 St', city: 'NYC', country: 'US', postalCode: '10001' },
    shippingMethod: 'STANDARD',
    saveAddress: false,
};
const req = () => ({ user: { userId: 'user_1' }, market: 'INTERNATIONAL', body: reqBody }) as any;

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

beforeEach(() => {
    store.cart = cartWith({ market: 'INTERNATIONAL', currency: 'USD' });
});

describe('createIntent — #19 market re-validation', () => {
    it('rejects a cross-market item (variant now LOCAL in an INTL session)', async () => {
        store.cart = cartWith({ market: 'LOCAL', currency: 'LKR' });
        const res = mockRes();
        await createIntent(req(), res);
        expect(res.statusCode).toBe(409);
        expect(res.body.items).toEqual([{ productId: 'p1', variantId: 'v1' }]);
    });

    it('rejects a currency mismatch even when the market tag still fits', async () => {
        // market BOTH passes the market check, but LKR currency in a USD store must not.
        store.cart = cartWith({ market: 'BOTH', currency: 'LKR' });
        const res = mockRes();
        await createIntent(req(), res);
        expect(res.statusCode).toBe(409);
    });

    it('lets a matching INTERNATIONAL/USD cart through to a Stripe intent', async () => {
        store.cart = cartWith({ market: 'INTERNATIONAL', currency: 'USD' });
        const res = mockRes();
        await createIntent(req(), res);
        expect(res.statusCode).toBe(200);
        expect(res.body.gateway).toBe('stripe');
        expect(res.body.clientSecret).toBe('cs_1');
    });

    it('accepts a BOTH/USD variant in an INTERNATIONAL session', async () => {
        store.cart = cartWith({ market: 'BOTH', currency: 'USD' });
        const res = mockRes();
        await createIntent(req(), res);
        expect(res.statusCode).toBe(200);
    });
});
