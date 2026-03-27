import type { Request, Response } from 'express';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { sendShippingNotification } from '../../services/email.service.js';
import { stripe } from '../../services/stripe.service.js';
import { z } from 'zod';

const updateOrderSchema = z.object({
    status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    trackingNumber: z.string().optional(),
    note: z.string().optional(),
});

// --- List all orders with market filter ---
export async function listOrders(req: Request, res: Response) {
    const market = req.query.market as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const cursor = req.query.cursor as string | undefined;

    const orders = await prisma.order.findMany({
        where: {
            ...(market && market !== 'ALL' && { market: market as any }),
            ...(status && { status: status as any }),
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            items: { include: { product: true, variant: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasNextPage = orders.length > limit;
    const items = hasNextPage ? orders.slice(0, -1) : orders;

    return res.json({ items, nextCursor: hasNextPage ? items[items.length - 1]?.id : null });
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
    const { id } = req.params;
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

    // Send shipping email if status changed to SHIPPED
    if (status === 'SHIPPED' && trackingNumber && order.user?.email) {
        await sendShippingNotification({
            to: order.user.email,
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
    const { id } = req.params;

    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PAID' && order.status !== 'PROCESSING') {
        return res.status(400).json({ error: 'Only PAID or PROCESSING orders can be refunded' });
    }

    // International orders: refund via Stripe
    // Local orders with PayHere: manual refund process (PayHere has no API refund)
    if (order.market === 'INTERNATIONAL' && order.paymentIntentId) {
        await stripe.refunds.create({ payment_intent: order.paymentIntentId });
    }

    await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status: 'REFUNDED' } });
        await tx.orderEvent.create({
            data: { orderId: id, status: 'REFUNDED', note: 'Refund issued by admin' },
        });
        // Restore stock
        await Promise.all(
            order.items.map((item) =>
                tx.variant.update({
                    where: { id: item.variantId },
                    data: { stock: { increment: item.quantity } },
                }),
            ),
        );
    });

    await writeAuditLog({
        req,
        event: 'ORDER_REFUND',
        targetType: 'Order',
        targetId: id,
        diff: { before: { status: order.status }, after: { status: 'REFUNDED' } },
    });

    return res.json({ message: 'Order refunded successfully' });
}