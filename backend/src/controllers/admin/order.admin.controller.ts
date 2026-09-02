import type { Request, Response } from 'express';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { sendShippingNotification } from '../../services/email.service.js';
import { stripe } from '../../services/stripe.service.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

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
const VALID_MARKETS = new Set(['LOCAL', 'INTERNATIONAL', 'BOTH']);
const VALID_ORDER_STATUSES = new Set(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']);

export async function listOrders(req: Request, res: Response) {
    const marketRaw = req.query.market as string | undefined;
    const statusRaw = req.query.status as string | undefined;
    const market = marketRaw && VALID_MARKETS.has(marketRaw) ? marketRaw : undefined;
    const status = statusRaw && VALID_ORDER_STATUSES.has(statusRaw) ? statusRaw : undefined;
    const q = (req.query.q as string | undefined)?.trim();
    const searchTerm = q?.replace(/^AC-/i, '');
    const parsedLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(1, Math.trunc(parsedLimit)), 100) : 20;
    const cursor = req.query.cursor as string | undefined;

    const baseWhere: Prisma.OrderWhereInput = {
            ...(market && market !== 'ALL' && { market: market as any }),
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
    const where = { ...baseWhere, ...(status && { status: status as any }) };
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

// --- Update order status ---
export async function updateOrderStatus(req: Request, res: Response) {
    const id = req.params.id!;
    const { status, trackingNumber, note } = updateOrderSchema.parse(req.body);

    const before = await prisma.order.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Order not found' });

    // Atomic: update order + create timeline event
    const order = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
            where: { id },
            data: {
                status,
                ...(trackingNumber && { trackingNumber }),
            },
            include: { user: true },
        });

        await tx.orderEvent.create({
            data: { orderId: id, status, note: note ?? `Status updated to ${status}` },
        });

        return updated;
    });

    // P3-5: send shipping email — fall back to guestEmail so guest orders are notified
    const shippingRecipient = order.user?.email ?? (order as { guestEmail?: string | null }).guestEmail ?? null;
    if (status === 'SHIPPED' && trackingNumber && shippingRecipient) {
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

            // The coupon's usageCount was incremented when the order was paid
            // (webhook.controller.ts) and never restored on refund — a
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
