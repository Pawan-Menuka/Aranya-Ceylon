import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDouble, responseDouble } from '../test/httpDoubles.js';

interface ReviewRow { id: string; productId: string; userId: string; orderId: string; rating: number; title: string; body: string; moderationStatus: string; createdAt: Date }

const state = vi.hoisted(() => ({
    products: [] as Array<{ id: string; slug: string; status: string }>,
    orders: [] as Array<{ id: string; userId: string | null; status: string; productIds: string[] }>,
    reviews: [] as Array<ReviewRow & { reviewerName: string }>,
    audit: [] as Array<Record<string, unknown>>,
    revalidated: [] as string[][],
}));

vi.mock('../lib/prisma.js', () => ({
    prisma: {
        product: {
            findUnique: vi.fn(async ({ where }: { where: { id?: string; slug?: string } }) =>
                state.products.find((p) => (where.id ? p.id === where.id : p.slug === where.slug)) ?? null),
        },
        order: {
            // Mirrors the where clause the controller builds: own order, purchased status, contains the product.
            findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string; status: { in: string[] }; items: { some: { productId: string } } } }) => {
                const hit = state.orders.find((o) => o.id === where.id && o.userId === where.userId
                    && where.status.in.includes(o.status) && o.productIds.includes(where.items.some.productId));
                return hit ? { id: hit.id } : null;
            }),
        },
        review: {
            create: vi.fn(async ({ data }: { data: Omit<ReviewRow, 'id' | 'moderationStatus' | 'createdAt'> }) => {
                if (state.reviews.some((r) => r.userId === data.userId && r.productId === data.productId && r.orderId === data.orderId)) {
                    throw Object.assign(new Error('unique'), { code: 'P2002' });
                }
                const row = { id: `r${state.reviews.length + 1}`, moderationStatus: 'PENDING', createdAt: new Date(), reviewerName: 'Test', ...data };
                state.reviews.push(row);
                return row;
            }),
            findMany: vi.fn(async ({ where, take }: { where: { productId: string; moderationStatus: string }; take: number }) =>
                state.reviews.filter((r) => r.productId === where.productId && r.moderationStatus === where.moderationStatus)
                    .slice(0, take).map((r) => ({ ...r, user: { name: r.reviewerName } }))),
            aggregate: vi.fn(async ({ where }: { where: { productId: string; moderationStatus: string } }) => {
                const rows = state.reviews.filter((r) => r.productId === where.productId && r.moderationStatus === where.moderationStatus);
                return { _count: { _all: rows.length }, _avg: { rating: rows.length ? rows.reduce((n, r) => n + r.rating, 0) / rows.length : null } };
            }),
            findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
                const r = state.reviews.find((x) => x.id === where.id);
                const product = r && state.products.find((p) => p.id === r.productId);
                return r ? { ...r, product, user: { id: r.userId, name: r.reviewerName, email: 'x@example.com' } } : null;
            }),
            update: vi.fn(async ({ where, data }: { where: { id: string }; data: { moderationStatus: string } }) => {
                const r = state.reviews.find((x) => x.id === where.id)!;
                r.moderationStatus = data.moderationStatus;
                return { ...r, product: state.products.find((p) => p.id === r.productId), user: { id: r.userId, name: r.reviewerName, email: 'x@example.com' } };
            }),
        },
    },
}));
vi.mock('../services/audit.service.js', () => ({ writeAuditLog: vi.fn(async (entry: Record<string, unknown>) => { state.audit.push(entry); }) }));
vi.mock('../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn(async (paths: string[]) => { state.revalidated.push(paths); }) }));

import { createReview, listProductReviews, reviewerLabel } from './review.controller.js';
import { moderateReview } from './admin/review.admin.controller.js';

const valid = { orderId: 'o1', rating: 5, title: 'Wonderful', body: 'The cinnamon is incredibly fragrant.' };
const run = async (fn: (req: never, res: never) => Promise<void>, req: object) => {
    const res = responseDouble<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    await fn(requestDouble(req) as never, res as never);
    return res;
};
const asUser = (userId: string, body: object = valid, productId = 'p1') => ({ user: { userId }, params: { id: productId }, body });

beforeEach(() => {
    state.products = [{ id: 'p1', slug: 'ceylon-cinnamon', status: 'ACTIVE' }, { id: 'p2', slug: 'other', status: 'ACTIVE' }];
    state.orders = [{ id: 'o1', userId: 'u1', status: 'DELIVERED', productIds: ['p1'] }];
    state.reviews = [];
    state.audit = [];
    state.revalidated = [];
});

describe('submitting a review', () => {
    it('accepts a buyer and holds the review for moderation', async () => {
        const res = await run(createReview, asUser('u1'));
        expect(res.statusCode).toBe(201);
        expect(res.body.review).toMatchObject({ rating: 5, moderationStatus: 'PENDING' });
        expect(state.reviews).toHaveLength(1);
    });

    it('refuses someone else\'s order, an unpaid order, and a product that is not in the order', async () => {
        expect((await run(createReview, asUser('u2'))).statusCode).toBe(403);
        state.orders = [{ id: 'o1', userId: 'u1', status: 'PENDING', productIds: ['p1'] }];
        expect((await run(createReview, asUser('u1'))).statusCode).toBe(403);
        state.orders = [{ id: 'o1', userId: 'u1', status: 'REFUNDED', productIds: ['p1'] }];
        expect((await run(createReview, asUser('u1'))).statusCode).toBe(403);
        state.orders = [{ id: 'o1', userId: 'u1', status: 'PAID', productIds: ['p1'] }];
        const wrongProduct = await run(createReview, asUser('u1', valid, 'p2'));
        expect(wrongProduct.statusCode).toBe(403);
        expect(wrongProduct.body.code).toBe('NOT_A_VERIFIED_BUYER');
        expect(state.reviews).toHaveLength(0);
    });

    it('allows one review per purchase and 404s for an unknown product', async () => {
        await run(createReview, asUser('u1'));
        const again = await run(createReview, asUser('u1'));
        expect(again.statusCode).toBe(409);
        expect(again.body.code).toBe('ALREADY_REVIEWED');
        expect((await run(createReview, asUser('u1', valid, 'missing'))).statusCode).toBe(404);
    });

    it('rejects out-of-range ratings and too-short text before touching the database', async () => {
        await expect(run(createReview, asUser('u1', { ...valid, rating: 6 }))).rejects.toThrow();
        await expect(run(createReview, asUser('u1', { ...valid, rating: 0 }))).rejects.toThrow();
        await expect(run(createReview, asUser('u1', { ...valid, body: 'short' }))).rejects.toThrow();
    });
});

describe('reading and moderating reviews', () => {
    it('shows only approved reviews, with a privacy-safe name and an average', async () => {
        await run(createReview, asUser('u1'));
        state.reviews.push({ ...state.reviews[0]!, id: 'r2', orderId: 'o2', rating: 3, moderationStatus: 'APPROVED', reviewerName: 'Amara Wijesinghe' });

        const pending = await run(listProductReviews, { params: { slug: 'ceylon-cinnamon' }, query: {} });
        expect(pending.body.reviews).toHaveLength(1); // r2 only; r1 is still PENDING
        expect(pending.body.reviews[0]).toMatchObject({ rating: 3, reviewer: 'Amara W.' });
        expect(pending.body.reviews[0]).not.toHaveProperty('user');
        expect(pending.body.summary).toEqual({ count: 1, average: 3 });
    });

    it('moderates once, audits, and refreshes the product\'s cached pages', async () => {
        await run(createReview, asUser('u1'));
        const approved = await run(moderateReview, { params: { id: 'r1' }, body: { moderationStatus: 'APPROVED' } });
        expect(approved.body.review.moderationStatus).toBe('APPROVED');
        expect(state.audit.map((a) => a.event)).toEqual(['REVIEW_MODERATE']);
        expect(state.revalidated[0]).toContain('/products/ceylon-cinnamon');

        await run(moderateReview, { params: { id: 'r1' }, body: { moderationStatus: 'APPROVED' } });
        expect(state.audit).toHaveLength(1); // repeating the same decision is a no-op
        expect((await run(moderateReview, { params: { id: 'nope' }, body: { moderationStatus: 'APPROVED' } })).statusCode).toBe(404);
        await expect(run(moderateReview, { params: { id: 'r1' }, body: { moderationStatus: 'PENDING' } })).rejects.toThrow();
    });

    it('labels reviewers without exposing their full name', () => {
        expect(reviewerLabel('Amara Wijesinghe')).toBe('Amara W.');
        expect(reviewerLabel('  Kasun ')).toBe('Kasun');
        expect(reviewerLabel('Mary Ann Smith')).toBe('Mary S.');
        expect(reviewerLabel('   ')).toBe('Customer');
    });
});
