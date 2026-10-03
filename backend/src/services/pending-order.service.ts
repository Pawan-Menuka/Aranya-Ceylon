import { prisma } from '../lib/prisma.js';
import { stripe } from './stripe.service.js';
import { cancelOrderAndReleaseStock } from '../controllers/webhook.controller.js';
import type { JobLeaseHandle } from '../jobs/jobLease.js';

// An unpaid order holds real stock (and a coupon use) from the moment it is
// created — see checkout.controller.ts. This module owns how long that hold
// may last and how it is given back, so the checkout retry path and the
// stale-order sweep agree.

// How long an unpaid order may keep its reservation before the sweep releases
// it. Was a fixed 24h, which let a checkout that was never paid take stock off
// sale for a full day.
const DEFAULT_PENDING_ORDER_TTL_MINUTES = 60;
export function pendingOrderTtlMs(): number {
    const minutes = Number(process.env.PENDING_ORDER_TTL_MINUTES ?? DEFAULT_PENDING_ORDER_TTL_MINUTES);
    return (Number.isFinite(minutes) && minutes >= 5 ? minutes : DEFAULT_PENDING_ORDER_TTL_MINUTES) * 60_000;
}

// Past this age an order is cancelled even when its gateway state could not be
// read (see cancelPendingOrder) — otherwise a gateway outage or a bad key
// would hold stock forever.
const FORCE_CANCEL_AFTER_MS = 24 * 60 * 60 * 1000;
export function isPastForceCancelAge(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() >= FORCE_CANCEL_AFTER_MS;
}

type IntentOutcome = 'cancelled' | 'settling' | 'unknown';

// Make sure a Stripe PaymentIntent can no longer be paid before its order is
// cancelled. Cancelling only our own record would leave the client secret
// usable: the customer could still pay, and the money would arrive for an order
// whose stock has already been released.
async function closeStripeIntent(paymentIntentId: string): Promise<IntentOutcome> {
    try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status === 'canceled') return 'cancelled';
        // Money is captured or in flight — the webhook decides this order.
        if (intent.status === 'succeeded' || intent.status === 'processing' || intent.status === 'requires_capture') {
            return 'settling';
        }
        await stripe.paymentIntents.cancel(paymentIntentId);
        return 'cancelled';
    } catch {
        // Unreachable gateway, or the intent changed state between the two calls.
        return 'unknown';
    }
}

// Cancel one unpaid order and release what it reserved. Returns false when the
// order was deliberately left open: its payment is settling, or its gateway
// state is unknown and `force` is not set. PayHere has no cancel API, so local
// orders are cancelled directly; a payment that still arrives afterwards is
// reported by the webhook (see reportPaymentForClosedOrder).
export async function cancelPendingOrder(
    order: { id: string; paymentIntentId: string | null },
    note: string,
    options: { lease?: JobLeaseHandle; force?: boolean } = {},
): Promise<boolean> {
    if (order.paymentIntentId && process.env.PAYMENTS_MODE === 'live') {
        const outcome = await closeStripeIntent(order.paymentIntentId);
        if (outcome === 'settling') return false;
        if (outcome === 'unknown' && !options.force) return false;
    }
    await cancelOrderAndReleaseStock(order.id, note, options.lease);
    return true;
}

// Bounds one checkout request; a basket normally has zero or one open order.
const SUPERSEDE_LIMIT = 20;

// Release every earlier unpaid order created from this cart. Returns how many
// were released so the caller knows live stock changed underneath it.
export async function supersedePendingOrders(cartId: string): Promise<number> {
    const open = await prisma.order.findMany({
        where: { cartId, status: 'PENDING' },
        select: { id: true, paymentIntentId: true },
        take: SUPERSEDE_LIMIT,
    });

    let released = 0;
    for (const order of open) {
        if (await cancelPendingOrder(order, 'Superseded by a newer checkout attempt for the same basket.')) released++;
    }
    return released;
}
