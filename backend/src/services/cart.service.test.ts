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
        carts: [] as any[],
        cartItems: [] as any[],
        variants: new Map<string, any>(),
        couponsById: new Map<string, any>(),
        couponsByCode: new Map<string, any>(),
    };
    return { s };
});

function notFound(): never {
    const e = new Error('NOT_FOUND') as Error & { code: string };
    e.code = 'P2025';
    throw e;
}

vi.mock('../index.js', () => ({
    prisma: {
        cart: {
            // Existing single-cart tests below key off store.s.cart directly
            // (via a plain {id} where) — guestToken/userId lookups added on
            // top for addToCart/mergeGuestCart coverage.
            findUnique: async ({ where }: any) => {
                if (where.guestToken) return store.s.carts.find((c) => c.guestToken === where.guestToken) ?? null;
                if (where.userId) return store.s.carts.find((c) => c.userId === where.userId) ?? null;
                return store.s.cart;
            },
            upsert: async ({ where, update, create }: any) => {
                let c = where.userId
                    ? store.s.carts.find((x) => x.userId === where.userId)
                    : store.s.carts.find((x) => x.guestToken === where.guestToken);
                if (c) Object.assign(c, update);
                else { c = { id: `cart_${store.s.carts.length + 1}`, abandonedEmailSentAt: null, ...create }; store.s.carts.push(c); }
                return c;
            },
            update: async ({ where, data }: any) => {
                const c = store.s.carts.find((x) => x.id === where.id) ?? (store.s.cart?.id === where.id ? store.s.cart : undefined);
                if (!c) notFound();
                Object.assign(c, data);
                return c;
            },
            delete: async ({ where }: any) => {
                store.s.carts = store.s.carts.filter((c) => c.id !== where.id);
            },
        },
        cartItem: {
            upsert: async ({ where, update, create }: any) => {
                const key = where.cartId_variantId;
                let item = store.s.cartItems.find((i) => i.cartId === key.cartId && i.variantId === key.variantId);
                if (item) {
                    if (update.quantity && typeof update.quantity === 'object') item.quantity += update.quantity.increment;
                    else Object.assign(item, update);
                } else {
                    item = { id: `item_${store.s.cartItems.length + 1}`, ...create };
                    store.s.cartItems.push(item);
                }
                return item;
            },
            update: async ({ where, data }: any) => {
                const item = store.s.cartItems.find((i) => i.id === where.id && i.cartId === where.cartId);
                if (!item) notFound();
                Object.assign(item, data);
                return item;
            },
            delete: async ({ where }: any) => {
                const idx = store.s.cartItems.findIndex((i) => i.id === where.id && i.cartId === where.cartId);
                if (idx === -1) notFound();
                return store.s.cartItems.splice(idx, 1)[0];
            },
            deleteMany: async ({ where }: any) => {
                const before = store.s.cartItems.length;
                store.s.cartItems = store.s.cartItems.filter((i) => i.cartId !== where.cartId);
                return { count: before - store.s.cartItems.length };
            },
        },
        variant: {
            findFirst: async ({ where }: any) => store.s.variants.get(where.id) ?? null,
        },
        $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
        coupon: {
            findUnique: async ({ where }: any) =>
                (where.id ? store.s.couponsById.get(where.id) : store.s.couponsByCode.get(where.code)) ?? null,
        },
    },
}));

import { calculateCartTotal, validateCoupon, getOrCreateCart, addToCart, updateCartItem, clearCart, mergeGuestCart } from './cart.service.js';

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
    s.carts = [];
    s.cartItems = [];
    s.variants.clear();
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

describe('getOrCreateCart — clears abandonedEmailSentAt on every touch (roadmap: abandoned-cart recovery)', () => {
    it('clears a previously-set flag on an existing user cart', async () => {
        s.carts = [{ id: 'cart_1', userId: 'user_1', abandonedEmailSentAt: new Date() }];
        const cart = await getOrCreateCart('user_1', undefined);
        expect(cart.abandonedEmailSentAt).toBeNull();
    });

    it('leaves a freshly-created cart with no flag set (nothing to clear yet)', async () => {
        const cart = await getOrCreateCart('user_2', undefined);
        expect(cart.abandonedEmailSentAt).toBeNull();
    });
});

describe('addToCart — #14 the cart is not a reservation', () => {
    it('allows a quantity greater than current live stock (checkout enforces, not the cart)', async () => {
        s.variants.set('v1', { id: 'v1', market: 'BOTH', stock: 2 });
        const item = await addToCart('cart_1', { productId: 'p1', variantId: 'v1', quantity: 5 }, 'INTERNATIONAL');
        expect(item.quantity).toBe(5);
    });

    it('still rejects a variant that does not exist for the shopper\'s market', async () => {
        await expect(
            addToCart('cart_1', { productId: 'p1', variantId: 'missing', quantity: 1 }, 'INTERNATIONAL'),
        ).rejects.toThrow('VARIANT_NOT_FOUND_FOR_MARKET');
    });
});

describe('updateCartItem — #14 the cart is not a reservation', () => {
    it('allows raising quantity above current live stock', async () => {
        s.cartItems.push({ id: 'item_1', cartId: 'cart_1', variantId: 'v1', productId: 'p1', quantity: 1 });
        const item = await updateCartItem('cart_1', 'item_1', { quantity: 50 });
        expect(item?.quantity).toBe(50);
    });

    it('still returns null for a foreign/missing item id (unrelated to stock)', async () => {
        const item = await updateCartItem('cart_1', 'not-a-real-item', { quantity: 3 });
        expect(item).toBeNull();
    });
});

describe('clearCart — #20 also clears abandonedEmailSentAt', () => {
    it('resets the flag on the cart it just emptied', async () => {
        s.carts = [{ id: 'cart_1', userId: 'user_1', abandonedEmailSentAt: new Date() }];
        s.cartItems = [{ id: 'item_1', cartId: 'cart_1', variantId: 'v1', productId: 'p1', quantity: 2 }];

        await clearCart('cart_1');

        expect(s.cartItems).toHaveLength(0);
        expect(s.carts[0]!.abandonedEmailSentAt).toBeNull();
    });
});

describe('mergeGuestCart — #20 also clears abandonedEmailSentAt on the target user cart', () => {
    it('resets the flag on an existing user cart when a guest cart merges into it', async () => {
        s.carts = [
            { id: 'guest_1', guestToken: 'g1', items: [{ productId: 'p1', variantId: 'v1', quantity: 2 }] },
            { id: 'cart_1', userId: 'user_1', abandonedEmailSentAt: new Date() },
        ];

        await mergeGuestCart('g1', 'user_1');

        const userCart = s.carts.find((c) => c.userId === 'user_1');
        expect(userCart?.abandonedEmailSentAt).toBeNull();
    });
});
