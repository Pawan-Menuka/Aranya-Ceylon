import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Exercise the real controllers AND cart service without importing the server,
// connecting to Prisma, scheduling jobs or starting an HTTP listener.
const db = vi.hoisted(() => ({
    cart: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cartItem: { upsert: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    variant: { findFirst: vi.fn() },
    coupon: { findUnique: vi.fn() },
    $transaction: vi.fn(),
}));
vi.mock('../lib/prisma.js', () => ({ prisma: db }));
vi.mock('@paralleldrive/cuid2', () => ({ createId: () => 'new-guest-token' }));
vi.mock('../middleware/authenticate.js', () => ({ optionalAuth: vi.fn(), requireAuth: vi.fn() }));

import * as controller from './cart.controller.js';
import router from '../routes/cart.routes.js';

const oldActivity = new Date('2025-01-01T00:00:00Z');
const existingCart = {
    id: 'cart-1', guestToken: 'guest-1', userId: null, couponId: null,
    updatedAt: oldActivity, abandonedEmailSentAt: oldActivity,
    items: [{ id: 'item-1', quantity: 2, product: { images: [] }, variant: { price: '10.10' } }],
};
const addBody = { productId: 'product-1', variantId: 'variant-1', quantity: 2 };

function request(overrides: Record<string, unknown> = {}): Request {
    return { cookies: {}, market: 'LOCAL', body: {}, params: { itemId: 'item-1' }, query: {}, ...overrides } as unknown as Request;
}
function response() {
    const res = { status: vi.fn(), json: vi.fn(), send: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn() };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.send.mockReturnValue(res);
    return res as unknown as Response & typeof res;
}
function expectNoCartWrites() {
    expect(db.cart.create).not.toHaveBeenCalled();
    expect(db.cart.upsert).not.toHaveBeenCalled();
    expect(db.cart.update).not.toHaveBeenCalled();
    expect(db.cart.delete).not.toHaveBeenCalled();
    expect(db.cartItem.upsert).not.toHaveBeenCalled();
    expect(db.cartItem.update).not.toHaveBeenCalled();
    expect(db.cartItem.delete).not.toHaveBeenCalled();
    expect(db.cartItem.deleteMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
}

beforeEach(() => {
    vi.resetAllMocks();
    db.cart.findUnique.mockResolvedValue(null);
    db.cart.create.mockResolvedValue({ id: 'new-cart', guestToken: 'new-guest-token', items: [] });
    db.cart.upsert.mockResolvedValue({ id: 'new-cart', items: [] });
    db.cart.update.mockResolvedValue(existingCart);
    db.variant.findFirst.mockResolvedValue({ id: 'variant-1', productId: 'product-1', market: 'BOTH', stock: 0 });
    db.cartItem.upsert.mockResolvedValue({ id: 'new-item', cartId: 'new-cart', ...addBody });
    db.$transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));
});

