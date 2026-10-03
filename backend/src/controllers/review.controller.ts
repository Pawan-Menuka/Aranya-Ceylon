import type { Request, Response } from 'express';
import { createReviewSchema, listReviewsQuerySchema } from '@aranya/shared';
import { prisma } from '../lib/prisma.js';

// Customer-facing review endpoints (final audit #42). Moderation is in
// controllers/admin/review.admin.controller.ts.

// Orders that prove a real purchase: paid, and not cancelled or refunded.
const PURCHASED_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

/** "Amara Wijesinghe" -> "Amara W." — a reviewer's full name is never exposed. */
export function reviewerLabel(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Customer';
    const [first, ...rest] = parts;
    const last = rest.at(-1);
    return last ? `${first} ${last[0]!.toUpperCase()}.` : first!;
}

// --- Submit a review (signed in; must have bought the product) ---
export async function createReview(req: Request, res: Response) {
    const productId = req.params.id!;
    const userId = req.user!.userId;
    const input = createReviewSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    // The order must be the caller's own, paid, and contain this product.
    // One query, so a stranger's order id reveals nothing beyond "not allowed".
    const order = await prisma.order.findFirst({
        where: {
            id: input.orderId,
            userId,
            status: { in: [...PURCHASED_STATUSES] },
            items: { some: { productId } },
        },
        select: { id: true },
    });
    if (!order) {
        res.status(403).json({ error: 'You can only review products you have bought.', code: 'NOT_A_VERIFIED_BUYER' });
        return;
    }

    try {
        const review = await prisma.review.create({
            data: { productId, userId, orderId: order.id, rating: input.rating, title: input.title, body: input.body },
            select: { id: true, rating: true, title: true, body: true, moderationStatus: true, createdAt: true },
        });
        res.status(201).json({ review, message: 'Thank you! Your review will appear once it has been approved.' });
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            res.status(409).json({ error: 'You have already reviewed this purchase.', code: 'ALREADY_REVIEWED' });
            return;
        }
        throw err;
    }
}

// --- Approved reviews for a product (public) ---
export async function listProductReviews(req: Request, res: Response) {
    const { limit, cursor } = listReviewsQuerySchema.parse(req.query);

    const product = await prisma.product.findUnique({
        where: { slug: req.params.slug! },
        select: { id: true, status: true },
    });
    if (!product || product.status !== 'ACTIVE') { res.status(404).json({ error: 'Product not found' }); return; }

    const where = { productId: product.id, moderationStatus: 'APPROVED' as const };
    const [rows, summary] = await Promise.all([
        prisma.review.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: { id: true, rating: true, title: true, body: true, createdAt: true, user: { select: { name: true } } },
        }),
        prisma.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
    ]);

    const page = rows.slice(0, limit);
    res.json({
        reviews: page.map(({ user, ...review }) => ({ ...review, reviewer: reviewerLabel(user.name) })),
        nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
        summary: {
            count: summary._count._all,
            average: summary._avg.rating === null ? null : Math.round(summary._avg.rating * 10) / 10,
        },
    });
}
