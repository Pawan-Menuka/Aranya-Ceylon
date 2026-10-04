import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDouble, responseDouble } from '../../test/httpDoubles.js';

const state = vi.hoisted(() => ({
    images: [] as Array<{ id: string; productId: string; publicId: string | null; position: number }>,
    destroyed: [] as string[],
    destroyFails: false,
    audit: [] as Array<Record<string, unknown>>,
    revalidated: [] as string[][],
}));

vi.mock('../../lib/prisma.js', () => {
    const productImage = {
        findFirst: vi.fn(async ({ where }: { where: { id: string; productId: string } }) => {
            const hit = state.images.find((i) => i.id === where.id && i.productId === where.productId);
            return hit ? { id: hit.id, publicId: hit.publicId, product: { slug: 'cinnamon' } } : null;
        }),
        delete: vi.fn(async ({ where }: { where: { id: string } }) => { state.images = state.images.filter((i) => i.id !== where.id); }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: { position: number } }) => {
            Object.assign(state.images.find((i) => i.id === where.id)!, data);
        }),
    };
    return {
        prisma: {
            productImage,
            product: {
                findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
                    where.id === 'p1' ? { slug: 'cinnamon', images: state.images.filter((i) => i.productId === 'p1').map((i) => ({ id: i.id })) } : null),
            },
            $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
        },
    };
});
vi.mock('../../services/cloudinary.service.js', () => ({
    deleteImage: vi.fn(async (publicId: string) => { if (state.destroyFails) throw new Error('cloudinary down'); state.destroyed.push(publicId); }),
}));
vi.mock('../../services/audit.service.js', () => ({ writeAuditLog: vi.fn(async (e: Record<string, unknown>) => { state.audit.push(e); }) }));
vi.mock('../../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn(async (paths: string[]) => { state.revalidated.push(paths); }) }));

import { deleteProductImage, reorderProductImages } from './product-image.admin.controller.js';

const run = async (fn: (req: never, res: never) => Promise<void>, req: object) => {
    const res = responseDouble<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    await fn(requestDouble(req) as never, res as never);
    return res;
};
const ids = () => [...state.images].filter((i) => i.productId === 'p1').sort((a, b) => a.position - b.position).map((i) => i.id);

beforeEach(() => {
    state.images = [
        { id: 'a', productId: 'p1', publicId: 'pub/a', position: 0 },
        { id: 'b', productId: 'p1', publicId: 'pub/b', position: 1 },
        { id: 'c', productId: 'p1', publicId: null, position: 2 },
        { id: 'x', productId: 'p2', publicId: 'pub/x', position: 0 },
    ];
    state.destroyed = []; state.destroyFails = false; state.audit = []; state.revalidated = [];
});

describe('deleting an image', () => {
    it('removes the row and the stored file, audits, and refreshes the cached pages', async () => {
        const res = await run(deleteProductImage, { params: { id: 'p1', imageId: 'b' } });
        expect(res.body).toEqual({ deleted: true, storageCleaned: true });
        expect(ids()).toEqual(['a', 'c']);
        expect(state.destroyed).toEqual(['pub/b']);
        expect(state.audit[0]).toMatchObject({ event: 'PRODUCT_IMAGE_DELETE', targetId: 'p1' });
        expect(state.revalidated[0]).toContain('/products/cinnamon');
    });

    it('cannot delete another product\'s image through this product', async () => {
        const res = await run(deleteProductImage, { params: { id: 'p1', imageId: 'x' } });
        expect(res.statusCode).toBe(404);
        expect(state.images.some((i) => i.id === 'x')).toBe(true);
        expect(state.destroyed).toHaveLength(0);
    });

    it('still succeeds when storage cleanup fails, and says so', async () => {
        state.destroyFails = true;
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const res = await run(deleteProductImage, { params: { id: 'p1', imageId: 'a' } });
        expect(res.body).toEqual({ deleted: true, storageCleaned: false });
        expect(ids()).toEqual(['b', 'c']);
        expect(warn.mock.calls.flat().join(' ')).not.toContain('pub/a'); // no identifiers in logs
        warn.mockRestore();
    });

    it('skips storage for an image that never had a stored file', async () => {
        const res = await run(deleteProductImage, { params: { id: 'p1', imageId: 'c' } });
        expect(res.body.deleted).toBe(true);
        expect(state.destroyed).toHaveLength(0);
    });
});

describe('reordering images', () => {
    it('applies the new order, lead image first, and audits it', async () => {
        const res = await run(reorderProductImages, { params: { id: 'p1' }, body: { imageIds: ['c', 'a', 'b'] } });
        expect(res.body.order).toEqual(['c', 'a', 'b']);
        expect(ids()).toEqual(['c', 'a', 'b']);
        expect(state.audit[0]).toMatchObject({ event: 'PRODUCT_IMAGE_REORDER' });
    });

    it('requires exactly the product\'s own images: no omissions, strangers or duplicates', async () => {
        for (const imageIds of [['a', 'b'], ['a', 'b', 'c', 'x'], ['a', 'b', 'x']]) {
            const res = await run(reorderProductImages, { params: { id: 'p1' }, body: { imageIds } });
            expect(res.statusCode).toBe(400);
            expect(res.body.code).toBe('IMAGE_SET_MISMATCH');
        }
        await expect(run(reorderProductImages, { params: { id: 'p1' }, body: { imageIds: ['a', 'a', 'b'] } })).rejects.toThrow();
        expect(ids()).toEqual(['a', 'b', 'c']);
        expect(state.audit).toHaveLength(0);
    });

    it('404s for an unknown product', async () => {
        expect((await run(reorderProductImages, { params: { id: 'nope' }, body: { imageIds: ['a'] } })).statusCode).toBe(404);
    });
});