describe('read-only cart bootstrap', () => {
    it('registers the dedicated GET route alongside the legacy route', () => {
        const routes = router.stack.filter(layer => layer.route).map(layer => layer.route);
        expect(routes).toEqual(expect.arrayContaining([
            expect.objectContaining({ path: '/bootstrap', methods: { get: true } }),
            expect.objectContaining({ path: '/', methods: { get: true } }),
        ]));
    });

    it('returns null for a first visitor with no database call or cookie', async () => {
        const res = response();
        await controller.bootstrapCart(request(), res);
        expect(res.json).toHaveBeenCalledWith({ cart: null, market: 'LOCAL' });
        expect(db.cart.findUnique).not.toHaveBeenCalled();
        expect(res.cookie).not.toHaveBeenCalled();
        expect(res.clearCookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it.each([
        { cookies: { guestCartToken: 'guest-1' } },
        { user: { userId: 'user-1' }, cookies: { guestCartToken: 'guest-1' } },
    ])('restores an existing cart and leaves its activity untouched: %j', async identity => {
        db.cart.findUnique.mockResolvedValue(existingCart);
        const res = response();
        await controller.bootstrapCart(request(identity), res);
        expect(db.cart.findUnique).toHaveBeenCalledWith({
            where: 'user' in identity ? { userId: 'user-1' } : { guestToken: 'guest-1' },
            include: expect.objectContaining({ items: expect.any(Object) }),
        });
        expect(res.json).toHaveBeenCalledWith({ cart: existingCart, market: 'LOCAL' });
        expect(existingCart.updatedAt).toBe(oldActivity);
        expect(existingCart.abandonedEmailSentAt).toBe(oldActivity);
        expect(res.cookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it.each([
        { cookies: { guestCartToken: 'stale' } },
        { user: { userId: 'no-cart' } },
    ])('does not create a missing cart: %j', async identity => {
        const res = response();
        await controller.bootstrapCart(request(identity), res);
        expect(res.json).toHaveBeenCalledWith({ cart: null, market: 'LOCAL' });
        expect(res.cookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it('keeps legacy GET /cart creation and guest-cookie behavior', async () => {
        const res = response();
        await controller.getCart(request(), res);
        expect(db.cart.create).toHaveBeenCalledOnce();
        expect(res.cookie).toHaveBeenCalledWith('guestCartToken', 'new-guest-token', expect.any(Object));
        expect(res.json).toHaveBeenCalledWith({ cart: expect.objectContaining({ id: 'new-cart' }), market: 'LOCAL' });
    });
});

describe('lazy shopping mutations', () => {
    it('sets the first guest cookie only after a validated item write succeeds', async () => {
        const res = response();
        await controller.addItem(request({ body: addBody }), res);
        expect(db.variant.findFirst).toHaveBeenCalledWith({ where: {
            id: 'variant-1', productId: 'product-1', market: { in: ['LOCAL', 'BOTH'] },
        } });
        expect(db.variant.findFirst.mock.invocationCallOrder[0]).toBeLessThan(db.cart.create.mock.invocationCallOrder[0]!);
        expect(db.cartItem.upsert.mock.invocationCallOrder[0]).toBeLessThan(res.cookie.mock.invocationCallOrder[0]!);
        expect(res.cookie).toHaveBeenCalledWith('guestCartToken', 'new-guest-token', expect.objectContaining({
            httpOnly: true, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000,
        }));
        expect(db.cart.update).toHaveBeenCalledWith({ where: { id: 'new-cart' }, data: {
            updatedAt: expect.any(Date), abandonedEmailSentAt: null,
        } });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rejects an invalid body before cart creation or database validation', async () => {
        const res = response();
        await expect(controller.addItem(request({ body: { ...addBody, quantity: 0 } }), res)).rejects.toThrow();
        expect(db.variant.findFirst).not.toHaveBeenCalled();
        expect(res.cookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it('rejects a missing, foreign-product or wrong-market variant before creation', async () => {
        db.variant.findFirst.mockResolvedValue(null);
        const res = response();
        await controller.addItem(request({ body: addBody }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.cookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it('does not set a cookie when the item write fails', async () => {
        db.cartItem.upsert.mockRejectedValue(new Error('item failed'));
        const res = response();
        await expect(controller.addItem(request({ body: addBody }), res)).rejects.toThrow('item failed');
        expect(res.cookie).not.toHaveBeenCalled();
        expect(db.cart.update).not.toHaveBeenCalled();
    });

    it('still returns the committed guest addition and cookie when recovery tracking fails', async () => {
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        db.cart.update.mockRejectedValue(new Error('database details must not be logged'));
        try {
            const res = response();
            await controller.addItem(request({ body: addBody }), res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ item: expect.objectContaining({ id: 'new-item' }) });
            expect(res.cookie).toHaveBeenCalledWith('guestCartToken', 'new-guest-token', expect.any(Object));
            expect(warning).toHaveBeenCalledWith('[cart] Could not record cart activity after an item mutation.');
        } finally { warning.mockRestore(); }
    });

    it.each([0, 3])('does not report a committed quantity %i mutation as failed when activity tracking fails', async quantity => {
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        db.cart.findUnique.mockResolvedValue(existingCart);
        db.cartItem.update.mockResolvedValue({ id: 'item-1', quantity });
        db.cartItem.delete.mockResolvedValue({ id: 'item-1', quantity: 2 });
        db.cart.update.mockRejectedValue(new Error('activity unavailable'));
        try {
            const res = response();
            await controller.updateItem(request({ cookies: { guestCartToken: 'guest-1' }, body: { quantity } }), res);
            expect(res.status).not.toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ item: expect.objectContaining({ id: 'item-1' }) });
        } finally { warning.mockRestore(); }
    });

    it('reuses the signed-in cart even when a guest cookie is present', async () => {
        db.cart.findUnique.mockResolvedValue({ ...existingCart, userId: 'user-1' });
        const res = response();
        await controller.addItem(request({ user: { userId: 'user-1' }, cookies: { guestCartToken: 'guest-1' }, body: addBody }), res);
        expect(db.cart.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
        expect(db.cartItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { cartId_variantId: { cartId: 'cart-1', variantId: 'variant-1' } },
        }));
        expect(db.cart.create).not.toHaveBeenCalled();
        expect(db.cart.upsert).not.toHaveBeenCalled();
        expect(res.cookie).not.toHaveBeenCalled();
    });

    it('resumes a returning guest cart without minting another token', async () => {
        db.cart.findUnique.mockResolvedValue(existingCart);
        const res = response();
        await controller.addItem(request({ cookies: { guestCartToken: 'guest-1' }, body: addBody }), res);
        expect(db.cart.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { guestToken: 'guest-1' } }));
        expect(db.cartItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { cartId_variantId: { cartId: 'cart-1', variantId: 'variant-1' } },
        }));
        expect(db.cart.create).not.toHaveBeenCalled();
        expect(db.cart.upsert).not.toHaveBeenCalled();
        expect(res.cookie).not.toHaveBeenCalled();
    });

    it.each([
        ['update', controller.updateItem, { quantity: 3 }, 404],
        ['remove', controller.removeItem, {}, 204],
        ['clear', controller.clearCart, {}, 204],
        ['remove coupon', controller.removeCoupon, {}, 204],
        ['apply coupon', controller.applyCoupon, { code: 'SAVE10' }, 400],
    ] as const)('%s with no cart does not create or touch one', async (_label, handler, body, status) => {
        const res = response();
        await handler(request({ body, cookies: { guestCartToken: 'stale' } }), res);
        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.cookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it.each([0, 3])('missing/foreign item quantity %i does not update activity', async quantity => {
        db.cart.findUnique.mockResolvedValue(existingCart);
        const missing = Object.assign(new Error('missing'), { code: 'P2025' });
        db.cartItem.update.mockRejectedValue(missing);
        db.cartItem.delete.mockRejectedValue(missing);
        const res = response();
        await controller.updateItem(request({ cookies: { guestCartToken: 'guest-1' }, body: { quantity } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
        const operation = quantity === 0 ? db.cartItem.delete : db.cartItem.update;
        expect(operation).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'item-1', cartId: 'cart-1' } }));
        expect(db.cart.update).not.toHaveBeenCalled();
    });

    it.each([null, { id: 'empty-guest', items: [] }])('a missing/empty guest merge does not create a user cart', async guestCart => {
        db.cart.findUnique.mockResolvedValue(guestCart);
        const res = response();
        await controller.mergeCart(request({ user: { userId: 'user-1' }, cookies: { guestCartToken: 'guest-1' } }), res);
        expectNoCartWrites();
        expect(res.clearCookie).toHaveBeenCalledWith('guestCartToken');
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
});

describe('read-only totals and coupon activity', () => {
    it('computes absent-cart totals without database writes or a guest cookie', async () => {
        const res = response();
        await controller.getCartTotals(request({ query: { shippingMethod: 'EXPRESS', giftWrap: 'true' } }), res);
        expect(res.json).toHaveBeenCalledWith({ totals: expect.objectContaining({
            subtotalCents: 0, shippingCents: 65000, giftCents: 40000, totalCents: 105000, currency: 'LKR',
        }) });
        expect(db.cart.findUnique).not.toHaveBeenCalled();
        expect(res.cookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it('reads existing cart totals without changing recovery activity', async () => {
        db.cart.findUnique.mockResolvedValue(existingCart);
        const res = response();
        await controller.getCartTotals(request({ cookies: { guestCartToken: 'guest-1' } }), res);
        expect(res.json).toHaveBeenCalledWith({ totals: expect.objectContaining({ subtotalCents: 2020 }) });
        expect(res.cookie).not.toHaveBeenCalled();
        expectNoCartWrites();
    });

    it('records valid coupon changes but leaves rejected codes untouched', async () => {
        db.cart.findUnique.mockResolvedValue(existingCart);
        const req = request({ cookies: { guestCartToken: 'guest-1' }, body: { code: 'save10' } });
        const invalid = response();
        db.coupon.findUnique.mockResolvedValue(null);
        await controller.applyCoupon(req, invalid);
        expect(invalid.status).toHaveBeenCalledWith(400);
        expectNoCartWrites();

        db.coupon.findUnique.mockResolvedValue({ id: 'coupon-1', discountType: 'PERCENTAGE', discountValue: 10, expiresAt: null, usageLimit: null });
        const valid = response();
        await controller.applyCoupon(req, valid);
        expect(valid.json).toHaveBeenCalledWith({ discount: expect.objectContaining({ discountCents: 202 }) });
        expect(db.cart.update).toHaveBeenCalledWith({ where: { id: 'cart-1' }, data: {
            couponId: 'coupon-1', updatedAt: expect.any(Date), abandonedEmailSentAt: null,
        } });
    });

    it('removes a stored coupon and records activity without creating a cart', async () => {
        db.cart.findUnique.mockResolvedValue({ ...existingCart, couponId: 'coupon-1' });
        const res = response();
        await controller.removeCoupon(request({ cookies: { guestCartToken: 'guest-1' } }), res);
        expect(db.cart.update).toHaveBeenCalledWith({ where: { id: 'cart-1' }, data: {
            couponId: null, updatedAt: expect.any(Date), abandonedEmailSentAt: null,
        } });
        expect(db.cart.create).not.toHaveBeenCalled();
        expect(db.cart.upsert).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
