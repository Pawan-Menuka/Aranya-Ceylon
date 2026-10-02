/**
 * Tests for releasing unpaid orders (final audit #3 / #9): an order's Stripe
 * PaymentIntent is closed BEFORE its stock is released, an order whose payment
 * is settling is never cancelled, and a newer checkout attempt supersedes the
 * earlier unpaid orders for the same basket.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const store = vi.hoisted(() => ({
    openOrders: [] as Array<{ id: string; paymentIntentId: string | null }>,
    lastWhere: null as unknown,
}));

vi.mock('../lib/prisma.js', () => ({
    prisma: {
        order: {
            findMany: async ({ where }: { where: unknown }) => { store.lastWhere = where; return store.openOrders; },
        },
    },
}));
vi.mock('./stripe.service.js', () => ({
    stripe: { paymentIntents: { retrieve: vi.fn(), cancel: vi.fn() } },
}));
vi.mock('../controllers/webhook.controller.js', () => ({
    cancelOrderAndReleaseStock: vi.fn(async () => {}),
}));

import { cancelPendingOrder, supersedePendingOrders, pendingOrderTtlMs, isPastForceCancelAge } from './pending-order.service.js';
import { stripe } from './stripe.service.js';
import { cancelOrderAndReleaseStock } from '../controllers/webhook.controller.js';

const retrieve = vi.mocked(stripe.paymentIntents.retrieve);
const cancel = vi.mocked(stripe.paymentIntents.cancel);
const intentWithStatus = (status: string) => ({ status }) as unknown as Awaited<ReturnType<typeof stripe.paymentIntents.retrieve>>;

beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    store.openOrders = [];
});
afterEach(() => vi.unstubAllEnvs());

describe('cancelPendingOrder', () => {
    it('cancels a stub-mode / PayHere order directly, without calling Stripe', async () => {
        expect(await cancelPendingOrder({ id: 'o1', paymentIntentId: null }, 'note')).toBe(true);
        expect(retrieve).not.toHaveBeenCalled();
        expect(cancelOrderAndReleaseStock).toHaveBeenCalledWith('o1', 'note', undefined);
    });

    it('closes the Stripe intent before releasing the order in live mode', async () => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        retrieve.mockResolvedValue(intentWithStatus('requires_payment_method'));
        expect(await cancelPendingOrder({ id: 'o1', paymentIntentId: 'pi_1' }, 'note')).toBe(true);
        expect(cancel).toHaveBeenCalledWith('pi_1');
        expect(cancel.mock.invocationCallOrder[0]!).toBeLessThan(vi.mocked(cancelOrderAndReleaseStock).mock.invocationCallOrder[0]!);
    });

    it.each(['succeeded', 'processing', 'requires_capture'])('leaves the order open while its payment is %s', async (status) => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        retrieve.mockResolvedValue(intentWithStatus(status));
        expect(await cancelPendingOrder({ id: 'o1', paymentIntentId: 'pi_1' }, 'note', { force: true })).toBe(false);
        expect(cancel).not.toHaveBeenCalled();
        expect(cancelOrderAndReleaseStock).not.toHaveBeenCalled();
    });

    it('releases an order whose intent Stripe already cancelled', async () => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        retrieve.mockResolvedValue(intentWithStatus('canceled'));
        expect(await cancelPendingOrder({ id: 'o1', paymentIntentId: 'pi_1' }, 'note')).toBe(true);
        expect(cancel).not.toHaveBeenCalled();
    });

    it('keeps the order when Stripe cannot be reached, unless forced', async () => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        retrieve.mockRejectedValue(new Error('network'));
        expect(await cancelPendingOrder({ id: 'o1', paymentIntentId: 'pi_1' }, 'note')).toBe(false);
        expect(cancelOrderAndReleaseStock).not.toHaveBeenCalled();

        expect(await cancelPendingOrder({ id: 'o1', paymentIntentId: 'pi_1' }, 'note', { force: true })).toBe(true);
        expect(cancelOrderAndReleaseStock).toHaveBeenCalledTimes(1);
    });
});

describe('supersedePendingOrders', () => {
    it('releases every open order for the cart and reports how many', async () => {
        store.openOrders = [{ id: 'o1', paymentIntentId: null }, { id: 'o2', paymentIntentId: null }];
        expect(await supersedePendingOrders('cart_1')).toBe(2);
        expect(store.lastWhere).toEqual({ cartId: 'cart_1', status: 'PENDING' });
        expect(cancelOrderAndReleaseStock).toHaveBeenCalledTimes(2);
    });

    it('does not count an order left open because its payment is settling', async () => {
        vi.stubEnv('PAYMENTS_MODE', 'live');
        store.openOrders = [{ id: 'o1', paymentIntentId: 'pi_1' }];
        retrieve.mockResolvedValue(intentWithStatus('processing'));
        expect(await supersedePendingOrders('cart_1')).toBe(0);
    });
});

describe('reservation window', () => {
    it('defaults to 60 minutes and ignores unusable values', () => {
        expect(pendingOrderTtlMs()).toBe(60 * 60_000);
        vi.stubEnv('PENDING_ORDER_TTL_MINUTES', '30');
        expect(pendingOrderTtlMs()).toBe(30 * 60_000);
        vi.stubEnv('PENDING_ORDER_TTL_MINUTES', '1');
        expect(pendingOrderTtlMs()).toBe(60 * 60_000);
        vi.stubEnv('PENDING_ORDER_TTL_MINUTES', 'soon');
        expect(pendingOrderTtlMs()).toBe(60 * 60_000);
    });

    it('forces cancellation only after a full day', () => {
        expect(isPastForceCancelAge(new Date(Date.now() - 2 * 60 * 60 * 1000))).toBe(false);
        expect(isPastForceCancelAge(new Date(Date.now() - 25 * 60 * 60 * 1000))).toBe(true);
    });
});
