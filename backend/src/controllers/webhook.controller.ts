import type { Request, Response } from 'express';
import crypto from 'crypto';
import { constructWebhookEvent } from '../services/stripe.service.js';
import { verifyPayHereNotification } from '../services/payhere.service.js';
import { prisma } from '../index.js';

// ── Shared ACID transaction ────────────────────────────────────────
// Called by both Stripe and PayHere handlers after payment is confirmed.
// Wrapping in $transaction guarantees: if stock decrement fails,
// the order does NOT get marked PAID. All or nothing.
async function confirmOrderPaid(orderId: string, paymentRef: string, gateway: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });

    // Guard: order not found or already processed — idempotent
    if (!order || order.status === 'PAID') return;

    await prisma.$transaction(async (tx) => {
        // 1. Mark order PAID with market + currency already stamped at creation
        await tx.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
        });

        // 2. Decrement stock for each variant
        // If any variant has 0 stock the update succeeds but goes negative —
        // add a CHECK constraint in production or validate pre-checkout
        await Promise.all(
            order.items.map((item) =>
                tx.variant.update({
                    where: { id: item.variantId },
                    data: { stock: { decrement: item.quantity } },
                }),
            ),
        );

        // 3. Log order event for the timeline shown in /account/orders
        await tx.orderEvent.create({
            data: {
                orderId,
                status: 'PAID',
                note: `Payment confirmed via ${gateway}. Ref: ${paymentRef}`,
            },
        });

        // 4. Clear the cart so the customer starts fresh
        if (order.userId) {
            const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
            if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
    });

    console.log(`✅ Order ${orderId} marked PAID via ${gateway}`);
}

// ── Stripe webhook ─────────────────────────────────────────────────
// Handles international market payments (USD).
// express.raw() must be used on this route — see webhook.routes.ts
export async function stripeWebhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
        event = constructWebhookEvent(req.body as Buffer, signature);
    } catch {
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    switch (event.type) {
        case 'payment_intent.succeeded': {
            const pi = event.data.object;
            const orderId = pi.metadata?.orderId;
            if (orderId) await confirmOrderPaid(orderId, pi.id, 'Stripe');
            break;
        }
        case 'payment_intent.payment_failed': {
            const pi = event.data.object;
            await prisma.order.updateMany({
                where: { paymentIntentId: pi.id },
                data: { status: 'CANCELLED' },
            });
            break;
        }
        default:
            break;
    }

    // Always return 200 immediately — Stripe retries if it doesn't get 200
    return res.json({ received: true });
}

// ── PayHere webhook ────────────────────────────────────────────────
// Handles local market payments (LKR).
// PayHere sends a form-encoded POST to notify_url after payment.
// Must respond with plain "OK" — not JSON.
export async function payHereWebhook(req: Request, res: Response) {
    const {
        merchant_id,
        order_id,
        payment_id,
        payhere_amount,
        payhere_currency,
        status_code,
        md5sig,
    } = req.body;

    // Verify the notification hash before touching the database
    const isValid = verifyPayHereNotification({
        merchantId: merchant_id,
        orderId: order_id,
        payhereAmount: payhere_amount,
        payhereCurrency: payhere_currency,
        statusCode: status_code,
        md5sig,
    });

    if (!isValid) {
        console.error('❌ PayHere webhook: invalid hash', { order_id });
        return res.status(400).send('Invalid signature');
    }

    // PayHere status codes:
    // 2  = successful payment
    // 0  = pending
    // -1 = cancelled
    // -2 = failed
    // -3 = chargedback
    if (status_code === '2') {
        await confirmOrderPaid(order_id, payment_id, 'PayHere');
    } else if (status_code === '-1' || status_code === '-2') {
        await prisma.order.updateMany({
            where: { id: order_id },
            data: { status: 'CANCELLED' },
        });
        console.log(`❌ PayHere payment ${status_code === '-1' ? 'cancelled' : 'failed'} for order ${order_id}`);
    }

    // PayHere REQUIRES plain text "OK" — not JSON
    return res.send('OK');
}