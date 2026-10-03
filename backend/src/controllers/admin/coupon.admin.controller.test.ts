import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCouponSchema, updateCouponSchema } from '@aranya/shared';
import { requestDouble, responseDouble } from '../../test/httpDoubles.js';

interface CouponRow {
    id: string;
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    currency: 'LKR' | 'USD' | null;
    usageLimit: number | null;
    usageCount: number;
    expiresAt: Date | null;
}

const state = vi.hoisted(() => ({ rows: [] as CouponRow[], audit: [] as Array<Record<string, unknown>> }));

vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        coupon: {
            findMany: vi.fn(async ({ where, take, cursor, skip }: { where: { code?: { contains: string }; expiresAt?: { lt?: Date; gte?: Date } | null; OR?: unknown[] }; take: number; cursor?: { id: string }; skip?: number }) => {
                let rows = [...state.rows].sort((a, b) => a.code.localeCompare(b.code));
                if (where.code) rows = rows.filter((r) => r.code.includes(where.code!.contains));
                if (cursor) rows = rows.slice(rows.findIndex((r) => r.id === cursor.id) + (skip ?? 0));
                return rows.slice(0, take);
            }),
            findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.rows.find((r) => r.id === where.id) ?? null),
            create: vi.fn(async ({ data }: { data: Omit<CouponRow, 'id' | 'usageCount'> }) => {
                if (state.rows.some((r) => r.code === data.code)) throw Object.assign(new Error('unique'), { code: 'P2002' });
                const row = { id: `c${state.rows.length + 1}`, usageCount: 0, ...data } as CouponRow;
                state.rows.push(row);
                return row;
            }),
            update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<CouponRow> }) => {
                const row = state.rows.find((r) => r.id === where.id)!;
                Object.assign(row, data);
                return row;
            }),
        },
    },
}));
vi.mock('../../services/audit.service.js', () => ({
    writeAuditLog: vi.fn(async (entry: Record<string, unknown>) => { state.audit.push(entry); }),
}));

import { createCoupon, deactivateCoupon, listCoupons, updateCoupon } from './coupon.admin.controller.js';

const inFuture = () => new Date(Date.now() + 7 * 86_400_000).toISOString();
const run = async (fn: (req: never, res: never) => Promise<void>, req: object) => {
    const res = responseDouble<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    await fn(requestDouble(req) as never, res as never);
    return res;
};

beforeEach(() => { state.rows = []; state.audit = []; });

describe('coupon input rules', () => {
    it('upper-cases the code and rejects unusable ones', () => {
        expect(createCouponSchema.parse({ code: ' summer-10 ', discountType: 'PERCENTAGE', discountValue: 10 }).code).toBe('SUMMER-10');
        expect(() => createCouponSchema.parse({ code: 'ab', discountType: 'PERCENTAGE', discountValue: 10 })).toThrow();
        expect(() => createCouponSchema.parse({ code: 'HAS SPACE', discountType: 'PERCENTAGE', discountValue: 10 })).toThrow();
    });

    it('keeps a percentage in range and currency-free, and gives a fixed amount a currency', () => {
        expect(() => createCouponSchema.parse({ code: 'BIG', discountType: 'PERCENTAGE', discountValue: 101 })).toThrow();
        expect(() => createCouponSchema.parse({ code: 'PCT', discountType: 'PERCENTAGE', discountValue: 10, currency: 'USD' })).toThrow();
        expect(() => createCouponSchema.parse({ code: 'FIX', discountType: 'FIXED_AMOUNT', discountValue: 5 })).toThrow();
        expect(createCouponSchema.parse({ code: 'FIX', discountType: 'FIXED_AMOUNT', discountValue: 5, currency: 'USD' }).currency).toBe('USD');
    });

    it('rejects a past expiry, a zero value and sub-cent precision', () => {
        expect(() => createCouponSchema.parse({ code: 'OLD', discountType: 'PERCENTAGE', discountValue: 5, expiresAt: '2020-01-01' })).toThrow();
        expect(() => createCouponSchema.parse({ code: 'ZERO', discountType: 'PERCENTAGE', discountValue: 0 })).toThrow();
        expect(() => createCouponSchema.parse({ code: 'CENT', discountType: 'FIXED_AMOUNT', discountValue: 1.005, currency: 'USD' })).toThrow();
    });

    it('only allows the limit and expiry to be edited, and needs at least one', () => {
        expect(() => updateCouponSchema.parse({})).toThrow();
        expect(updateCouponSchema.parse({ usageLimit: null }).usageLimit).toBeNull();
        expect(updateCouponSchema.parse({ discountValue: 99, usageLimit: 5 })).not.toHaveProperty('discountValue');
    });
});

