import type { Request, Response } from 'express';
import { prisma } from '../index.js';
import { Currency } from '@prisma/client';
import { createPaymentIntent } from '../services/stripe.service.js';
import { buildPayHerePayload } from '../services/payhere.service.js';
import { calculateCartTotal } from '../services/cart.service.js';
import { confirmOrderPaid } from './webhook.controller.js';
import { checkoutSchema } from '@aranya/shared';

const GUEST_TOKEN_COOKIE = 'guestCartToken';

// Payments run in stub mode unless PAYMENTS_MODE=live. Stub skips the real
// gateways entirely (no keys needed) and lets the client confirm via the
// stub-complete endpoint — for development before real Stripe/PayHere exist.
const isStubPayments = () => process.env.PAYMENTS_MODE !== 'live';

export async function createIntent(req: Request, res: Response) {
    const userId = req.user?.userId ?? null; // optionalAuth → may be a guest (#17)
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];
    const market = req.market!; // 'LOCAL' | 'INTERNATIONAL'
    const { shippingAddress, shippingMethod, saveAddress, customerName, customerPhone, guestEmail }
        = checkoutSchema.parse(req.body);

    // Guests must supply an email for the order confirmation (#17).
    if (!userId && !guestEmail) {
        return res.status(400).json({ error: 'An email address is required to check out as a guest.' });
    }

    // ── Security: cross-market address validation ──────────────────
    // A local-market session cannot checkout with an international address.
    // Even if someone edits their cookie, this server-side check blocks it.
    if (market === 'LOCAL' && shippingAddress.country !== 'LK') {
        return res.status(400).json({
            error: 'Local store orders can only ship within Sri Lanka.',
            hint: 'Switch to the international store to ship outside Sri Lanka.',
        });
    }

    // ── Get cart (by user, or by guest-cart cookie for guests #17) ──
    const cart = userId
        ? await prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { variant: true, product: true } } },
        })
        : guestToken
            ? await prisma.cart.findUnique({
                where: { guestToken },
                include: { items: { include: { variant: true, product: true } } },
            })
            : null;

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    // ── Market re-validation (#19) ─────────────────────────────────
    // Market is checked at add-to-cart, but a variant's market/currency can
    // change while the cart sits (e.g. admin switches BOTH → LOCAL). Re-check
    // every line so we never charge a cross-market item or mix currencies in
    // one order. Expected currency mirrors calculateCartTotal's mapping.
    const expectedCurrency = market === 'LOCAL' ? 'LKR' : 'USD';
    const wrongMarket = cart.items.filter((item) =>
        (item.variant.market !== market && item.variant.market !== 'BOTH') ||
        item.variant.currency !== expectedCurrency,
    );
    if (wrongMarket.length > 0) {
        return res.status(409).json({
            error: 'Some items in your cart are no longer available in this store. Please remove them and try again.',
            items: wrongMarket.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
            })),
        });
    }

    // ── Stock validation (#4) ──────────────────────────────────────
    // Stock was checked at add-to-cart, but a cart can sit for days.
    // Re-validate here so we never take payment for stock we don't have.
    // (The DB CHECK constraint + atomic decrement in the webhook are the
    //  backstop for the small race window after this point.)
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

    // ── Calculate total server-side (applies the cart's coupon) ────
    const { totalInCents, total, shippingCost, discount, couponId, currency }
        = await calculateCartTotal(cart.id, market, shippingMethod);

    // ── Create Order in PENDING state ─────────────────────────────
    // Order is stamped with market + currency permanently at creation.
    // Decimal columns are written as 2dp strings to avoid any float coercion.
    const order = await prisma.order.create({
        data: {
            userId,                              // null for guests (#17)
            guestEmail: userId ? null : guestEmail, // where to send confirmation (#17)
            status: 'PENDING',
            // total = the grand total actually charged to the gateway (#6):
            // subtotal − discount + shipping. subtotal is derivable from these.
            total: total.toFixed(2),
            shippingCost: shippingCost.toFixed(2),
            discount: discount.toFixed(2),       // 0.00 when no coupon (#5)
            couponId,                            // null when no coupon (#5)
            shippingAddress, // JSON snapshot — never changes after order
            market,          // Permanently stamps which market this order belongs to
            currency: currency as Currency,        // Permanently stamps the payment currency
            items: {
                create: cart.items.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: item.variant.price, // Price snapshot at checkout time
                })),
            },
        },
    });

    // Optionally save address to the user's address book (authenticated only)
    if (saveAddress && userId) {
        await prisma.address.create({
            data: { userId, ...shippingAddress },
        });
    }

    // ── Stub payment mode: skip real gateways (no keys needed) ─────
    // The client confirms via POST /checkout/stub/complete, which simulates
    // the gateway webhook. Swap PAYMENTS_MODE=live for real Stripe/PayHere.
    if (isStubPayments()) {
        return res.json({
            gateway: 'stub',
            orderId: order.id,
            total,
            currency,
        });
    }

    // Resolve customer name/email — from the account if authenticated, else
    // from the guest fields (#17).
    const user = userId
        ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
        : null;
    const customerEmail = user?.email ?? guestEmail ?? '';

    // ── Route to correct payment gateway based on market ──────────
    if (market === 'LOCAL') {
        // PayHere: build signed payload and return it to the client.
        // The client renders a hidden HTML form and submits it to
        // PayHere's checkout URL — customer is redirected to pay.
        const nameParts = (customerName ?? user?.name ?? 'Customer').split(' ');
        const firstName = nameParts[0] ?? 'Customer';
        const lastName = nameParts.slice(1).join(' ') || '-';

        const payHerePayload = buildPayHerePayload({
            orderId: order.id,
            amount: total,
            firstName,
            lastName,
            email: customerEmail,
            phone: customerPhone ?? '0000000000',
            address: shippingAddress.line1,
            city: shippingAddress.city,
        });

        return res.json({
            gateway: 'payhere',
            payHerePayload,
            orderId: order.id,
        });
    }

    // INTERNATIONAL: Stripe PaymentIntent — client uses client_secret
    // to render Stripe Elements. Amount calculated server-side.
    const paymentIntent = await createPaymentIntent(
        totalInCents,
        currency,
        { orderId: order.id, userId: userId ?? 'guest', market }, // Stripe metadata must be strings
    );

    // Link PaymentIntent ID to order for webhook lookup later
    await prisma.order.update({
        where: { id: order.id },
        data: { paymentIntentId: paymentIntent.id },
    });

    return res.json({
        gateway: 'stripe',
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
    });
}

// ── Stub payment completion (dev only) ─────────────────────────────
// Simulates the gateway webhook in stub mode: marks the order PAID via the
// same idempotent path the real webhooks use. Disabled when PAYMENTS_MODE=live.
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