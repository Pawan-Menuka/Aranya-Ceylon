/**
 * Tests for admin stock edits (final audit #13). Saving a product used to
 * write each variant's stock as the absolute value the form held, erasing any
 * units reserved by orders while the editor was open. With `stockBase` (the
 * value the editor loaded) the change is applied as a delta against live stock.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Prisma } from '@prisma/client';

vi.mock('../lib/prisma.js', () => ({
    prisma: { review: { groupBy: async () => [] } },
}));

import { updateProduct, StockConflictError } from './product.service.js';

interface VariantRow { id: string; productId: string; sku: string; stock: number; price: number; weight: number; market: string; currency: string }

const db = { variants: [] as VariantRow[] };

type StockWrite = number | { increment: number } | undefined;
function applyStock(row: VariantRow, stock: StockWrite) {
    if (stock === undefined) return;
    row.stock = typeof stock === 'number' ? stock : row.stock + stock.increment;
}

const tx = {
    product: {
        update: async () => ({}),
        findUniqueOrThrow: async () => ({ id: 'p1', variants: db.variants }),
    },
    variant: {
        findMany: async () => db.variants.map((v) => ({ id: v.id })),
        update: async ({ where, data }: { where: { id: string }; data: Partial<VariantRow> & { stock?: StockWrite } }) => {
            const row = db.variants.find((v) => v.id === where.id)!;
            const { stock, ...rest } = data;
            Object.assign(row, rest);
            applyStock(row, stock);
            return row;
        },
        updateMany: async ({ where, data }: { where: { id: string; stock?: { gte: number } }; data: Partial<VariantRow> & { stock?: StockWrite } }) => {
            const row = db.variants.find((v) => v.id === where.id);
            if (!row || (where.stock && row.stock < where.stock.gte)) return { count: 0 };
            const { stock, ...rest } = data;
            Object.assign(row, rest);
            applyStock(row, stock);
            return { count: 1 };
        },
        create: async () => ({}),
        delete: async () => ({}),
    },
    orderItem: { count: async () => 0 },
    cartItem: { count: async () => 0 },
} as unknown as Prisma.TransactionClient;

const variant = (overrides: Partial<{ stock: number; stockBase: number; price: number }>) => ({
    id: 'v1', sku: 'CIN-100', weight: 100, price: 12, market: 'INTERNATIONAL' as const, currency: 'USD' as const,
    stock: 10, ...overrides,
});

beforeEach(() => {
    // The editor loaded stock 10; three units have been reserved since.
    db.variants = [{ id: 'v1', productId: 'p1', sku: 'CIN-100', stock: 7, price: 12, weight: 100, market: 'INTERNATIONAL', currency: 'USD' }];
});

describe('updateProduct — stock is applied as a delta from what the editor loaded', () => {
    it('keeps concurrent reservations when the admin did not change stock', async () => {
        await updateProduct('p1', { variants: [variant({ stock: 10, stockBase: 10, price: 13 })] }, tx);
        expect(db.variants[0]!.stock).toBe(7);    // not reset to 10
        expect(db.variants[0]!.price).toBe(13);   // other fields still saved
    });

    it('adds a restock on top of live stock', async () => {
        await updateProduct('p1', { variants: [variant({ stock: 15, stockBase: 10 })] }, tx);
        expect(db.variants[0]!.stock).toBe(12);   // 7 live + 5 added
    });

    it('applies a reduction that still fits', async () => {
        await updateProduct('p1', { variants: [variant({ stock: 6, stockBase: 10 })] }, tx);
        expect(db.variants[0]!.stock).toBe(3);    // 7 live − 4 removed
    });

    it('refuses a reduction larger than what is left', async () => {
        await expect(updateProduct('p1', { variants: [variant({ stock: 0, stockBase: 10 })] }, tx))
            .rejects.toBeInstanceOf(StockConflictError);
        expect(db.variants[0]!.stock).toBe(7);    // untouched
    });

    it('still writes an absolute value when no base is supplied', async () => {
        await updateProduct('p1', { variants: [variant({ stock: 10 })] }, tx);
        expect(db.variants[0]!.stock).toBe(10);
    });
});
