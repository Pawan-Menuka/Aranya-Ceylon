import { prisma } from '../lib/prisma.js';
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

// Whether a coupon may be used for an order in this currency. A coupon tied
// to a currency only works there. One with no currency works anywhere — but
// only as a PERCENTAGE: a fixed amount without a currency has no defined
// value, and used to be applied as that many units of whatever currency the
// cart was in (Rs 500 off locally, $500 off abroad).
export function couponAppliesToCurrency(
    coupon: Pick<Coupon, 'discountType'> & { currency?: Coupon['currency'] },
    currency: string,
): boolean {
    const couponCurrency = coupon.currency ?? null;
    if (couponCurrency !== null) return couponCurrency === currency;
    return coupon.discountType === 'PERCENTAGE';
}

// Pure discount calculation (no DB). Throws if the coupon can't be applied.
// subtotalCents in, discount in cents out (clamped so it can't exceed subtotal).
function couponDiscountCents(coupon: Coupon, subtotalCents: number, currency: string): number {
    if (!couponAppliesToCurrency(coupon, currency)) throw new Error('COUPON_WRONG_STORE');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('COUPON_EXPIRED');
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        throw new Error('COUPON_USAGE_LIMIT_REACHED');
    }
    const raw = coupon.discountType === 'PERCENTAGE'
        ? Math.round((subtotalCents * Number(coupon.discountValue)) / 100)
        : toCents(coupon.discountValue);
    return Math.min(raw, subtotalCents); // never discount below zero
}

// Passive storefront reads must not create a cart or restart recovery activity.
// A signed-in cart always takes precedence over any guest cookie.
export async function findExistingCart(userId?: string, guestToken?: string) {
    if (!userId && !guestToken) return null;
    return prisma.cart.findUnique({
        where: userId ? { userId } : { guestToken: guestToken! },
        include: cartIncludes,
    });
}

export async function recordCartActivity(cartId: string) {
    try {
        await prisma.cart.update({
            where: { id: cartId },
            data: { updatedAt: new Date(), abandonedEmailSentAt: null },
        });
    } catch {
        // Item writes have already committed. Recovery tracking must not turn
        // a successful add into an error before its new guest cookie is issued,
        // or make quantity/removal clients roll back a committed basket change.
        // Keep diagnostics free of cart/user IDs and database error contents.
        console.warn('[cart] Could not record cart activity after an item mutation.');
    }
}

// --- Get or create cart (legacy GET /cart contract) ---
export async function getOrCreateCart(userId?: string, guestToken?: string) {
    if (userId) {
        return prisma.cart.upsert({
            where: { userId },
            // Preserve legacy GET /cart's recovery reset. The storefront uses
            // findExistingCart instead; shopping mutations record activity.
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
    await validateCartVariant(data, market);
    return insertCartItem(cartId, data);
}

// Validate before minting a cart/token for a shopper's first add.
export async function addToShopperCart(
    userId: string | undefined,
    guestToken: string | undefined,
    data: AddToCartInput,
    market: Market,
) {
    await validateCartVariant(data, market);
    const cart = await findExistingCart(userId, guestToken)
        ?? await getOrCreateCart(userId, guestToken);
    const item = await insertCartItem(cart.id, data);
    return { item, newGuestToken: 'newGuestToken' in cart ? cart.newGuestToken : undefined };
}

async function validateCartVariant(data: AddToCartInput, market: Market) {
    // Verify the variant exists, belongs to the current market, is priced in
    // this store's currency, and its product is still on sale.
    //  • Currency: a BOTH-market variant has a single currency, so it used to
    //    be addable in the other store and then always refused at checkout.
    //  • Status: archived products stayed purchasable through existing carts
    //    or a direct API call. DRAFT is allowed — gift sets are sold through
    //    deliberately catalog-hidden DRAFT products.
    const variant = await prisma.variant.findFirst({
        where: {
            id: data.variantId,
            productId: data.productId,
            market: { in: [market, 'BOTH'] },
            currency: market === 'LOCAL' ? 'LKR' : 'USD',
            product: { status: { not: 'ARCHIVED' } },
        },
    });

    if (!variant) throw new Error('VARIANT_NOT_FOUND_FOR_MARKET');
}

async function insertCartItem(cartId: string, data: AddToCartInput) {
    // Not checked against live stock: the cart is not a reservation, so a
    // quantity here is only ever "hopeful." The AUTHORITATIVE, atomic guard is
    // the stock reservation at checkout (checkout.controller createIntent),
    // which decrements under a `where stock >= qty` and can't oversell — this
    // is the only place that needs to be race-safe. Blocking here would just
    // mean a shopper can't add an item back in stock by the time they check out.

    // Upsert: if same variant already in cart, increment quantity
    const item = await prisma.cartItem.upsert({
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
    await recordCartActivity(cartId);
    return item;
}

// --- Update cart item quantity (0 = remove) ---
export async function updateCartItem(
    cartId: string,
    itemId: string,
    data: UpdateCartItemInput,
) {
    if (data.quantity === 0) {
        // P1-4: treat "already gone" as success (idempotent remove)
        let item;
        try {
            item = await prisma.cartItem.delete({ where: { id: itemId, cartId } });
        } catch (err) {
            if ((err as { code?: string }).code === 'P2025') return null;
            throw err;
        }
        await recordCartActivity(cartId);
        return item;
    }

    // Not checked against live stock — same reasoning as addToCart above;
    // checkout is the sole atomic, authoritative enforcement point.
    let item;
    try {
        item = await prisma.cartItem.update({
            where: { id: itemId, cartId },
            data: { quantity: data.quantity },
        });
    } catch (err) {
        // P1-4: missing/foreign item → caller gets null and the controller sends 404
        if ((err as { code?: string }).code === 'P2025') return null;
        throw err;
    }
    await recordCartActivity(cartId);
    return item;
}

// --- Clear cart ---
export async function clearCart(cartId: string) {
    // Explicit basket changes renew recovery activity alongside the deletion.
    const [deleted] = await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { cartId } }),
        prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date(), abandonedEmailSentAt: null } }),
    ]);
    return deleted;
}

