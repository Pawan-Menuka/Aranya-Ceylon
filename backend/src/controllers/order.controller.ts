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
    const order = await prisma.order.findUnique({
        where: { id: req.params.id! },
        include: orderInclude,
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Order exists but isn't this user's — 403, distinct from "doesn't exist".
    // Filtering userId into the query above would collapse both cases into a
    // 404 (also a defensible IDOR stance — no existence leak — but not what
    // the test plan/API contract for this route calls for).
    if (order.userId !== userId) return res.status(403).json({ error: 'You do not have access to this order.' });
    return res.json({ order });
}

// --- Guest order polling (no auth) — minimal status only, guest orders only ---
// Guest orders have userId null; the cuid is unguessable, so the id alone is
// the credential. Only id/status/total/currency are ever exposed — userId is
// selected solely to run the ownership check below and must never reach the
// response, even as null.
export async function getGuestOrder(req: Request, res: Response) {
    const order = await prisma.order.findUnique({
        where: { id: req.params.id! },
        select: { id: true, status: true, total: true, currency: true, userId: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Don't expose an authenticated-user's order to an unauthenticated caller
    if (order.userId) {
        return res.status(403).json({ error: 'Sign in to view this order.' });
    }

    const { userId: _userId, ...publicOrder } = order;
    return res.json({ order: publicOrder });
}
