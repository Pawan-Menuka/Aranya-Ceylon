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

// --- Merge the guest cart into the user's cart (called on login) ---
export async function mergeCart(req: Request, res: Response) {
    const userId = req.user!.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    if (guestToken) {
        await cartService.mergeGuestCart(guestToken, userId);
    }
    // The guest cart (if any) is now merged + deleted; drop the stale cookie.
    res.clearCookie(GUEST_TOKEN_COOKIE);
    return res.json({ ok: true });
}

// --- Clear the whole cart (all items) ---
// Used when the shopper switches store (a cart is single-currency) and for an
// explicit "empty basket". Idempotent: clearing an empty/absent cart is a no-op,
// and it never mints a new guest cart just to empty it (BUG-19c).
export async function clearCart(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    const cart = userId
        ? await prisma.cart.findUnique({ where: { userId }, select: { id: true } })
        : guestToken
            ? await prisma.cart.findUnique({ where: { guestToken }, select: { id: true } })
            : null;

    if (cart) await cartService.clearCart(cart.id);
    return res.status(204).send();
}

// --- Update item quantity ---
export async function updateItem(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    const cart = await cartService.getOrCreateCart(userId, guestToken);
    const data = updateCartItemSchema.parse(req.body);
    const item = await cartService.updateCartItem(cart.id, req.params.itemId!, data);

    if (item === null) return res.status(404).json({ error: 'Cart item not found' });
    return res.json({ item });
}

// --- Remove item ---
export async function removeItem(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    const cart = await cartService.getOrCreateCart(userId, guestToken);
    await cartService.updateCartItem(cart.id, req.params.itemId!, { quantity: 0 });

    return res.status(204).send();
}

// --- Get server-computed cart totals (for checkout display) ---
export async function getCartTotals(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];
    const market = req.market!;
    const shippingMethod = (['STANDARD', 'EXPRESS'].includes(String(req.query.shippingMethod))
        ? (req.query.shippingMethod as 'STANDARD' | 'EXPRESS')
        : 'STANDARD');
    const giftWrap = req.query.giftWrap === 'true';

    const result = await cartService.getOrCreateCart(userId, guestToken);

    if ('newGuestToken' in result && result.newGuestToken) {
        res.cookie(GUEST_TOKEN_COOKIE, result.newGuestToken, guestCookieOptions);
    }

    const totals = await cartService.calculateCartTotal(result.id, market, shippingMethod, giftWrap);
    return res.json({ totals });
}

// --- Apply coupon ---
const COUPON_ERROR_MESSAGES: Record<string, string> = {
    COUPON_NOT_FOUND: 'That coupon code is not valid.',
    COUPON_EXPIRED: 'That coupon has expired.',
    COUPON_USAGE_LIMIT_REACHED: 'That coupon has reached its usage limit.',
};

export async function applyCoupon(req: Request, res: Response) {
    const userId = req.user?.userId;
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];

    const cart = await cartService.getOrCreateCart(userId, guestToken);
    const { code } = applyCouponSchema.parse(req.body);
    const { subtotalCents } = await cartService.calculateCartTotal(cart.id, req.market!);

    try {
        const couponResult = await cartService.validateCoupon(code, subtotalCents);

        await prisma.cart.update({
            where: { id: cart.id },
            data: { couponId: couponResult.couponId },
        });

        return res.json({ discount: couponResult });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '';
        if (message in COUPON_ERROR_MESSAGES) {
            return res.status(400).json({ error: COUPON_ERROR_MESSAGES[message] });
        }
        throw err; // unexpected → asyncHandler / error middleware
    }
}