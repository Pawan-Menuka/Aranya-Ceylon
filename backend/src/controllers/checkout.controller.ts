import type { Request, Response } from 'express';
import { prisma } from '../index.js';
import { Currency } from '@prisma/client';
import { createPaymentIntent } from '../services/stripe.service.js';
import { buildPayHerePayload } from '../services/payhere.service.js';
import { calculateCartTotal } from '../services/cart.service.js';
import { checkoutSchema } from '@aranya/shared';

export async function createIntent(req: Request, res: Response) {
    const userId = req.user!.userId;
    const market = req.market!; // 'LOCAL' | 'INTERNATIONAL'
    const { shippingAddress, shippingMethod, saveAddress, customerName, customerPhone }
        = checkoutSchema.parse(req.body);

    // ── Security: cross-market address validation ──────────────────
    // A local-market session cannot checkout with an international address.
    // Even if someone edits their cookie, this server-side check blocks it.
    if (market === 'LOCAL' && shippingAddress.country !== 'LK') {
        return res.status(400).json({
            error: 'Local store orders can only ship within Sri Lanka.',
            hint: 'Switch to the international store to ship outside Sri Lanka.',
        });
    }

    // ── Get cart ───────────────────────────────────────────────────
    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: { include: { variant: true, product: true } },
        },
    });

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    // ── Calculate total server-side ────────────────────────────────
    const { totalInCents, total, subtotal, shippingCost, currency }
        = await calculateCartTotal(cart.id, market, shippingMethod);

    // ── Create Order in PENDING state ─────────────────────────────
    // Order is stamped with market + currency permanently at creation.
    const order = await prisma.order.create({
        data: {
            userId,
            status: 'PENDING',
            total: subtotal,
            shippingCost,
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

    // Optionally save address to user's address book
    if (saveAddress) {
        await prisma.address.create({
            data: { userId, ...shippingAddress },
        });
    }

    // ── Route to correct payment gateway based on market ──────────
    if (market === 'LOCAL') {
        // PayHere: build signed payload and return it to the client.
        // The client renders a hidden HTML form and submits it to
        // PayHere's checkout URL — customer is redirected to pay.
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });

        const nameParts = (customerName ?? user?.name ?? 'Customer').split(' ');
        const firstName = nameParts[0] ?? 'Customer';
        const lastName = nameParts.slice(1).join(' ') || '-';

        const payHerePayload = buildPayHerePayload({
            orderId: order.id,
            amount: total,
            firstName,
            lastName,
            email: user?.email ?? '',
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
        { orderId: order.id, userId, market },
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