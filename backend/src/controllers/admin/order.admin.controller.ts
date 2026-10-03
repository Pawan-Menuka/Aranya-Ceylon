import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { outboxEnabled } from '../../lib/outbox.js';
import { enqueueEmail } from '../../services/email.service.js';
import { prisma } from '../../lib/prisma.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { sendShippingNotification } from '../../services/email.service.js';
import { stripe } from '../../services/stripe.service.js';
import { cancelPendingOrder } from '../../services/pending-order.service.js';
import { z } from 'zod';
import type { Market, OrderStatus, Prisma } from '@prisma/client';

const updateOrderSchema = z.object({
    status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    trackingNumber: z.string().optional(),
    note: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.status === 'SHIPPED' && !data.trackingNumber?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['trackingNumber'], message: 'Tracking number is required when marking an order shipped.' });
    }
});
const refundOrderSchema = z.object({
    manualGatewayRefundCompleted: z.boolean().optional().default(false),
});

// --- List all orders with market filter ---
// Whitelist query enum values so an invalid ?market=/?status= can't reach
// Prisma as a bad enum and 500 (BUG-22).
const VALID_MARKETS = ['LOCAL', 'INTERNATIONAL', 'BOTH'] as const satisfies readonly Market[];
const VALID_ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const satisfies readonly OrderStatus[];

function isAllowedValue<const Values extends readonly string[]>(value: unknown, values: Values): value is Values[number] {
    return typeof value === 'string' && values.some((allowed) => allowed === value);
}

export async function listOrders(req: Request, res: Response) {
    const marketRaw = req.query.market;
    const statusRaw = req.query.status;
    const market = isAllowedValue(marketRaw, VALID_MARKETS) ? marketRaw : undefined;
    const status = isAllowedValue(statusRaw, VALID_ORDER_STATUSES) ? statusRaw : undefined;
    const q = (req.query.q as string | undefined)?.trim();
    const searchTerm = q?.replace(/^AC-/i, '');
    const parsedLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(1, Math.trunc(parsedLimit)), 100) : 20;
    const cursor = req.query.cursor as string | undefined;

    const baseWhere: Prisma.OrderWhereInput = {
            ...(market && { market }),
            // Free-text search the admin order table sends via ?q= — match order
            // id or the customer (registered email/name, or guest email). Without
            // this the search box was a server-side no-op (BUG-14).
            ...(searchTerm && {
                OR: [
                    { id: { contains: searchTerm, mode: 'insensitive' } },
                    { guestEmail: { contains: searchTerm, mode: 'insensitive' } },
                    { user: { is: { email: { contains: searchTerm, mode: 'insensitive' } } } },
                    { user: { is: { name: { contains: searchTerm, mode: 'insensitive' } } } },
                ],
            }),
    };
    const where: Prisma.OrderWhereInput = { ...baseWhere, ...(status && { status }) };
    const [orders, total, groupedCounts] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                items: { include: { product: true, variant: true } },
                coupon: { select: { code: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        }),
        prisma.order.count({ where }),
        prisma.order.groupBy({ by: ['status'], where: baseWhere, _count: { status: true } }),
    ]);

    const hasNextPage = orders.length > limit;
    const items = hasNextPage ? orders.slice(0, -1) : orders;

    const counts = Object.fromEntries(groupedCounts.map((row) => [row.status, row._count.status]));
    return res.json({
        items,
        total,
        counts: { all: Object.values(counts).reduce((sum, count) => sum + count, 0), ...counts },
        nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
    });
}

// --- Get single order ---
export async function getOrder(req: Request, res: Response) {
    const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
            user: { select: { id: true, name: true, email: true } },
            items: { include: { product: true, variant: true } },
            timeline: { orderBy: { createdAt: 'asc' } },
            coupon: true,
        },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json({ order });
}

// Which status an admin may move an order to from each state. Everything else
// is refused: this endpoint used to accept any target from any state, so an
// unpaid order could be marked SHIPPED and a paid one marked CANCELLED or
// REFUNDED with no gateway refund and no restock.
//   • PAID is set only by a verified gateway webhook.
//   • REFUNDED is set only by refundOrder, which refunds at the gateway first.
//   • A paid order is never cancelled here — it has to be refunded.
//   • SHIPPED → SHIPPED exists to correct a tracking number.
const ADMIN_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
    PENDING: ['CANCELLED'],
    PAID: ['PROCESSING', 'SHIPPED'],
    PROCESSING: ['SHIPPED'],
    SHIPPED: ['SHIPPED', 'DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
    REFUNDED: [],
};

