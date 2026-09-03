import { prisma } from '../index.js';
import { createId } from '@paralleldrive/cuid2';
import type { Market, Prisma, Coupon } from '@prisma/client';
import type { AddToCartInput, UpdateCartItemInput } from '@aranya/shared';

// All money math is done in INTEGER CENTS to avoid binary-float drift (#7).
// Decimal(10,2) prices convert to cents exactly (×100 of a 2dp number is an
// integer), so every downstream sum/clamp stays exact. We divide back to a
// 2dp number only at the boundaries (DB storage, gateway amounts).

// Shipping rates in the smallest currency unit (USD cents / LKR cents).
const SHIPPING_RATES_CENTS = {
    STANDARD: { cost: 499, label: 'Standard (5–7 days)' },
    EXPRESS: { cost: 1299, label: 'Express (2–3 days)' },
};

// Local market flat shipping in LKR cents.
const LOCAL_SHIPPING_RATES_CENTS = {
    STANDARD: { cost: 35000, label: 'Standard delivery (2–5 days)' },
    EXPRESS: { cost: 65000, label: 'Express delivery (1–2 days)' },
};

// Gift wrap add-on cost in smallest currency units (LKR cents / USD cents).
const GIFT_WRAP_CENTS = { LOCAL: 40000, INTERNATIONAL: 450 }; // Rs 400 / $4.50

// Convert a Decimal/number money value to an exact integer number of cents.
function toCents(value: Prisma.Decimal | number | string): number {
    return Math.round(Number(value) * 100);
}

// Pure discount calculation (no DB). Throws if the coupon can't be applied.
// subtotalCents in, discount in cents out (clamped so it can't exceed subtotal).
function couponDiscountCents(coupon: Coupon, subtotalCents: number): number {
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('COUPON_EXPIRED');
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        throw new Error('COUPON_USAGE_LIMIT_REACHED');
    }
    const raw = coupon.discountType === 'PERCENTAGE'
        ? Math.round((subtotalCents * Number(coupon.discountValue)) / 100)
        : toCents(coupon.discountValue);
    return Math.min(raw, subtotalCents); // never discount below zero
}

// --- Get or create cart ---
export async function getOrCreateCart(userId?: string, guestToken?: string) {
    if (userId) {
        return prisma.cart.upsert({
            where: { userId },
            // Every cart-touching controller action calls this first, so
            // clearing abandonedEmailSentAt here means any activity — not
            // just adding an item — makes the cart eligible for a future
            // recovery email again once it goes quiet (roadmap: abandoned-
            // cart recovery). update:{} would otherwise leave a user who
            // came back and looked, but didn't buy, permanently unreachable.
            update: { abandonedEmailSentAt: null },
            create: { userId },
            include: cartIncludes,
        });
    }

    if (guestToken) {
        return prisma.cart.upsert({
            where: { guestToken },
            update: {},
            create: {
                guestToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            include: cartIncludes,
        });
    }

    // Brand new guest — create cart and return new token to set as cookie
    const newGuestToken = createId();
    const cart = await prisma.cart.create({
        data: {
            guestToken: newGuestToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: cartIncludes,
    });

    return { ...cart, newGuestToken };
}

// --- Add item to cart with market validation ---
// Prevents cross-market items: a LOCAL visitor cannot add an
// INTERNATIONAL variant to their cart, and vice versa.
export async function addToCart(
    cartId: string,
    data: AddToCartInput,
    market: Market,
) {
    // Verify variant exists AND belongs to the current market
    const variant = await prisma.variant.findFirst({
        where: {
            id: data.variantId,
            market: { in: [market, 'BOTH'] },
        },
    });

    if (!variant) throw new Error('VARIANT_NOT_FOUND_FOR_MARKET');

    // P1-2: validate against existing cart qty so repeated adds can't exceed stock.
    // NOTE (GAP-05): this read→check→upsert is not atomic, so two concurrent adds
    // can both pass and push cart qty above stock. That is intentional and safe:
    // the cart is not the inventory ledger. The AUTHORITATIVE guard is the
    // payment-time decrement (webhook.controller: updateMany `where stock >= qty`),
    // which is atomic and can't oversell; checkout also re-validates stock first.
    // The worst case here is a hopeful over-quantity that surfaces as a 409 at
    // checkout, never an actual oversell.
    const existing = await prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId, variantId: data.variantId } },
        select: { quantity: true },
    });
    if (variant.stock < (existing?.quantity ?? 0) + data.quantity) throw new Error('INSUFFICIENT_STOCK');

    // Upsert: if same variant already in cart, increment quantity
    return prisma.cartItem.upsert({
        where: {
            cartId_variantId: { cartId, variantId: data.variantId },
        },
        update: { quantity: { increment: data.quantity } },
        create: {
            cartId,
            productId: data.productId,
            variantId: data.variantId,
            quantity: data.quantity,
        },
        include: {
            product: { include: { images: { take: 1 } } },
            variant: true,
        },
    });
}

