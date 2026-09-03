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

const store = vi.hoisted(() => ({
    carts: [] as CartRow[],
    updatedCarts: [] as { id: string; data: any }[],
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
    },
}));

vi.mock('../services/email.service.js', () => ({
    sendLowStockAlert: vi.fn(async () => {}),
    sendAbandonedCartEmail: vi.fn(async () => {}),
}));
vi.mock('../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn(async () => {}) }));
vi.mock('../controllers/webhook.controller.js', () => ({ cancelOrderAndReleaseStock: vi.fn(async () => {}) }));

import { runAbandonedCartRecovery } from './scheduler.js';
import { sendAbandonedCartEmail } from '../services/email.service.js';

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