describe('coupon admin API', () => {
    it('creates a coupon and writes a COUPON_CREATE audit entry', async () => {
        const res = await run(createCoupon, { body: { code: 'WELCOME', discountType: 'PERCENTAGE', discountValue: 15, usageLimit: 100 } });
        expect(res.statusCode).toBe(201);
        expect(res.body.coupon).toMatchObject({ code: 'WELCOME', discountValue: 15, usageLimit: 100, status: 'ACTIVE' });
        expect(state.audit).toHaveLength(1);
        expect(state.audit[0]).toMatchObject({ event: 'COUPON_CREATE', targetType: 'Coupon' });
    });

    it('answers 409 for a duplicate code without auditing', async () => {
        await run(createCoupon, { body: { code: 'DUP', discountType: 'PERCENTAGE', discountValue: 5 } });
        state.audit = [];
        const res = await run(createCoupon, { body: { code: 'dup', discountType: 'PERCENTAGE', discountValue: 5 } });
        expect(res.statusCode).toBe(409);
        expect(state.audit).toHaveLength(0);
    });

    it('lists with derived status and cursor paging', async () => {
        state.rows = [
            { id: 'a', code: 'AAA', discountType: 'PERCENTAGE', discountValue: 5, currency: null, usageLimit: 1, usageCount: 1, expiresAt: null },
            { id: 'b', code: 'BBB', discountType: 'PERCENTAGE', discountValue: 5, currency: null, usageLimit: null, usageCount: 0, expiresAt: new Date(Date.now() - 1000) },
            { id: 'c', code: 'CCC', discountType: 'PERCENTAGE', discountValue: 5, currency: null, usageLimit: null, usageCount: 0, expiresAt: null },
        ];
        const first = await run(listCoupons, { query: { limit: '2' } });
        expect(first.body.coupons.map((c: { code: string; status: string }) => `${c.code}:${c.status}`)).toEqual(['AAA:EXHAUSTED', 'BBB:EXPIRED']);
        expect(first.body.nextCursor).toBe('b');
        const second = await run(listCoupons, { query: { limit: '2', cursor: first.body.nextCursor } });
        expect(second.body.coupons.map((c: { code: string }) => c.code)).toEqual(['CCC']);
        expect(second.body.nextCursor).toBeNull();
    });

    it('will not lower the limit below the times a coupon was already used', async () => {
        state.rows = [{ id: 'u', code: 'USED', discountType: 'PERCENTAGE', discountValue: 5, currency: null, usageLimit: 10, usageCount: 7, expiresAt: null }];
        const refused = await run(updateCoupon, { params: { id: 'u' }, body: { usageLimit: 3 } });
        expect(refused.statusCode).toBe(409);
        expect(refused.body.code).toBe('LIMIT_BELOW_USAGE');
        const ok = await run(updateCoupon, { params: { id: 'u' }, body: { usageLimit: 7, expiresAt: inFuture() } });
        expect(ok.statusCode).toBe(200);
        expect(state.audit.map((a) => a.event)).toEqual(['COUPON_UPDATE']);
    });

    it('deactivates by expiring the coupon, once, and 404s for an unknown id', async () => {
        state.rows = [{ id: 'd', code: 'LIVE', discountType: 'PERCENTAGE', discountValue: 5, currency: null, usageLimit: null, usageCount: 0, expiresAt: null }];
        const res = await run(deactivateCoupon, { params: { id: 'd' } });
        expect(res.body.coupon.status).toBe('EXPIRED');
        expect(state.rows[0]!.expiresAt!.getTime()).toBeLessThan(Date.now());

        const again = await run(deactivateCoupon, { params: { id: 'd' } });
        expect(again.statusCode).toBe(200);
        expect(state.audit.map((a) => a.event)).toEqual(['COUPON_DEACTIVATE']); // not repeated

        expect((await run(deactivateCoupon, { params: { id: 'nope' } })).statusCode).toBe(404);
    });
});
