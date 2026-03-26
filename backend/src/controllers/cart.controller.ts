import type { Request, Response } from 'express';
import { prisma } from '../index.js';
import * as cartService from '../services/cart.service.js';
import { addToCartSchema, updateCartItemSchema, applyCouponSchema } from '@aranya/shared';

const GUEST_TOKEN_COOKIE = 'guestCartToken';

const guestCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// --- Get cart ---
export async function getCart(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    const result = await cartService.getOrCreateCart(userId, guestToken);

    if ('newGuestToken' in result && result.newGuestToken) {
        res.cookie(GUEST_TOKEN_COOKIE, result.newGuestToken, guestCookieOptions);
    }

    return res.json({ cart: result, market: req.market });
}

// --- Add item (market-validated) ---
export async function addItem(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];
    const market = req.market!;

    const cart = await cartService.getOrCreateCart(userId, guestToken);
    const data = addToCartSchema.parse(req.body);

    try {
        const item = await cartService.addToCart(cart.id, data, market);
        return res.status(201).json({ item });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '';
        if (message === 'VARIANT_NOT_FOUND_FOR_MARKET') {
            return res.status(400).json({
                error: 'This product is not available in your region.',
            });
        }
        if (message === 'INSUFFICIENT_STOCK') {
            return res.status(400).json({ error: 'Not enough stock available.' });
        }
        throw err; // Let asyncHandler catch unexpected errors
    }
}

// --- Update item quantity ---
export async function updateItem(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    const cart = await cartService.getOrCreateCart(userId, guestToken);
    const data = updateCartItemSchema.parse(req.body);
    const item = await cartService.updateCartItem(cart.id, req.params.itemId, data);

    return res.json({ item });
}

// --- Apply coupon ---
export async function applyCoupon(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    const cart = await cartService.getOrCreateCart(userId, guestToken);
    const { code } = applyCouponSchema.parse(req.body);
    const { subtotal } = await cartService.calculateCartTotal(cart.id, req.market!);
    const couponResult = await cartService.validateCoupon(code, subtotal);

    await prisma.cart.update({
        where: { id: cart.id },
        data: { couponId: couponResult.couponId },
    });

    return res.json({ discount: couponResult });
}