/**
 * Tests for integer-cents money math + coupon application (KNOWN_ISSUES #7 + #5).
 *
 *  #7 — totals are computed in integer cents, so float artefacts like
 *       19.99 * 3 = 59.970000000000006 never reach a price.
 *  #5 — a coupon stored on the cart is applied to the total; invalid/expired
 *       coupons are dropped rather than blocking checkout.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = vi.hoisted(() => {
    const s = {
        cart: null as any,
        couponsById: new Map<string, any>(),
        couponsByCode: new Map<string, any>(),
    };
    return { s };
});

vi.mock('../index.js', () => ({
    prisma: {
        cart: {
            findUnique: async () => store.s.cart,
        },
        coupon: {
            findUnique: async ({ where }: any) =>
                (where.id ? store.s.couponsById.get(where.id) : store.s.couponsByCode.get(where.code)) ?? null,
        },
    },
}));

import { calculateCartTotal, validateCoupon } from './cart.service.js';

const { s } = store;

function setCart(prices: (number | string)[], couponId: string | null = null) {
    s.cart = {
        id: 'cart_1',
        couponId,
        items: prices.map((price, i) => ({
            quantity: 1,
            variant: { id: `v${i}`, price },
        })),
    };
}

beforeEach(() => {
    s.cart = null;
    s.couponsById.clear();
    s.couponsByCode.clear();
});

describe('calculateCartTotal — #7 integer-cents math', () => {
    it('sums prices exactly, with no float drift', async () => {
        // 10.10 + 20.20 = 30.30 (float gives 30.299999999999997)
        setCart(['10.10', '20.20']);
        const r = await calculateCartTotal('cart_1', 'INTERNATIONAL');
        expect(r.subtotalCents).toBe(3030);
        expect(r.subtotal).toBe(30.3);
    });

    it('handles repeated quantities without drift (19.99 × 3)', async () => {
        s.cart = {
            id: 'cart_1', couponId: null,
            items: [{ quantity: 3, variant: { id: 'v0', price: '19.99' } }],
        };
        const r = await calculateCartTotal('cart_1', 'INTERNATIONAL');
        expect(r.subtotalCents).toBe(5997); // not 5997.0000001
        expect(r.subtotal).toBe(59.97);
    });

    it('adds market-aware shipping (LKR local vs USD intl)', async () => {
        setCart(['1000.00']);
        const intl = await calculateCartTotal('cart_1', 'INTERNATIONAL', 'STANDARD');
        expect(intl.shippingCents).toBe(499);
        expect(intl.totalCents).toBe(100000 + 499);
        expect(intl.currency).toBe('USD');

        const local = await calculateCartTotal('cart_1', 'LOCAL', 'EXPRESS');
        expect(local.shippingCents).toBe(65000);
        expect(local.currency).toBe('LKR');
    });
});

describe('calculateCartTotal — #5 coupon application', () => {
    it('applies a percentage coupon', async () => {
        setCart(['59.97'], 'coupon_pct');
        s.couponsById.set('coupon_pct', {
            id: 'coupon_pct', code: 'SAVE10', discountType: 'PERCENTAGE',
            discountValue: 10, usageLimit: null, usageCount: 0, expiresAt: null,
        });
        const r = await calculateCartTotal('cart_1', 'INTERNATIONAL', 'STANDARD');
        expect(r.discountCents).toBe(600);            // round(5997 * 10 / 100)
        expect(r.totalCents).toBe(5997 - 600 + 499);  // subtotal − discount + shipping
        expect(r.couponId).toBe('coupon_pct');
    });

    it('clamps a fixed coupon so the discount never exceeds the subtotal', async () => {
        setCart(['59.97'], 'coupon_big');
        s.couponsById.set('coupon_big', {
            id: 'coupon_big', code: 'HUGE', discountType: 'FIXED_AMOUNT',
            discountValue: 1000, usageLimit: null, usageCount: 0, expiresAt: null,
        });
        const r = await calculateCartTotal('cart_1', 'INTERNATIONAL', 'STANDARD');
        expect(r.discountCents).toBe(5997);   // clamped to subtotal, not 100000
        expect(r.totalCents).toBe(499);       // only shipping remains
    });

    it('silently drops an expired coupon instead of failing', async () => {
        setCart(['59.97'], 'coupon_old');
        s.couponsById.set('coupon_old', {
            id: 'coupon_old', code: 'OLD', discountType: 'PERCENTAGE',
            discountValue: 50, usageLimit: null, usageCount: 0,
            expiresAt: new Date(Date.now() - 1000),
        });
        const r = await calculateCartTotal('cart_1', 'INTERNATIONAL', 'STANDARD');
        expect(r.discountCents).toBe(0);
        expect(r.couponId).toBeNull();
    });
});

describe('validateCoupon', () => {
    it('returns the discount in cents for a valid code', async () => {
        s.couponsByCode.set('SAVE10', {
            id: 'c1', code: 'SAVE10', discountType: 'PERCENTAGE',
            discountValue: 10, usageLimit: null, usageCount: 0, expiresAt: null,
        });
        const r = await validateCoupon('SAVE10', 5997);
        expect(r.discountCents).toBe(600);
        expect(r.discount).toBe(6);
    });

    it('throws COUPON_NOT_FOUND for an unknown code', async () => {
        await expect(validateCoupon('NOPE', 5997)).rejects.toThrow('COUPON_NOT_FOUND');
    });

    it('throws COUPON_USAGE_LIMIT_REACHED when the limit is hit', async () => {
        s.couponsByCode.set('MAXED', {
            id: 'c2', code: 'MAXED', discountType: 'PERCENTAGE',
            discountValue: 10, usageLimit: 5, usageCount: 5, expiresAt: null,
        });
        await expect(validateCoupon('MAXED', 5997)).rejects.toThrow('COUPON_USAGE_LIMIT_REACHED');
    });
});
