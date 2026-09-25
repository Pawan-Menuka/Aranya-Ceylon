import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const emailMocks = vi.hoisted(() => ({
    sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
    sendNewOrderAdminNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/email.service.js', () => emailMocks);

import { confirmOrderPaid } from '../../controllers/webhook.controller.js';
import {
    createCatalogItem,
    prisma,
    resetIntegrationDatabase,
    uniqueTestId,
} from './helpers.js';

beforeEach(async () => {
    vi.clearAllMocks();
    await resetIntegrationDatabase();
});

afterAll(async () => {
    await resetIntegrationDatabase();
    await prisma.$disconnect();
});

describe('payment confirmation idempotency against PostgreSQL', () => {
    it('applies the PAID transition and every business side effect once across 20 calls', async () => {
        const prefix = uniqueTestId('webhook');
        const component = await createCatalogItem({
            prefix: `${prefix}_component`,
            name: `${prefix} Cinnamon`,
            stock: 10,
            weight: 50,
        });
        const giftSlug = `${prefix}-box`;
        const giftSet = await prisma.giftSet.create({
            data: {
                slug: giftSlug,
                name: `${prefix} Gift Box`,
                tagline: 'Integration test gift',
                blurb: 'Integration test gift box',
                jar: '50g',
                usd: '25.00',
                lkr: '7500.00',
                contents: [component.product.name],
            },
        });
        const giftProduct = await prisma.product.create({
            data: {
                name: giftSet.name,
                slug: `gift-${giftSet.slug}`,
                description: 'Integration-test gift product',
                categoryId: component.category.id,
                certifications: [],
                status: 'ACTIVE',
                market: 'INTERNATIONAL',
                variants: {
                    create: {
                        weight: 100,
                        price: '25.00',
                        sku: `${prefix}-gift-sku`,
                        stock: 100,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                    },
                },
            },
            include: { variants: true },
        });
        const giftVariant = giftProduct.variants[0]!;
        const cart = await prisma.cart.create({
            data: {
                guestToken: `${prefix}-guest`,
                items: {
                    create: {
                        productId: giftProduct.id,
                        variantId: giftVariant.id,
                        quantity: 2,
                    },
                },
            },
        });
        const coupon = await prisma.coupon.create({
            data: {
                code: `${prefix}_COUPON`.toUpperCase(),
                discountType: 'PERCENTAGE',
                discountValue: '10.00',
                usageLimit: 1,
                // Checkout reserves coupon usage before payment confirmation.
                usageCount: 1,
            },
        });
        const order = await prisma.order.create({
            data: {
                guestEmail: `${prefix}@example.test`,
                status: 'PENDING',
                total: '54.99',
                shippingCost: '4.99',
                discount: '0.00',
                couponId: coupon.id,
                cartId: cart.id,
                shippingAddress: { line1: '1 Test Street', city: 'Colombo', country: 'US' },
                market: 'INTERNATIONAL',
                currency: 'USD',
                items: {
                    create: {
                        productId: giftProduct.id,
                        variantId: giftVariant.id,
                        quantity: 2,
                        unitPrice: '25.00',
                    },
                },
            },
        });

        const calls = await Promise.allSettled(
            Array.from({ length: 20 }, (_, index) =>
                confirmOrderPaid(order.id, `payhere-${index}`, 'PayHere'),
            ),
        );
        expect(calls.every((call) => call.status === 'fulfilled')).toBe(true);

        const [paidOrder, paymentEvents, couponAfter, componentAfter, cartItems] = await Promise.all([
            prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
            prisma.orderEvent.count({
                where: { orderId: order.id, status: 'PAID', note: { startsWith: 'Payment confirmed' } },
            }),
            prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } }),
            prisma.variant.findUniqueOrThrow({ where: { id: component.variant.id } }),
            prisma.cartItem.count({ where: { cartId: cart.id } }),
        ]);

        expect(paidOrder.status).toBe('PAID');
        expect(paymentEvents).toBe(1);
        expect(couponAfter.usageCount).toBe(1);
        expect(componentAfter.stock).toBe(8);
        expect(cartItems).toBe(0);
        expect(emailMocks.sendOrderConfirmation).toHaveBeenCalledTimes(1);
        expect(emailMocks.sendNewOrderAdminNotification).toHaveBeenCalledTimes(1);
    });
});
