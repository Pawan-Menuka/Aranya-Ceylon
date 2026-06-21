import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';

// Shared shape for a customer-facing order: line items (with product name/slug/
// image + variant weight) and the status timeline.
const orderInclude = {
    items: {
        include: {
            product: { select: { id: true, name: true, slug: true, images: { take: 1, orderBy: { position: 'asc' } } } },
            variant: { select: { id: true, weight: true, currency: true } },
        },
    },
    timeline: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

// --- List the authenticated user's orders ---
export async function listMyOrders(req: Request, res: Response) {
    const userId = req.user!.userId;
    const orders = await prisma.order.findMany({
        where: { userId },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
    });
    return res.json({ orders });
}

// --- Get one of the user's orders (IDOR-guarded by userId) ---
export async function getMyOrder(req: Request, res: Response) {
    const userId = req.user!.userId;
    const order = await prisma.order.findFirst({
        where: { id: req.params.id!, userId }, // userId in the filter prevents IDOR
        include: orderInclude,
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json({ order });
}
