/**
 * Tests for the abandoned-cart recovery job (roadmap). Extracted from the
 * cron callback (runAbandonedCartRecovery) so the targeting/sending logic is
 * directly testable without faking node-cron.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface CartRow {
    id: string;
    userId: string | null;
    updatedAt: Date;
    abandonedEmailSentAt: Date | null;
    user: { email: string } | null;
    items: { product: { name: string }; quantity: number }[];
}

interface VariantRow {
    id: string;
    sku: string;
    stock: number;
    product: { name: string };
}

const store = vi.hoisted(() => ({
    carts: [] as CartRow[],
    updatedCarts: [] as { id: string; data: any }[],
    variants: [] as VariantRow[],
}));

vi.mock('../index.js', () => ({
    prisma: {
        cart: {
            // Only the fields runAbandonedCartRecovery's where-clause actually
            // needs are modeled: userId not-null, updatedAt cutoff,
            // abandonedEmailSentAt null, and a non-empty items relation.
            findMany: async ({ where }: any) => {
                return store.carts.filter((c) => {
                    if (where.userId?.not === null && c.userId === null) return false;
                    if (where.updatedAt?.lt && !(c.updatedAt < where.updatedAt.lt)) return false;
                    if (where.abandonedEmailSentAt === null && c.abandonedEmailSentAt !== null) return false;
                    if (where.items?.some && c.items.length === 0) return false;
                    return true;
                });
            },
            update: async ({ where, data }: any) => {
                store.updatedCarts.push({ id: where.id, data });
                const c = store.carts.find((x) => x.id === where.id);
                if (c && data.abandonedEmailSentAt !== undefined) c.abandonedEmailSentAt = data.abandonedEmailSentAt;
                return c;
            },
        },
        variant: {
            // Only the fields runLowStockAlert's where-clause needs: stock
            // between 0 (exclusive) and the threshold (inclusive).
            findMany: async ({ where }: any) => {
                return store.variants.filter((v) => v.stock <= where.stock.lte && v.stock > where.stock.gt);
            },
        },
    },
}));

vi.mock('../services/email.service.js', () => ({
    sendLowStockAlert: vi.fn(async () => {}),
    sendAbandonedCartEmail: vi.fn(async () => {}),
}));
vi.mock('../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn(async () => {}) }));
vi.mock('../controllers/webhook.controller.js', () => ({ cancelOrderAndReleaseStock: vi.fn(async () => {}) }));

import { runAbandonedCartRecovery, runLowStockAlert } from './scheduler.js';
import { sendAbandonedCartEmail, sendLowStockAlert } from '../services/email.service.js';

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

function cart(overrides: Partial<CartRow> = {}): CartRow {
    return {
        id: 'cart_1',
        userId: 'user_1',
        updatedAt: hoursAgo(4), // past the 3h cutoff by default
        abandonedEmailSentAt: null,
        user: { email: 'buyer@example.com' },
        items: [{ product: { name: 'Ceylon Cinnamon' }, quantity: 2 }],
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    store.carts = [];
    store.updatedCarts = [];
    store.variants = [];
    delete process.env.LOW_STOCK_THRESHOLD;
});

describe('runAbandonedCartRecovery', () => {
    it('emails a signed-in user whose cart has sat untouched past the cutoff, then flags it sent', async () => {
        store.carts = [cart()];

        const sent = await runAbandonedCartRecovery();

        expect(sent).toBe(1);
        expect(sendAbandonedCartEmail).toHaveBeenCalledWith({
            to: 'buyer@example.com',
            items: [{ name: 'Ceylon Cinnamon', quantity: 2 }],
        });
        expect(store.updatedCarts).toEqual([
            { id: 'cart_1', data: { abandonedEmailSentAt: expect.any(Date) } },
        ]);
    });

    it('never targets a guest cart (no email was ever captured to send to)', async () => {
        store.carts = [cart({ userId: null, user: null })];

        const sent = await runAbandonedCartRecovery();

        expect(sent).toBe(0);
        expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    });

    it('skips a cart that was touched recently (within the cutoff window)', async () => {
        store.carts = [cart({ updatedAt: hoursAgo(1) })];

        const sent = await runAbandonedCartRecovery();

        expect(sent).toBe(0);
        expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    });

    it('does not re-send for a cart already flagged for this abandonment episode', async () => {
        store.carts = [cart({ abandonedEmailSentAt: hoursAgo(1) })];

        const sent = await runAbandonedCartRecovery();

        expect(sent).toBe(0);
        expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    });

    it('skips an empty cart', async () => {
        store.carts = [cart({ items: [] })];

        const sent = await runAbandonedCartRecovery();

        expect(sent).toBe(0);
        expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    });
});

describe('runLowStockAlert — #62', () => {
    it('emails the admin with every at-or-below-threshold variant', async () => {
        store.variants = [
            { id: 'v1', sku: 'CCQ-50-LK', stock: 3, product: { name: 'Ceylon Cinnamon Quills' } },
            { id: 'v2', sku: 'GCP-50-LK', stock: 10, product: { name: 'Green Cardamom Pods' } },
        ];

        const count = await runLowStockAlert();

        expect(count).toBe(2);
        expect(sendLowStockAlert).toHaveBeenCalledWith([
            { name: 'Ceylon Cinnamon Quills', sku: 'CCQ-50-LK', stock: 3 },
            { name: 'Green Cardamom Pods', sku: 'GCP-50-LK', stock: 10 },
        ]);
    });

    it('excludes a variant that is already fully out of stock (0, not just low)', async () => {
        store.variants = [{ id: 'v1', sku: 'CCQ-50-LK', stock: 0, product: { name: 'Ceylon Cinnamon Quills' } }];

        const count = await runLowStockAlert();

        expect(count).toBe(0);
        expect(sendLowStockAlert).not.toHaveBeenCalled();
    });

    it('excludes a variant above the threshold', async () => {
        store.variants = [{ id: 'v1', sku: 'CCQ-50-LK', stock: 11, product: { name: 'Ceylon Cinnamon Quills' } }];

        const count = await runLowStockAlert();

        expect(count).toBe(0);
        expect(sendLowStockAlert).not.toHaveBeenCalled();
    });

    it('respects a custom LOW_STOCK_THRESHOLD', async () => {
        process.env.LOW_STOCK_THRESHOLD = '2';
        store.variants = [{ id: 'v1', sku: 'CCQ-50-LK', stock: 5, product: { name: 'Ceylon Cinnamon Quills' } }];

        const count = await runLowStockAlert();

        expect(count).toBe(0);
        expect(sendLowStockAlert).not.toHaveBeenCalled();
    });

    it('sends nothing when nothing is low', async () => {
        const count = await runLowStockAlert();

        expect(count).toBe(0);
        expect(sendLowStockAlert).not.toHaveBeenCalled();
    });
});
