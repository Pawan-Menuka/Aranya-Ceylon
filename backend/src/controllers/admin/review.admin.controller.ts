import type { Request, Response } from 'express';
import { adminListReviewsQuerySchema, moderateReviewSchema } from '@aranya/shared';
import { prisma } from '../../lib/prisma.js';
import { auditPublicMutation } from '../../lib/audit-public-mutation.js';

// Review moderation for the admin console (final audit #42).

// Ratings appear on product cards, the catalog, search and the home page, so an
// approval has to refresh those cached views as well as the product's own page.
const reviewPaths = (slug: string) => ['/', '/products', '/categories', '/search', `/products/${slug}`];

const adminSelect = {
    id: true, rating: true, title: true, body: true, moderationStatus: true, createdAt: true, orderId: true,
    product: { select: { id: true, name: true, slug: true } },
    user: { select: { id: true, name: true, email: true } },
} as const;

export async function listReviews(req: Request, res: Response) {
    const { status, limit, cursor } = adminListReviewsQuerySchema.parse(req.query);

    const rows = await prisma.review.findMany({
        where: { moderationStatus: status },
        // Oldest first for the pending queue so nothing waits forever; newest first otherwise.
        orderBy: [{ createdAt: status === 'PENDING' ? 'asc' : 'desc' }, { id: 'asc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: adminSelect,
    });
    const page = rows.slice(0, limit);

    res.json({ reviews: page, nextCursor: rows.length > limit ? page[page.length - 1]!.id : null });
}

export async function moderateReview(req: Request, res: Response) {
    const id = req.params.id!;
    const { moderationStatus } = moderateReviewSchema.parse(req.body);

    const existing = await prisma.review.findUnique({ where: { id }, select: adminSelect });
    if (!existing) { res.status(404).json({ error: 'Review not found' }); return; }

    if (existing.moderationStatus === moderationStatus) {
        res.json({ review: existing }); // already in that state: no write, no audit noise
        return;
    }

    const review = await prisma.review.update({ where: { id }, data: { moderationStatus }, select: adminSelect });

    await auditPublicMutation({
        req, event: 'REVIEW_MODERATE', targetType: 'Review', targetId: id,
        diff: { from: existing.moderationStatus, to: moderationStatus, productId: review.product.id, rating: review.rating },
    }, reviewPaths(review.product.slug));

    res.json({ review });
}
