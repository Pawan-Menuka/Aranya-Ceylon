import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDouble, responseDouble } from '../../test/httpDoubles.js';

interface OrderRow {
    id: string;
    status: string;
    market: string;
    paymentIntentId: string;
    items: Array<{ variantId: string; quantity: number }>;
    couponId?: string;
}

const state = vi.hoisted(() => ({
    order: { id: 'o1', status: 'PAID', market: 'INTERNATIONAL', paymentIntentId: 'pi_1', items: [] } as OrderRow,
    stripeError: false,
    transactionError: false,
    transactionCalls: 0,
    stripeCalls: 0,
}));

const tx = {
    order: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        // updateOrderStatus claims the transition with a conditional
        // updateMany, then re-reads the row inside the same transaction.
        findUnique: vi.fn(async () => state.order),
    },
    orderEvent: { create: vi.fn(async () => ({})) },
    variant: { update: vi.fn(async () => ({})) },
    coupon: { update: vi.fn(async () => ({})) },
};

vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        order: {
            findUnique: vi.fn(async () => state.order),
            findMany: vi.fn(async () => []),
            count: vi.fn(async () => 0),
            groupBy: vi.fn(async () => []),
        },
        $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
            state.transactionCalls += 1;
            if (state.transactionError) throw new Error('db failed');
            return callback(tx);
        }),
    },
}));
vi.mock('../../services/audit.service.js', () => ({ writeAuditLog: vi.fn(async () => {}) }));
vi.mock('../../services/email.service.js', () => ({ sendShippingNotification: vi.fn(async () => {}) }));
vi.mock('../../services/stripe.service.js', () => ({
    stripe: { refunds: { create: vi.fn(async () => {
        state.stripeCalls += 1;
        if (state.stripeError) throw new Error('stripe failed');
        return { id: 're_1' };
    }) } },
}));

vi.mock('../../services/pending-order.service.js', () => ({ cancelPendingOrder: vi.fn(async () => true) }));

import { refundOrder, updateOrderStatus } from './order.admin.controller.js';
import { cancelPendingOrder } from '../../services/pending-order.service.js';

const resDouble = () => responseDouble<Record<string, unknown>>();

beforeEach(() => {
    vi.clearAllMocks();
    state.stripeError = false;
    state.transactionError = false;
    state.transactionCalls = 0;
    state.stripeCalls = 0;
    state.order = { id: 'o1', status: 'PAID', market: 'INTERNATIONAL', paymentIntentId: 'pi_1', items: [{ variantId: 'v1', quantity: 2 }] };
});

describe('admin refunds', () => {
    it('requires confirmation that a PayHere refund was completed manually', async () => {
        state.order.market = 'LOCAL';
        const res = resDouble();
        await refundOrder(requestDouble({ params: { id: 'o1' }, body: {} }), res);
        expect(res.statusCode).toBe(409);
        expect(res.body.manualGatewayRefundRequired).toBe(true);
        expect(state.transactionCalls).toBe(0);
    });

    it('leaves the database untouched when Stripe rejects the refund', async () => {
        state.stripeError = true;
        const res = resDouble();
        await refundOrder(requestDouble({ params: { id: 'o1' }, body: {} }), res);
        expect(res.statusCode).toBe(502);
        expect(res.body.gatewayRefundFailed).toBe(true);
        expect(state.transactionCalls).toBe(0);
    });

    it('flags reconciliation when Stripe succeeded but the database update failed', async () => {
        state.transactionError = true;
        const res = resDouble();
        await refundOrder(requestDouble({ params: { id: 'o1' }, body: {} }), res);
        expect(res.statusCode).toBe(500);
        expect(res.body.reconciliationRequired).toBe(true);
        expect(state.stripeCalls).toBe(1);
    });

    it('completes Stripe before claiming and restocking the order', async () => {
        const res = resDouble();
        await refundOrder(requestDouble({ params: { id: 'o1' }, body: {} }), res);
        expect(res.statusCode).toBe(200);
        expect(res.body.gatewayStatus).toBe('REFUNDED');
        expect(state.stripeCalls).toBe(1);
        expect(tx.variant.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { stock: { increment: 2 } } });
        expect(tx.coupon.update).not.toHaveBeenCalled();
    });

    it('restores the coupon usage count when the refunded order used one (Wave 3 #27)', async () => {
        state.order.couponId = 'c1';
        const res = resDouble();
        await refundOrder(requestDouble({ params: { id: 'o1' }, body: {} }), res);
        expect(res.statusCode).toBe(200);
        expect(tx.coupon.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { usageCount: { decrement: 1 } } });
    });
});

