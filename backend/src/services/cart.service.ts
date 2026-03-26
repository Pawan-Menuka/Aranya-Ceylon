import { prisma } from '../index.js';
import { createId } from '@paralleldrive/cuid2';
import type { Market } from '@prisma/client';
import type { AddToCartInput, UpdateCartItemInput } from '@aranya/shared';

const SHIPPING_RATES = {
    STANDARD: { cost: 4.99, label: 'Standard (5–7 days)' },
    EXPRESS: { cost: 12.99, label: 'Express (2–3 days)' },
};

// Local market flat shipping in LKR
const LOCAL_SHIPPING_RATES = {
    STANDARD: { cost: 350, label: 'Standard delivery (2–5 days)' },
    EXPRESS: { cost: 650, label: 'Express delivery (1–2 days)' },
};

// --- Get or create cart ---
export async function getOrCreateCart(userId?: string, guestToken?: string) {
    if (userId) {
        return prisma.cart.upsert({
            where: { userId },
            update: {},
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
    if (variant.stock < data.quantity) throw new Error('INSUFFICIENT_STOCK');

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
        return prisma.cartItem.delete({
            where: { id: itemId, cartId }, // cartId prevents IDOR
        });
    }

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

// --- Calculate cart total (market-aware currency) ---
export async function calculateCartTotal(
    cartId: string,
    market: Market,
    shippingMethod: 'STANDARD' | 'EXPRESS' = 'STANDARD',
) {
    const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: { include: { variant: true } } },
    });

    if (!cart) throw new Error('CART_NOT_FOUND');

    const subtotal = cart.items.reduce((sum, item) => {
        return sum + Number(item.variant.price) * item.quantity;
    }, 0);

    // Shipping cost is currency-aware
    const rates = market === 'LOCAL' ? LOCAL_SHIPPING_RATES : SHIPPING_RATES;
    const shipping = rates[shippingMethod];
    const total = subtotal + shipping.cost;
    const currency = market === 'LOCAL' ? 'LKR' : 'USD';

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        shippingCost: shipping.cost,
        shippingLabel: shipping.label,
        total: Math.round(total * 100) / 100,
        // Stripe and PayHere both require integer smallest-unit amounts
        totalInCents: Math.round(total * 100),
        currency,
    };
}

// --- Validate and apply coupon ---
export async function validateCoupon(code: string, subtotal: number) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon) throw new Error('COUPON_NOT_FOUND');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('COUPON_EXPIRED');
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        throw new Error('COUPON_USAGE_LIMIT_REACHED');
    }

    const discount = coupon.discountType === 'PERCENTAGE'
        ? subtotal * (Number(coupon.discountValue) / 100)
        : Number(coupon.discountValue);

    return {
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discount: Math.round(discount * 100) / 100,
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