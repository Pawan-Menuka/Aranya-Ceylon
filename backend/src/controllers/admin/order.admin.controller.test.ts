import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    order: null as any,
    stripeError: false,
    transactionError: false,
    transactionCalls: 0,
    stripeCalls: 0,
}));

const tx = {
    order: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        // updateOrderStatus uses .update() (singular), not updateMany — this
        // was missing from the mock entirely before (the one pre-existing
        // updateOrderStatus test never reached the transaction to exercise
        // it). Returns the merged row so callers reading `updated.items` see
        // the order's real line items.
        update: vi.fn(async (args: any) => ({ ...state.order, ...args.data })),
    },
    orderEvent: { create: vi.fn(async () => ({})) },
    variant: { update: vi.fn(async () => ({})) },
    coupon: { update: vi.fn(async () => ({})) },
};

vi.mock('../../index.js', () => ({
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

import { refundOrder, updateOrderStatus } from './order.admin.controller.js';

function resDouble() {
    const res: any = { statusCode: 200, body: undefined };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: unknown) => { res.body = body; return res; };
    return res;
}

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
        await refundOrder({ params: { id: 'o1' }, body: {} } as any, res);
        expect(res.statusCode).toBe(409);
        expect(res.body.manualGatewayRefundRequired).toBe(true);
        expect(state.transactionCalls).toBe(0);
    });

    it('leaves the database untouched when Stripe rejects the refund', async () => {
        state.stripeError = true;
        const res = resDouble();
        await refundOrder({ params: { id: 'o1' }, body: {} } as any, res);
        expect(res.statusCode).toBe(502);
        expect(res.body.gatewayRefundFailed).toBe(true);
        expect(state.transactionCalls).toBe(0);
    });

    it('flags reconciliation when Stripe succeeded but the database update failed', async () => {
        state.transactionError = true;
        const res = resDouble();
        await refundOrder({ params: { id: 'o1' }, body: {} } as any, res);
        expect(res.statusCode).toBe(500);
        expect(res.body.reconciliationRequired).toBe(true);
        expect(state.stripeCalls).toBe(1);
    });

    it('completes Stripe before claiming and restocking the order', async () => {
        const res = resDouble();
        await refundOrder({ params: { id: 'o1' }, body: {} } as any, res);
        expect(res.statusCode).toBe(200);
        expect(res.body.gatewayStatus).toBe('REFUNDED');
        expect(state.stripeCalls).toBe(1);
        expect(tx.variant.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { stock: { increment: 2 } } });
        expect(tx.coupon.update).not.toHaveBeenCalled();
    });

    it('restores the coupon usage count when the refunded order used one (Wave 3 #27)', async () => {
        state.order.couponId = 'c1';
        const res = resDouble();
        await refundOrder({ params: { id: 'o1' }, body: {} } as any, res);
        expect(res.statusCode).toBe(200);
        expect(tx.coupon.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { usageCount: { decrement: 1 } } });
    });
});

describe('shipping status', () => {
    it('rejects SHIPPED without a tracking number before touching the database', async () => {
        await expect(updateOrderStatus({ params: { id: 'o1' }, body: { status: 'SHIPPED' } } as any, resDouble())).rejects.toThrow();
        expect(state.transactionCalls).toBe(0);
    });
});

describe('updateOrderStatus — cancelling a PENDING order releases its reserved stock', () => {
    it('releases stock when an admin cancels a still-PENDING order', async () => {
        state.order.status = 'PENDING';
        const res = resDouble();
        await updateOrderStatus({ params: { id: 'o1' }, body: { status: 'CANCELLED' } } as any, res);

        expect(res.statusCode).toBe(200);
        expect(tx.variant.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { stock: { increment: 2 } } });
    });

    it('does not touch stock cancelling an already-PAID order — that is refundOrder\'s job', async () => {
        state.order.status = 'PAID';
        const res = resDouble();
        await updateOrderStatus({ params: { id: 'o1' }, body: { status: 'CANCELLED' } } as any, res);

        expect(res.statusCode).toBe(200);
        expect(tx.variant.update).not.toHaveBeenCalled();
    });

    it('does not touch stock for a non-cancellation status change', async () => {
        state.order.status = 'PAID';
        const res = resDouble();
        await updateOrderStatus({ params: { id: 'o1' }, body: { status: 'PROCESSING' } } as any, res);

        expect(res.statusCode).toBe(200);
        expect(tx.variant.update).not.toHaveBeenCalled();
    });
});
