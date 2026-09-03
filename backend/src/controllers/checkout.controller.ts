import type { Request, Response } from 'express';
import { prisma } from '../index.js';
import { Currency } from '@prisma/client';
import { createPaymentIntent } from '../services/stripe.service.js';
import { buildPayHerePayload, PAYHERE_CHECKOUT_URL } from '../services/payhere.service.js';
import { calculateCartTotal } from '../services/cart.service.js';
import { confirmOrderPaid } from './webhook.controller.js';
import { checkoutSchema } from '@aranya/shared';

const GUEST_TOKEN_COOKIE = 'guestCartToken';

// Thrown (and caught) inside createIntent's transaction to distinguish "some
// lines couldn't be reserved" from any other DB error — see the reservation
// block below.
class StockReservationError extends Error {
    constructor(public variantIds: string[]) {
        super('INSUFFICIENT_STOCK');
    }
}

// Payments run in stub mode unless PAYMENTS_MODE=live. Stub skips real gateways
// entirely (no keys needed) and lets the client confirm via /checkout/stub/complete
// — useful for development before Stripe/PayHere credentials are available.
const isStubPayments = () => process.env.PAYMENTS_MODE !== 'live';

export async function createIntent(req: Request, res: Response) {
    const userId = req.user?.userId ?? null; // optionalAuth — may be a guest
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];
    const market = req.market!; // 'LOCAL' | 'INTERNATIONAL'

    const { shippingAddress, shippingMethod, saveAddress, customerPhone, guestEmail, couponCode, giftWrap, giftNote }
        = checkoutSchema.parse(req.body);

    // Guests must supply an email for the order confirmation
    if (!userId && !guestEmail) {
        return res.status(400).json({ error: 'An email address is required to check out as a guest.' });
    }

    // Cross-market address validation: a local-market session cannot ship internationally
    if (market === 'LOCAL' && shippingAddress.country !== 'LK') {
        return res.status(400).json({
            error: 'Local store orders can only ship within Sri Lanka.',
            hint: 'Switch to the international store to ship outside Sri Lanka.',
        });
    }

    // Resolve cart — by userId for authenticated users, by guestCartToken cookie for guests
    const cartWhere = userId ? { userId } : guestToken ? { guestToken } : null;

    if (!cartWhere) {
        return res.status(400).json({ error: 'No cart found. Add items before checking out.' });
    }

    const cart = await prisma.cart.findUnique({
        where: cartWhere,
        include: { items: { include: { variant: true, product: true } } },
    });

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    // Market re-validation: a variant's market can change while the cart sits.
    // Re-check every line so we never charge a cross-market item.
    const expectedCurrency = market === 'LOCAL' ? 'LKR' : 'USD';
    const wrongMarket = cart.items.filter(
        (item) =>
            (item.variant.market !== market && item.variant.market !== 'BOTH') ||
            item.variant.currency !== expectedCurrency,
    );
    if (wrongMarket.length > 0) {
        return res.status(409).json({
            error: 'Some items in your cart are no longer available in this store. Please remove them and try again.',
            items: wrongMarket.map((item) => ({ productId: item.productId, variantId: item.variantId })),
        });
    }

    // Stock pre-check: cheap fast-fail against the cart's already-loaded
    // (moments-old) stock figure, before touching the DB again. This is only
    // an optimization — the atomic reservation below is what actually
    // enforces this, since a cart read can't close a race between two
    // concurrent checkouts (roadmap: stock reservation at checkout).
    const outOfStock = cart.items.filter((item) => item.variant.stock < item.quantity);
    if (outOfStock.length > 0) {
        return res.status(409).json({
            error: 'Some items are no longer available in the requested quantity.',
            items: outOfStock.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                requested: item.quantity,
                available: item.variant.stock,
            })),
        });
    }

    // If the client submitted a coupon code at checkout, persist it to the cart
    // so calculateCartTotal picks it up. Overrides any previously applied coupon.
    if (couponCode) {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
        if (!coupon) {
            return res.status(400).json({ error: 'That coupon code is not valid.' });
        }
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
            return res.status(400).json({ error: 'That coupon has expired.' });
        }
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ error: 'That coupon has reached its usage limit.' });
        }
        await prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    }

    // Calculate total server-side (applies any coupon on the cart, and gift wrap pricing)
    const { totalInCents, total, shippingCost, discount, couponId, currency }
        = await calculateCartTotal(cart.id, market, shippingMethod, giftWrap);

    // Reserve stock atomically and create the order together, in one
    // transaction: two concurrent checkouts for the last unit can no longer
    // both pass the read-only pre-check above and only discover the
    // conflict at payment time, when one of them has already paid (roadmap:
    // stock reservation at checkout). Each line's stock is decremented HERE
    // — reserved for this order — rather than at payment confirmation;
    // confirmOrderPaid no longer touches variant stock for regular items.
    // The reservation is released (stock incremented back) if the order is
    // ever cancelled — see cancelOrderAndReleaseStock in webhook.controller.ts.
    let order;
    try {
        order = await prisma.$transaction(async (tx) => {
            const insufficient: string[] = [];
            for (const item of cart.items) {
                const dec = await tx.variant.updateMany({
                    where: { id: item.variantId, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                });
                if (dec.count === 0) insufficient.push(item.variantId);
            }
            if (insufficient.length > 0) {
                // Throwing rolls back every decrement already applied in this
                // loop, so a failure on line 2 of 3 never leaves line 1 reserved.
                throw new StockReservationError(insufficient);
            }

            // Create the order in PENDING state — permanently stamps market + currency
            return tx.order.create({
                data: {
                    userId,
                    guestEmail: userId ? null : guestEmail,
                    cartId: cart.id,                     // cleared on payment (guest + user)
                    status: 'PENDING',
                    total: total.toFixed(2),
                    shippingCost: shippingCost.toFixed(2),
                    discount: discount.toFixed(2),
                    couponId,
                    shippingAddress: {                   // JSON snapshot — never mutated after creation
                        ...shippingAddress,
                        ...(giftWrap ? { giftWrap: true } : {}),
                        ...(giftNote ? { giftNote } : {}),
                    },
                    market,
                    currency: currency as Currency,
                    items: {
                        create: cart.items.map((item) => ({
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity,
                            unitPrice: item.variant.price, // price snapshot at checkout time
                        })),
                    },
                },
            });
        });
    } catch (err) {
        if (err instanceof StockReservationError) {
            // Reservation rolled back — nothing was actually taken. Re-read
            // live stock (outside the now-rolled-back transaction) purely to
            // give the client an accurate, helpful response.
            const fresh = await prisma.variant.findMany({
                where: { id: { in: err.variantIds } },
                select: { id: true, stock: true },
            });
            const stockById = new Map(fresh.map((v) => [v.id, v.stock]));
            return res.status(409).json({
                error: 'Some items are no longer available in the requested quantity.',
                items: cart.items
                    .filter((item) => err.variantIds.includes(item.variantId))
                    .map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        requested: item.quantity,
                        available: stockById.get(item.variantId) ?? 0,
                    })),
            });
        }
        throw err;
    }

    // Save address to the authenticated user's address book if requested
    if (saveAddress && userId) {
        await prisma.address.create({
            data: {
                userId,
                line1: shippingAddress.line1,
                line2: shippingAddress.line2,
                city: shippingAddress.city,
                country: shippingAddress.country,
                postalCode: shippingAddress.postalCode ?? '',
            },
        });
    }

    // Stub payment mode: skip real gateways during development
    if (isStubPayments()) {
        return res.json({
            provider: 'stub',
            orderId: order.id,
            total,
            currency,
        });
    }

    // Resolve customer email for the payment gateway
    const userEmail = userId
        ? (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email
        : undefined;
    const contactEmail = userEmail ?? guestEmail ?? '';

    // Route to the correct payment gateway based on market
    if (market === 'LOCAL') {
        const params = buildPayHerePayload({
            orderId: order.id,
            amount: total,
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            email: contactEmail,
            phone: customerPhone ?? '0000000000',
            address: shippingAddress.line1,
            city: shippingAddress.city,
        });

        return res.json({
            provider: 'payhere',
            orderId: order.id,
            params,
            action: PAYHERE_CHECKOUT_URL,
        });
    }

    // INTERNATIONAL — Stripe PaymentIntent
    const paymentIntent = await createPaymentIntent(
        totalInCents,
        currency,
        { orderId: order.id, userId: userId ?? 'guest', market },
    );

    await prisma.order.update({
        where: { id: order.id },
        data: { paymentIntentId: paymentIntent.id },
    });

    return res.json({
        provider: 'stripe',
        orderId: order.id,
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    });
}

// Stub payment completion (dev only) — simulates the gateway webhook by marking
// the order PAID via the same idempotent path real webhooks use.
// Disabled when PAYMENTS_MODE=live.
export async function stubComplete(req: Request, res: Response) {
    if (!isStubPayments()) {
        return res.status(404).json({ error: 'Not found' });
    }
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await confirmOrderPaid(orderId, `STUB-${Date.now()}`, 'Stub');
    return res.json({ ok: true, orderId, status: 'PAID' });
}