describe('shipping status', () => {
    it('rejects SHIPPED without a tracking number before touching the database', async () => {
        await expect(updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'SHIPPED' } }), resDouble())).rejects.toThrow();
        expect(state.transactionCalls).toBe(0);
    });
});

// Final audit #10: status changes used to be accepted from any state to any
// state, read-then-write outside a guard, and an admin cancel released stock
// but not the coupon use or the Stripe PaymentIntent.
describe('updateOrderStatus — cancelling an unpaid order', () => {
    it('cancels a PENDING order through the shared release path', async () => {
        state.order.status = 'PENDING';
        vi.mocked(cancelPendingOrder).mockImplementationOnce(async () => { state.order.status = 'CANCELLED'; return true; });
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'CANCELLED' } }), res);

        expect(res.statusCode).toBe(200);
        expect(cancelPendingOrder).toHaveBeenCalledWith({ id: 'o1', paymentIntentId: 'pi_1' }, 'Cancelled by an administrator.');
        // Stock and coupon release belong to that path, not to this handler.
        expect(tx.variant.update).not.toHaveBeenCalled();
        expect(state.transactionCalls).toBe(0);
    });

    it('refuses to cancel while Stripe is still settling a payment', async () => {
        state.order.status = 'PENDING';
        vi.mocked(cancelPendingOrder).mockResolvedValueOnce(false);
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'CANCELLED' } }), res);

        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('PAYMENT_IN_PROGRESS');
    });

    it('reports a conflict when the order was paid while it was being cancelled', async () => {
        state.order.status = 'PENDING';
        // The release path is conditional on PENDING: a payment that landed
        // first leaves the order PAID and the cancel a no-op.
        vi.mocked(cancelPendingOrder).mockImplementationOnce(async () => { state.order.status = 'PAID'; return true; });
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'CANCELLED' } }), res);

        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('ORDER_CHANGED');
    });
});

describe('updateOrderStatus — transition rules', () => {
    it.each([
        ['PAID', 'CANCELLED'],       // a paid order must be refunded, not cancelled
        ['PAID', 'REFUNDED'],        // only the refund endpoint may set REFUNDED
        ['PROCESSING', 'REFUNDED'],
        ['PENDING', 'PROCESSING'],   // unpaid orders can't enter fulfilment
        ['PENDING', 'DELIVERED'],
        ['CANCELLED', 'PROCESSING'],
        ['REFUNDED', 'DELIVERED'],
        ['DELIVERED', 'PROCESSING'],
    ])('refuses %s → %s without touching the order', async (from, to) => {
        state.order.status = from;
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: to } }), res);

        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
        expect(state.transactionCalls).toBe(0);
        expect(cancelPendingOrder).not.toHaveBeenCalled();
    });

    it('refuses to ship an unpaid order even with a tracking number', async () => {
        state.order.status = 'PENDING';
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'SHIPPED', trackingNumber: 'TRK1' } }), res);
        expect(res.statusCode).toBe(409);
    });

    it('moves a PAID order to PROCESSING, claiming it against its current status', async () => {
        state.order.status = 'PAID';
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'PROCESSING' } }), res);

        expect(res.statusCode).toBe(200);
        expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: 'o1', status: 'PAID' }, data: { status: 'PROCESSING' } });
        expect(tx.variant.update).not.toHaveBeenCalled();
    });

    it('reports a conflict instead of overwriting a status that changed underneath', async () => {
        state.order.status = 'PAID';
        tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'PROCESSING' } }), res);

        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('ORDER_CHANGED');
        expect(tx.orderEvent.create).not.toHaveBeenCalled();
    });

    it('allows correcting the tracking number on a shipped order', async () => {
        state.order.status = 'SHIPPED';
        const res = resDouble();
        await updateOrderStatus(requestDouble({ params: { id: 'o1' }, body: { status: 'SHIPPED', trackingNumber: 'TRK2' } }), res);
        expect(res.statusCode).toBe(200);
    });
});
