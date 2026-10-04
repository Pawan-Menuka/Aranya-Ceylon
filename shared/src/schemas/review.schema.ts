import { z } from 'zod';

// Product reviews (final audit #42). A review is tied to the order that proves
// the purchase and starts PENDING until an admin approves it.

export const createReviewSchema = z.object({
    orderId: z.string().min(1).max(40),
    rating: z.coerce.number().int().min(1, 'Choose 1 to 5 stars').max(5, 'Choose 1 to 5 stars'),
    title: z.string().trim().min(2).max(100),
    body: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(2000),
});

export const listReviewsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
    cursor: z.string().max(40).optional(),
});

export const adminListReviewsQuerySchema = listReviewsQuerySchema.extend({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export const moderateReviewSchema = z.object({
    moderationStatus: z.enum(['APPROVED', 'REJECTED']),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
