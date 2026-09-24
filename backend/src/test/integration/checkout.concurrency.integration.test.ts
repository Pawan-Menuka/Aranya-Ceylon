import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createIntent } from '../../controllers/checkout.controller.js';
import {
    checkoutRequest,
    createCatalogItem,
    prisma,
    resetIntegrationDatabase,
    responseRecorder,
    uniqueTestId,
    waitForBlockedVariantUpdate,
} from './helpers.js';

async function attemptCheckout(guestToken: string, guestEmail: string) {
    const { response, result } = responseRecorder();
    await createIntent(checkoutRequest(guestToken, guestEmail), response);
    return result;
}

beforeEach(async () => {
    await resetIntegrationDatabase();
});

afterAll(async () => {
    await resetIntegrationDatabase();
    await prisma.$disconnect();
});

describe('checkout concurrency against PostgreSQL', () => {
    it('allows exactly one of 20 simultaneous carts to reserve the final unit', async () => {
        const prefix = uniqueTestId('last_unit');
        const { product, variant } = await createCatalogItem({ prefix, stock: 1 });
        const carts = await Promise.all(
            Array.from({ length: 20 }, (_, index) =>
                prisma.cart.create({
                    data: {
                        guestToken: `${prefix}-guest-${index}`,
                        items: {
                            create: {
                                productId: product.id,
                                variantId: variant.id,
                                quantity: 1,
                            },
                        },
                    },
                }),
            ),
        );

        const attempts = await Promise.allSettled(
            carts.map((cart, index) =>
                attemptCheckout(cart.guestToken!, `${prefix}-${index}@example.test`),
            ),
        );

        const rejected = attempts.filter((attempt) => attempt.status === 'rejected');
        expect(rejected).toHaveLength(0);

        const responses = attempts.map((attempt) => {
            if (attempt.status === 'rejected') throw attempt.reason;
            return attempt.value;
        });
        expect(responses.filter((response) => response.statusCode === 200)).toHaveLength(1);
        expect(responses.filter((response) => response.statusCode === 409)).toHaveLength(19);

        const [finalVariant, orderCount, orderItemCount] = await Promise.all([
            prisma.variant.findUniqueOrThrow({ where: { id: variant.id } }),
            prisma.order.count({ where: { guestEmail: { startsWith: prefix } } }),
            prisma.orderItem.count({ where: { variantId: variant.id } }),
        ]);

        expect(finalVariant.stock).toBe(0);
        expect(finalVariant.stock).toBeGreaterThanOrEqual(0);
        expect(orderCount).toBe(1);
        expect(orderItemCount).toBe(1);
    });

    it('rolls back every line when a later stock reservation loses a race', async () => {
        const prefix = uniqueTestId('rollback');
        const first = await createCatalogItem({ prefix: `${prefix}_first`, stock: 5 });
        const second = await createCatalogItem({ prefix: `${prefix}_second`, stock: 1 });
        const guestToken = `${prefix}-guest`;
        await prisma.cart.create({
            data: {
                guestToken,
                items: {
                    create: [
                        { productId: first.product.id, variantId: first.variant.id, quantity: 1 },
                        { productId: second.product.id, variantId: second.variant.id, quantity: 1 },
                    ],
                },
            },
        });

        let releaseLock!: () => void;
        const release = new Promise<void>((resolve) => { releaseLock = resolve; });
        let rowLocked!: () => void;
        const locked = new Promise<void>((resolve) => { rowLocked = resolve; });

        const competingReservation = prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "Variant" WHERE "id" = ${second.variant.id} FOR UPDATE`;
            rowLocked();
            await release;
            await tx.variant.update({ where: { id: second.variant.id }, data: { stock: 0 } });
        }, { timeout: 15_000 });

        await locked;
        const checkout = attemptCheckout(guestToken, `${prefix}@example.test`);

        try {
            await waitForBlockedVariantUpdate();
        } finally {
            releaseLock();
        }
        await competingReservation;
        const response = await checkout;

        const [firstAfter, secondAfter, orderCount] = await Promise.all([
            prisma.variant.findUniqueOrThrow({ where: { id: first.variant.id } }),
            prisma.variant.findUniqueOrThrow({ where: { id: second.variant.id } }),
            prisma.order.count({ where: { guestEmail: `${prefix}@example.test` } }),
        ]);

        expect(response.statusCode).toBe(409);
        expect(firstAfter.stock).toBe(5);
        expect(secondAfter.stock).toBe(0);
        expect(orderCount).toBe(0);
    });
});
