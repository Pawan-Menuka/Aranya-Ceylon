import type { Request, Response } from 'express';
import { constructWebhookEvent } from '../services/stripe.service.js';
import { verifyPayHereNotification } from '../services/payhere.service.js';
import { sendOrderConfirmation } from '../services/email.service.js';
import { prisma } from '../index.js';

// ── Shared ACID transaction ────────────────────────────────────────
// Called by both Stripe and PayHere handlers after payment is confirmed.
// Idempotent and concurrency-safe: the PENDING→PAID flip is a conditional
// updateMany INSIDE the transaction, so two concurrent webhook deliveries
// (Stripe retries!) can never both decrement stock.
export async function confirmOrderPaid(orderId: string, paymentRef: string, gateway: string) {
    // The transaction returns the data needed for the confirmation email — but
    // ONLY when this delivery is the one that flipped PENDING→PAID, so retries
    // don't re-send. Email is dispatched AFTER commit (a side effect must never
    // hold a DB transaction open or roll it back).
    const confirmation = await prisma.$transaction(async (tx) => {
        // 1. Claim the order atomically: only the delivery that flips
        //    PENDING→PAID proceeds. A second/concurrent delivery sees
        //    count === 0 and bails — true idempotency (#3).
        const claimed = await tx.order.updateMany({
            where: { id: orderId, status: 'PENDING' },
            data: { status: 'PAID' },
        });
        if (claimed.count === 0) return null; // already processed or unknown order

        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true, user: { select: { email: true } } },
        });
        if (!order) return null;

        // 2. Decrement stock with an atomic guard (#4): the `stock >= qty`
        //    filter both checks and decrements in one statement, so stock
        //    never goes negative even under concurrency, and the DB CHECK
        //    constraint is a pure backstop. Items that can't be satisfied
        //    are collected and flagged — the customer has already paid, so
        //    the order stays PAID and ops handles the oversell.
        const oversold: string[] = [];
        for (const item of order.items) {
            const dec = await tx.variant.updateMany({
                where: { id: item.variantId, stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } },
            });
            if (dec.count === 0) oversold.push(item.variantId);
        }

        // 3. Log order event for the timeline shown in /account/orders
        await tx.orderEvent.create({
            data: {
                orderId,
                status: 'PAID',
                note: `Payment confirmed via ${gateway}. Ref: ${paymentRef}`,
            },
        });

        // 3b. Flag any oversold lines for manual fulfilment review
        if (oversold.length > 0) {
            await tx.orderEvent.create({
                data: {
                    orderId,
                    status: 'PAID',
                    note: `⚠ OVERSOLD — insufficient stock for variant(s): ${oversold.join(', ')}. Needs manual review (backorder or refund).`,
                },
            });
            console.error(`⚠ Order ${orderId} oversold variants: ${oversold.join(', ')}`);
        }

        // 4. Count the coupon redemption now that payment succeeded (#5).
        if (order.couponId) {
            await tx.coupon.update({
                where: { id: order.couponId },
                data: { usageCount: { increment: 1 } },
            });
        }

        // 5. Clear the source cart so the customer starts fresh. Keyed by the
        //    order's cartId so it works for guest carts too, not just users.
        if (order.cartId) {
            await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
        }

        // 6. Hand back what the confirmation email needs. Recipient is the
        //    account email, or the guest email for guest checkout (#17).
        return {
            to: order.user?.email ?? order.guestEmail ?? null,
            total: Number(order.total),
            currency: order.currency as string,
            market: order.market as string,
        };
    });

    console.log(`✅ Order ${orderId} marked PAID via ${gateway}`);

    // Order confirmation — sent once (first PAID flip only) and after commit,
    // so a slow/failed send never blocks the webhook ack or rolls back payment.
    if (confirmation?.to) {
        await sendOrderConfirmation({
            to: confirmation.to,
            orderId,
            total: confirmation.total,
            currency: confirmation.currency,
            market: confirmation.market,
        }).catch((err) =>
            console.error(`✉ Order confirmation email failed for ${orderId}:`, err),
        );
    }
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
            // Do NOT cancel (#16): the same PaymentIntent can be retried with
            // another card. Record the attempt and leave the order PENDING —
            // the stale-order cron sweep is the real cancellation path.
            const pi = event.data.object;
            const reason = pi.last_payment_error?.message ?? 'unknown reason';
            const order = await prisma.order.findUnique({
                where: { paymentIntentId: pi.id },
                select: { id: true },
            });
            if (order) {
                await prisma.orderEvent.create({
                    data: {
                        orderId: order.id,
                        status: 'PENDING',
                        note: `Payment attempt failed via Stripe (${reason}). Order left open for retry.`,
                    },
                });
            }
            break;
        }
        case 'payment_intent.canceled': {
            // Explicit cancellation (e.g. PI abandoned/expired) — cancel if open.
            const pi = event.data.object;
            await prisma.order.updateMany({
                where: { paymentIntentId: pi.id, status: 'PENDING' },
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

    // Defense-in-depth: confirm this notification targets OUR merchant
    // account, not just a validly-signed message for someone else (#15).
    if (merchant_id !== process.env.PAYHERE_MERCHANT_ID) {
        console.error('❌ PayHere webhook: merchant_id mismatch', { order_id });
        return res.status(400).send('Merchant mismatch');
    }

    // PayHere status codes:
    // 2  = successful payment
    // 0  = pending
    // -1 = cancelled
    // -2 = failed
    // -3 = chargedback
    if (status_code === '2') {
        const order = await prisma.order.findUnique({ where: { id: order_id } });
        if (!order) {
            // Ack so PayHere stops retrying — there's nothing for us to confirm.
            console.error('❌ PayHere webhook: unknown order', { order_id });
            return res.send('OK');
        }

        // Verify the amount + currency PayHere charged match what we recorded
        // at checkout (#15). order.total is the grand total actually charged.
        const expectedAmount = Number(order.total).toFixed(2);
        if (payhere_amount !== expectedAmount || payhere_currency !== order.currency) {
            console.error('❌ PayHere webhook: amount/currency mismatch', {
                order_id,
                expectedAmount, received: payhere_amount,
                expectedCurrency: order.currency, receivedCurrency: payhere_currency,
            });
            return res.status(400).send('Amount mismatch');
        }

        await confirmOrderPaid(order_id, payment_id, 'PayHere');
    } else if (status_code === '-1') {
        // Customer explicitly cancelled — cancel the order if still open.
        await prisma.order.updateMany({
            where: { id: order_id, status: 'PENDING' },
            data: { status: 'CANCELLED' },
        });
        console.log(`❌ PayHere payment cancelled for order ${order_id}`);
    } else if (status_code === '-2') {
        // Payment failed — leave PENDING so the customer can retry (#16).
        const order = await prisma.order.findUnique({
            where: { id: order_id },
            select: { id: true },
        });
        if (order) {
            await prisma.orderEvent.create({
                data: {
                    orderId: order.id,
                    status: 'PENDING',
                    note: 'Payment attempt failed via PayHere. Order left open for retry.',
                },
            });
        }
        console.log(`⚠ PayHere payment failed for order ${order_id} — left PENDING for retry`);
    }

    // PayHere REQUIRES plain text "OK" — not JSON
    return res.send('OK');
}