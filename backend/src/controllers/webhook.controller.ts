import type { Request, Response } from 'express';
import { constructWebhookEvent } from '../services/stripe.service.js';
import { verifyPayHereNotification } from '../services/payhere.service.js';
import { sendOrderConfirmation } from '../services/email.service.js';
import { prisma } from '../index.js';

// ── Shared ACID transaction ────────────────────────────────────────
// Called by both Stripe and PayHere handlers after payment is confirmed.
// Idempotent and concurrency-safe: the PENDING→PAID flip is a conditional
// updateMany INSIDE the transaction, so two concurrent webhook deliveries
// (Stripe retries!) can never both process the same payment twice (e.g.
// double-decrementing gift-component stock, or double-counting a coupon).
// Regular-item stock isn't touched here at all — it's reserved at checkout-
// intent creation instead (see checkout.controller.ts).
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

        // 2. Log order event for the timeline shown in /account/orders.
        // Regular-item stock is NOT decremented here — it was already
        // reserved atomically at checkout-intent creation (roadmap: stock
        // reservation at checkout; see checkout.controller.ts), which closes
        // the race this used to only detect-and-flag after the customer had
        // already paid. Cancelling a PENDING order releases that reservation
        // — see cancelOrderAndReleaseStock below.
        await tx.orderEvent.create({
            data: {
                orderId,
                status: 'PAID',
                note: `Payment confirmed via ${gateway}. Ref: ${paymentRef}`,
            },
        });

        // 3. Gift-box orders also decrement each listed component's real
        // stock (remaining-surfaces audit #11) — previously only the gift
        // box's own (deliberately high, synthetic) Variant stock moved, so a
        // component could sell out on its own product page while a box
        // containing it kept selling indefinitely. `GiftSet.contents` has no
        // direct FK (it's product names), so resolution is best-effort: match
        // by exact product name, then by the box's `jar` weight (seed-gifts.ts
        // packs exactly one jar-sized portion of each component per box) and
        // the order's market. An unresolvable component is logged for manual
        // review, never blocks the order.
        const giftIssues: string[] = [];
        for (const item of order.items) {
            const product = await tx.product.findUnique({ where: { id: item.productId }, select: { slug: true } });
            if (!product || !product.slug.startsWith('gift-')) continue;

            const giftSet = await tx.giftSet.findUnique({ where: { slug: product.slug.slice('gift-'.length) } });
            if (!giftSet) continue;

            const jarGrams = parseInt(giftSet.jar, 10) || 50;
            for (const name of giftSet.contents) {
                const component = await tx.product.findFirst({ where: { name } });
                if (!component) { giftIssues.push(`${name}: no matching product`); continue; }

                const variant = await tx.variant.findFirst({
                    where: { productId: component.id, weight: jarGrams, market: { in: [order.market, 'BOTH'] } },
                });
                if (!variant) { giftIssues.push(`${name}: no ${jarGrams}g variant for ${order.market}`); continue; }

                const dec = await tx.variant.updateMany({
                    where: { id: variant.id, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                });
                if (dec.count === 0) giftIssues.push(`${name}: insufficient stock`);
            }
        }
        if (giftIssues.length > 0) {
            await tx.orderEvent.create({
                data: {
                    orderId,
                    status: 'PAID',
                    note: `⚠ Gift-set component stock could not be fully decremented: ${giftIssues.join('; ')}. Needs manual review.`,
                },
            });
            console.error(`⚠ Order ${orderId} gift-component stock issues: ${giftIssues.join('; ')}`);
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

    // Only log the transition on the FIRST flip — the transaction returns null
    // for an already-processed (or unknown) order, so logging unconditionally
    // claimed "marked PAID" on every duplicate webhook delivery (BUG-25).
    if (confirmation) {
        console.log(`✅ Order ${orderId} marked PAID via ${gateway}`);
    }

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

// ── Cancel a PENDING order and release its reserved stock ───────────
// Stock for a regular line item is reserved (decremented) at checkout-intent
// creation, not at payment time — see checkout.controller.ts. If the order
// never gets paid (explicit gateway cancellation, or the stale-order cron
// sweep after 24h), that reservation must be released back to real stock,
// or it's gone forever. Idempotent and concurrency-safe the same way
// confirmOrderPaid is: the PENDING→CANCELLED flip is a conditional
// updateMany, so calling this twice (or racing a late successful payment)
// can never release stock twice or cancel an order that just got paid.
export async function cancelOrderAndReleaseStock(orderId: string, note: string) {
    await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
            where: { id: orderId, status: 'PENDING' },
            data: { status: 'CANCELLED' },
        });
        if (claimed.count === 0) return; // already paid, already cancelled, or unknown order

        const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order) return;

        for (const item of order.items) {
            await tx.variant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
            });
        }

        await tx.orderEvent.create({ data: { orderId, status: 'CANCELLED', note } });
    });
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
            // Explicit cancellation (e.g. PI abandoned/expired) — cancel if
            // open and release the stock reserved at checkout-intent time.
            const pi = event.data.object;
            const order = await prisma.order.findUnique({
                where: { paymentIntentId: pi.id },
                select: { id: true },
            });
            if (order) {
                await cancelOrderAndReleaseStock(order.id, 'Cancelled via Stripe payment_intent.canceled.');
            }
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
        // Customer explicitly cancelled — cancel the order if still open and
        // release the stock reserved at checkout-intent time.
        await cancelOrderAndReleaseStock(order_id, 'Cancelled via PayHere (customer cancelled).');
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