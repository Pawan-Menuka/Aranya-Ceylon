/**
 * Regression tests for gift-set backing-product sync (remaining-surfaces
 * audit #2, #3):
 *
 *  #2 — updateGift must keep the backing Variant's price in sync with
 *       GiftSet.usd/lkr, which is what checkout actually charges.
 *  #3 — createGift must create a backing Product + one Variant per market,
 *       or the gift set is never actually purchasable.
 *
 * In-memory fake of prisma modeling the real relational shape (Product has
 * many Variant; GiftSet is a separate, name-linked table). No DB needed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDouble, responseDouble } from '../../test/httpDoubles.js';

interface VariantRow { id: string; productId: string; sku: string; weight: number; price: number; market: string; currency: string; stock: number; }
interface ProductRow { id: string; slug: string; name: string; description: string; categoryId: string; status: string; market: string; featured: boolean; color: string; originLabel: string; }
interface GiftSetRow { id: string; slug: string; name: string; featured: boolean; tagline: string; blurb: string; badge: string | null; jar: string; color: string; base: string; deep: string; surface: string; usd: number; lkr: number; contents: string[]; status: string; }
interface CategoryRow { id: string; slug: string; name: string; }
type ById = { where: { id: string } };
type GiftUpdate = ById & { data: Partial<GiftSetRow> };
type ProductUpdate = ById & { data: Partial<ProductRow> };
type VariantUpdate = ById & { data: Partial<VariantRow> };
type ProductCreate = { data: Omit<ProductRow, 'id'> & { variants?: { create: Array<Omit<VariantRow, 'id' | 'productId'>> } } };

const store = vi.hoisted(() => {
    const s = {
        giftSets: [] as GiftSetRow[],
        products: [] as ProductRow[],
        variants: [] as VariantRow[],
        categories: [] as CategoryRow[],
        idSeq: 0,
    };
    const nextId = (prefix: string) => `${prefix}_${++s.idSeq}`;

    const tx = {
        category: {
            upsert: async ({ where, create }: { where: { slug: string }; create: Omit<CategoryRow, 'id'> }) => {
                let c = s.categories.find((x) => x.slug === where.slug);
                if (!c) { c = { id: nextId('cat'), ...create } as CategoryRow; s.categories.push(c); }
                return c;
            },
        },
        giftSet: {
            create: async ({ data }: { data: Omit<GiftSetRow, 'id'> }) => {
                const row: GiftSetRow = { id: nextId('gift'), ...data };
                s.giftSets.push(row);
                return row;
            },
            update: async ({ where, data }: GiftUpdate) => {
                const row = s.giftSets.find((g) => g.id === where.id);
                if (!row) throw new Error('NOT_FOUND');
                Object.assign(row, data);
                return row;
            },
            findUnique: async ({ where }: ById) => s.giftSets.find((g) => g.id === where.id) ?? null,
            delete: async ({ where }: ById) => { s.giftSets = s.giftSets.filter((g) => g.id !== where.id); },
        },
        product: {
            create: async ({ data }: ProductCreate) => {
                const { variants, ...fields } = data;
                const row: ProductRow = { id: nextId('prod'), ...fields };
                s.products.push(row);
                const createdVariants: VariantRow[] = (variants?.create ?? []).map((v) => {
                    const vr: VariantRow = { id: nextId('var'), productId: row.id, ...v };
                    s.variants.push(vr);
                    return vr;
                });
                return { ...row, variants: createdVariants };
            },
            findUnique: async ({ where, include }: { where: { id?: string; slug?: string }; include?: { variants?: boolean } }) => {
                const row = s.products.find((p) => (where.id ? p.id === where.id : p.slug === where.slug));
                if (!row) return null;
                if (include?.variants) return { ...row, variants: s.variants.filter((v) => v.productId === row.id) };
                return { ...row };
            },
            update: async ({ where, data }: ProductUpdate) => {
                const row = s.products.find((p) => p.id === where.id);
                if (!row) throw new Error('NOT_FOUND');
                Object.assign(row, data);
                return row;
            },
        },
        variant: {
            update: async ({ where, data }: VariantUpdate) => {
                const row = s.variants.find((v) => v.id === where.id);
                if (!row) throw new Error('NOT_FOUND');
                Object.assign(row, data);
                return row;
            },
        },
    };

    return { s, tx };
});

vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        giftSet: {
            // Returns a COPY, not the live array-element reference — real
            // Prisma always hands back a fresh object per query, so a value
            // captured before the transaction (e.g. updateGift's `existing`)
            // must stay a pre-update snapshot even after tx.giftSet.update()
            // mutates the row. Without this, the "existing" reference here
            // would silently follow the update, and slug-rename handling in
            // syncBackingProduct would look up the WRONG (already-new) slug.
            findUnique: async ({ where }: ById) => {
                const g = store.s.giftSets.find((x) => x.id === where.id);
                return g ? { ...g } : null;
            },
            findMany: async () => store.s.giftSets,
            delete: async ({ where }: ById) => { store.s.giftSets = store.s.giftSets.filter((g) => g.id !== where.id); },
        },
        $transaction: async (fn: (tx: typeof store.tx) => Promise<unknown>) => fn(store.tx),
    },
}));
vi.mock('../../services/audit.service.js', () => ({ writeAuditLog: vi.fn(async () => {}) }));
vi.mock('../../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn(async () => {}) }));

import { createGift, updateGift } from './gift.admin.controller.js';

const resDouble = responseDouble;

const baseBody = {
    slug: 'classic', name: 'The Ceylon Classic', tagline: 'Four cornerstones', blurb: 'A tasting box.',
    jar: '50g', usd: 28.5, lkr: 4250, contents: ['Cinnamon', 'Cardamom', 'Cloves', 'Pepper'],
    status: 'PUBLISHED',
};

beforeEach(() => {
    vi.clearAllMocks();
    store.s.giftSets = [];
    store.s.products = [];
    store.s.variants = [];
    store.s.categories = [];
    store.s.idSeq = 0;
});

describe('createGift — #3 backing product', () => {
    it('creates a DRAFT backing product with one LKR + one USD variant, priced from usd/lkr', async () => {
        const res = resDouble();
        await createGift(requestDouble({ body: baseBody }), res);

        expect(res.statusCode).toBe(201);
        expect(store.s.products).toHaveLength(1);
        const product = store.s.products[0]!;
        expect(product.slug).toBe('gift-classic'); // slug convention gift.controller.ts relies on
        expect(product.status).toBe('DRAFT'); // catalog-hidden

        const variants = store.s.variants.filter((v) => v.productId === product.id);
        expect(variants).toHaveLength(2);
        const lkr = variants.find((v) => v.currency === 'LKR')!;
        const usd = variants.find((v) => v.currency === 'USD')!;
        expect(lkr.price).toBe(4250);
        expect(lkr.market).toBe('LOCAL');
        expect(usd.price).toBe(28.5);
        expect(usd.market).toBe('INTERNATIONAL');
        // 4 contents x 50g jar
        expect(lkr.weight).toBe(200);
        expect(usd.weight).toBe(200);
    });

    it('reuses an existing "Gift Sets" category instead of creating a duplicate', async () => {
        await createGift(requestDouble({ body: baseBody }), resDouble());
        await createGift(requestDouble({ body: { ...baseBody, slug: 'curry', name: 'The Curry Night' } }), resDouble());
        expect(store.s.categories.filter((c) => c.slug === 'gift-sets')).toHaveLength(1);
    });
});

describe('updateGift — #2 price sync', () => {
    it('writes a price change through to BOTH backing variants, not just GiftSet.usd/lkr', async () => {
        await createGift(requestDouble({ body: baseBody }), resDouble());
        const giftId = store.s.giftSets[0]!.id;

        const res = resDouble();
        await updateGift(requestDouble({ params: { id: giftId }, body: { usd: 32, lkr: 4800 } }), res);

        expect(res.statusCode).toBe(200);
        const product = store.s.products[0]!;
        const variants = store.s.variants.filter((v) => v.productId === product.id);
        expect(variants.find((v) => v.currency === 'USD')!.price).toBe(32);
        expect(variants.find((v) => v.currency === 'LKR')!.price).toBe(4800);
    });

    it('recomputes the backing weight when contents changes, even if price does not', async () => {
        await createGift(requestDouble({ body: baseBody }), resDouble());
        const giftId = store.s.giftSets[0]!.id;

        await updateGift(requestDouble({ params: { id: giftId }, body: { contents: ['Cinnamon', 'Cardamom'] } }), resDouble());

        const product = store.s.products[0]!;
        const variants = store.s.variants.filter((v) => v.productId === product.id);
        expect(variants[0]!.weight).toBe(100); // 2 contents x 50g
    });

    it('renames the backing product slug when the gift slug changes, instead of orphaning it', async () => {
        await createGift(requestDouble({ body: baseBody }), resDouble());
        const giftId = store.s.giftSets[0]!.id;

        await updateGift(requestDouble({ params: { id: giftId }, body: { slug: 'classic-v2' } }), resDouble());

        expect(store.s.products).toHaveLength(1); // no orphaned duplicate
        expect(store.s.products[0]!.slug).toBe('gift-classic-v2');

        // A second price update after the rename must still find the (renamed) backing product.
        await updateGift(requestDouble({ params: { id: giftId }, body: { usd: 99 } }), resDouble());
        expect(store.s.variants.find((v) => v.currency === 'USD')!.price).toBe(99);
    });

    it('is a graceful no-op when no backing product exists yet (pre-fix / not-yet-seeded gift set)', async () => {
        // Simulate a gift set that predates this fix: no backing product row.
        store.s.giftSets.push({
            id: 'gift_legacy', ...baseBody, slug: 'legacy', badge: null,
            featured: false, color: '#B5651D', base: '#C2772E', deep: '#7E481A', surface: '#F3E7D4',
        });

        const res = resDouble();
        await updateGift(requestDouble({ params: { id: 'gift_legacy' }, body: { usd: 40 } }), res);

        expect(res.statusCode).toBe(200); // does not throw / fail the request
        expect(store.s.products).toHaveLength(0);
    });
});