// --- Merge guest cart into user cart on login ---
export async function mergeGuestCart(guestToken: string, userId: string) {
    const guestCart = await prisma.cart.findUnique({
        where: { guestToken },
        include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) return;

    // One transaction that starts by claiming the guest cart. Two sign-ins
    // finishing together (two tabs) used to both add the guest lines — doubling
    // every quantity — and the second then failed deleting the already-deleted
    // cart. Deleting first means exactly one merge proceeds; the other sees
    // nothing to claim. The lines were read above, so the cascade is harmless.
    await prisma.$transaction(async (tx) => {
        const claimed = await tx.cart.deleteMany({ where: { id: guestCart.id } });
        if (claimed.count === 0) return;

        // A merge with real items renews the target cart's shopping activity.
        const userCart = await tx.cart.upsert({
            where: { userId },
            update: { updatedAt: new Date(), abandonedEmailSentAt: null },
            create: { userId },
        });

        for (const item of guestCart.items) {
            const key = { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } };
            const existing = await tx.cartItem.findUnique({ where: key, select: { quantity: true } });
            // Same per-line ceiling the cart endpoints enforce.
            const quantity = Math.min(MAX_LINE_QUANTITY, (existing?.quantity ?? 0) + item.quantity);
            await tx.cartItem.upsert({
                where: key,
                update: { quantity },
                create: { cartId: userCart.id, productId: item.productId, variantId: item.variantId, quantity },
            });
        }
    });
}

// Mirrors the 99 cap in addToCartSchema / updateCartItemSchema (@aranya/shared).
const MAX_LINE_QUANTITY = 99;

// --- Calculate cart total (market-aware currency, applies the cart's coupon) ---
// Returns both integer cents (authoritative; used for gateway amounts) and 2dp
// numbers (for display / Decimal storage). If the cart's stored coupon is no
// longer valid, it's silently dropped (discount 0) rather than failing.
export async function calculateCartTotal(
    cartId: string | null,
    market: Market,
    shippingMethod: 'STANDARD' | 'EXPRESS' = 'STANDARD',
    giftWrap: boolean = false,
) {
    const cart = cartId === null ? { items: [], couponId: null } : await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: { include: { variant: true } } },
    });

    if (!cart) throw new Error('CART_NOT_FOUND');

    return calculateTotalsForLines(cart.items, cart.couponId, market, shippingMethod, giftWrap);
}

// The minimum a line needs to be priced — satisfied by any loaded cart item.
type PricedCartLine = { quantity: number; variant: { price: Prisma.Decimal | number | string } };

// --- Calculate totals for lines the caller has ALREADY loaded ---
// Checkout must price the exact lines it reserves stock for and snapshots onto
// the order. Re-reading the cart to price it (as calculateCartTotal does) let a
// concurrent quantity change land between the two reads, producing an order
// for N units charged at fewer. Only the coupon is read here; the lines are
// never re-fetched.
export async function calculateTotalsForLines(
    lines: PricedCartLine[],
    couponId: string | null,
    market: Market,
    shippingMethod: 'STANDARD' | 'EXPRESS' = 'STANDARD',
    giftWrap: boolean = false,
) {
    const cart = { items: lines, couponId };

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
                discountCents = couponDiscountCents(coupon, subtotalCents, currency);
                appliedCouponId = coupon.id;
            } catch {
                // Coupon expired / limit reached / not valid in this store — drop it.
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
export async function validateCoupon(code: string, subtotalCents: number, currency: string) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new Error('COUPON_NOT_FOUND');

    const discountCents = couponDiscountCents(coupon, subtotalCents, currency);

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