function transitionError(from: OrderStatus, to: OrderStatus): string {
    if (to === 'REFUNDED') return 'Use the refund action to refund an order — it refunds the payment and restocks the items.';
    if (to === 'CANCELLED' && from !== 'PENDING') return 'A paid order cannot be cancelled. Refund it instead so the customer gets their money back.';
    if (from === 'PENDING') return 'This order has not been paid yet, so it can only be cancelled.';
    return `An order that is ${from} cannot be moved to ${to}.`;
}

const ORDER_CHANGED = 'This order changed while you were updating it. Reload it and check its current status.';

// --- Update order status ---
export async function updateOrderStatus(req: Request, res: Response) {
    const id = req.params.id!;
    const { status, trackingNumber, note } = updateOrderSchema.parse(req.body);

    const before = await prisma.order.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Order not found' });

    if (!ADMIN_TRANSITIONS[before.status].includes(status)) {
        return res.status(409).json({ error: transitionError(before.status, status), code: 'INVALID_STATUS_TRANSITION' });
    }

    let order;
    if (status === 'CANCELLED') {
        // Only reachable from PENDING. Goes through the same path as the
        // stale-order sweep: the Stripe PaymentIntent is closed first, then the
        // PENDING→CANCELLED flip, stock release and coupon-use release happen
        // in one conditional transaction — so a payment that lands meanwhile
        // wins, and a double click can never restock twice.
        const cancelled = await cancelPendingOrder(
            { id, paymentIntentId: before.paymentIntentId },
            note ?? 'Cancelled by an administrator.',
        );
        if (!cancelled) {
            return res.status(409).json({
                error: 'Stripe is still processing a payment for this order, or could not be reached, so it was not cancelled. Try again in a few minutes.',
                code: 'PAYMENT_IN_PROGRESS',
            });
        }
        order = await prisma.order.findUnique({ where: { id }, include: { user: true, items: true } });
        if (!order || order.status !== 'CANCELLED') {
            return res.status(409).json({ error: ORDER_CHANGED, code: 'ORDER_CHANGED' });
        }
    } else {
        // Claim the transition against the status that was validated above, so a
        // concurrent webhook or second admin can't be silently overwritten.
        order = await prisma.$transaction(async (tx) => {
            const claimed = await tx.order.updateMany({
                where: { id, status: before.status },
                data: {
                    status,
                    ...(trackingNumber && { trackingNumber }),
                },
            });
            if (claimed.count === 0) return null;

            await tx.orderEvent.create({
                data: { orderId: id, status, note: note ?? `Status updated to ${status}` },
            });

            const updated = await tx.order.findUnique({ where: { id }, include: { user: true, items: true } });
            const recipient = updated?.user?.email ?? updated?.guestEmail;
            if (updated && outboxEnabled() && status === 'SHIPPED' && trackingNumber && recipient) {
                const episode = createHash('sha256').update(trackingNumber).digest('hex');
                await enqueueEmail(tx, `shipped:${id}:${episode}`,
                    () => sendShippingNotification({ to: recipient, orderId: id, trackingNumber, market: updated.market }));
            }
            return updated;
        });
        if (!order) return res.status(409).json({ error: ORDER_CHANGED, code: 'ORDER_CHANGED' });
    }

    // P3-5: send shipping email — fall back to guestEmail so guest orders are notified
    const shippingRecipient = order.user?.email ?? (order as { guestEmail?: string | null }).guestEmail ?? null;
    if (!outboxEnabled() && status === 'SHIPPED' && trackingNumber && shippingRecipient) {
        await sendShippingNotification({
            to: shippingRecipient,
            orderId: id,
            trackingNumber,
            market: order.market,
        }).catch(() => { }); // Fire and forget — don't fail the request if email fails
    }

    // Write immutable audit record
    await writeAuditLog({
        req,
        event: 'ORDER_STATUS_UPDATE',
        targetType: 'Order',
        targetId: id,
        diff: { before: { status: before.status }, after: { status } },
    });

    return res.json({ order });
}