// --- Update cart item quantity (0 = remove) ---
export async function updateCartItem(
    cartId: string,
    itemId: string,
    data: UpdateCartItemInput,
) {
    if (data.quantity === 0) {
        // P1-4: treat "already gone" as success (idempotent remove)
        try {
            return await prisma.cartItem.delete({ where: { id: itemId, cartId } });
        } catch (err) {
            if ((err as { code?: string }).code === 'P2025') return null;
            throw err;
        }
    }

    // P1-3: validate stock before updating quantity
    const item = await prisma.cartItem.findUnique({
        where: { id: itemId, cartId },
        include: { variant: { select: { stock: true } } },
    });
    // P1-4: missing/foreign item → caller gets null and the controller sends 404
    if (!item) return null;
    if (item.variant.stock < data.quantity) throw new Error('INSUFFICIENT_STOCK');

    return prisma.cartItem.update({
        where: { id: itemId, cartId },
        data: { quantity: data.quantity },
    });
}

// --- Clear cart ---
export async function clearCart(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId } });
}

// --- Merge guest cart into user cart on login ---
export async function mergeGuestCart(guestToken: string, userId: string) {
    const guestCart = await prisma.cart.findUnique({
        where: { guestToken },
        include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) return;

    const userCart = await prisma.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
    });

    // Move all guest items to user cart atomically
    await prisma.$transaction(
        guestCart.items.map((item) =>
            prisma.cartItem.upsert({
                where: {
                    cartId_variantId: { cartId: userCart.id, variantId: item.variantId },
                },
                update: { quantity: { increment: item.quantity } },
                create: {
                    cartId: userCart.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                },
            }),
        ),
    );

    await prisma.cart.delete({ where: { id: guestCart.id } });
}

// --- Calculate cart total (market-aware currency, applies the cart's coupon) ---
// Returns both integer cents (authoritative; used for gateway amounts) and 2dp
// numbers (for display / Decimal storage). If the cart's stored coupon is no
// longer valid, it's silently dropped (discount 0) rather than failing.
export async function calculateCartTotal(
    cartId: string,
    market: Market,
    shippingMethod: 'STANDARD' | 'EXPRESS' = 'STANDARD',
    giftWrap: boolean = false,
) {
    const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: { include: { variant: true } } },
    });

    if (!cart) throw new Error('CART_NOT_FOUND');

    const subtotalCents = cart.items.reduce(
        (sum, item) => sum + toCents(item.variant.price) * item.quantity,
        0,
    );

    // Shipping cost is currency-aware
    const rates = market === 'LOCAL' ? LOCAL_SHIPPING_RATES_CENTS : SHIPPING_RATES_CENTS;
    const shipping = rates[shippingMethod];
    const currency = market === 'LOCAL' ? 'LKR' : 'USD';

    // Apply the coupon stored on the cart (if any and still valid).
    let discountCents = 0;
    let appliedCouponId: string | null = null;
    if (cart.couponId) {
        const coupon = await prisma.coupon.findUnique({ where: { id: cart.couponId } });
        if (coupon) {
            try {
                discountCents = couponDiscountCents(coupon, subtotalCents);
                appliedCouponId = coupon.id;
            } catch {
                // Coupon expired / limit reached since it was applied — drop it.
            }
        }
    }

    const giftCents = giftWrap
        ? (market === 'LOCAL' ? GIFT_WRAP_CENTS.LOCAL : GIFT_WRAP_CENTS.INTERNATIONAL)
        : 0;
    const totalCents = Math.max(subtotalCents - discountCents, 0) + shipping.cost + giftCents;

    return {
        // Authoritative integer-cents figures
        subtotalCents,
        shippingCents: shipping.cost,
        discountCents,
        giftCents,
        totalCents,
        totalInCents: totalCents, // Stripe/PayHere want integer smallest-units
        // 2dp numbers for display / Decimal storage
        subtotal: subtotalCents / 100,
        shippingCost: shipping.cost / 100,
        discount: discountCents / 100,
        gift: giftCents / 100,
        total: totalCents / 100,
        shippingLabel: shipping.label,
        currency,
        couponId: appliedCouponId,
    };
}

// --- Validate a coupon code against a subtotal (in cents) ---
// Used by the apply-coupon endpoint. Throws COUPON_* on invalid codes.
export async function validateCoupon(code: string, subtotalCents: number) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new Error('COUPON_NOT_FOUND');

    const discountCents = couponDiscountCents(coupon, subtotalCents);

    return {
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountCents,
        discount: discountCents / 100,
    };
}

// Reusable cart include shape
const cartIncludes = {
    items: {
        include: {
            product: { include: { images: { take: 1 } } },
            variant: true,
        },
    },
} satisfies import('@prisma/client').Prisma.CartInclude;