// --- Issue refund ---
export async function refundOrder(req: Request, res: Response) {
    const id = req.params.id!;
    const { manualGatewayRefundCompleted } = refundOrderSchema.parse(req.body ?? {});

    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PAID' && order.status !== 'PROCESSING') {
        return res.status(400).json({ error: 'Only PAID or PROCESSING orders can be refunded' });
    }

    if (order.market === 'LOCAL' && !manualGatewayRefundCompleted) {
        return res.status(409).json({
            error: 'Complete the refund in PayHere first, then confirm that the manual gateway refund is complete.',
            code: 'MANUAL_GATEWAY_REFUND_REQUIRED',
            manualGatewayRefundRequired: true,
        });
    }

    // Stripe must succeed before internal state changes. The idempotency key
    // makes concurrent attempts/retries safe; a gateway failure leaves the DB
    // and stock untouched instead of producing a false REFUNDED record.
    if (order.market === 'INTERNATIONAL') {
        if (!order.paymentIntentId) {
            return res.status(409).json({ error: 'Stripe payment reference is missing; refund requires manual review.', code: 'PAYMENT_REFERENCE_MISSING' });
        }
        try {
            await stripe.refunds.create(
                { payment_intent: order.paymentIntentId },
                { idempotencyKey: `refund-${order.id}` },
            );
        } catch {
            return res.status(502).json({
                error: 'Stripe refund failed; the order and stock were left unchanged.',
                code: 'GATEWAY_REFUND_FAILED',
                gatewayRefundFailed: true,
            });
        }
    }

    // Atomically claim the internal refund and restore stock after the gateway
    // succeeded (Stripe) or the admin attested completion (PayHere).
    // updateMany with the status guard means only one concurrent attempt succeeds;
    // a second concurrent call (or retry) will see count === 0 and bail safely.
    let count: number;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const claimed = await tx.order.updateMany({
                where: { id, status: { in: ['PAID', 'PROCESSING'] } },
                data: { status: 'REFUNDED' },
            });

            if (claimed.count === 0) return claimed; // already claimed — skip side-effects

            await tx.orderEvent.create({
                data: { orderId: id, status: 'REFUNDED', note: order.market === 'LOCAL' ? 'Manual PayHere refund confirmed by admin' : 'Stripe refund completed by admin' },
            });

            // Restore stock in the same transaction so it can't diverge from the status flip
            await Promise.all(
                order.items.map((item) =>
                    tx.variant.update({
                        where: { id: item.variantId },
                        data: { stock: { increment: item.quantity } },
                    }),
                ),
            );

            // The coupon's usageCount was reserved when the order was created
            // (checkout.controller.ts) and never restored on refund — a
            // limited-use coupon was permanently "spent" by an order that got
            // reversed (Wave 3 #27, confirmed a bug, not intended policy).
            if (order.couponId) {
                await tx.coupon.update({
                    where: { id: order.couponId },
                    data: { usageCount: { decrement: 1 } },
                });
            }

            return claimed;
        });
        count = result.count;
    } catch {
        return res.status(500).json({
            error: order.market === 'INTERNATIONAL'
                ? 'Stripe refunded the payment, but the internal order update failed. Retry this action to reconcile it safely.'
                : 'The PayHere refund was confirmed, but the internal order update failed. Retry to reconcile it safely.',
            code: order.market === 'INTERNATIONAL' ? 'GATEWAY_REFUNDED_DB_UPDATE_FAILED' : 'MANUAL_REFUND_DB_UPDATE_FAILED',
            gatewayRefunded: true,
            reconciliationRequired: true,
        });
    }

    if (count === 0) {
        return res.status(409).json({
            error: 'Order is not in a refundable state — it may have already been refunded.',
        });
    }

    await writeAuditLog({
        req,
        event: 'ORDER_REFUND',
        targetType: 'Order',
        targetId: id,
        diff: {
            before: { status: order.status }, after: { status: 'REFUNDED' },
            gateway: order.market === 'LOCAL' ? 'PayHere (manual completion confirmed)' : 'Stripe',
            ...(order.couponId && { couponUsageDecremented: order.couponId }),
        },
    });

    return res.json({
        message: order.market === 'LOCAL' ? 'Manual PayHere refund recorded and order restocked.' : 'Stripe refund completed and order restocked.',
        gatewayStatus: order.market === 'LOCAL' ? 'MANUAL_CONFIRMED' : 'REFUNDED',
    });
}
