import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearSimpleCache, withCache } from '../lib/simpleCache.js';

const mocks = vi.hoisted(() => ({
    findProduct: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(), archiveProduct: vi.fn(),
    uploadImage: vi.fn(), createImage: vi.fn(), audit: vi.fn(),
}));
vi.mock('../lib/prisma.js', () => ({ prisma: {
    product: { findUnique: mocks.findProduct },
    productImage: { aggregate: async () => ({ _max: { position: 2 } }), create: mocks.createImage },
} }));
vi.mock('../services/product.service.js', () => ({
    createProduct: mocks.createProduct, updateProduct: mocks.updateProduct, archiveProduct: mocks.archiveProduct,
}));
vi.mock('../services/cloudinary.service.js', () => ({ uploadImage: mocks.uploadImage }));
vi.mock('../services/audit.service.js', () => ({ writeAuditLog: mocks.audit }));

import { archiveProduct, createProduct, updateProduct, uploadProductImages } from './product.controller.js';

const initial = { id: 'product-1', name: 'Cinnamon', slug: 'old-cinnamon', status: 'ACTIVE', variants: [] };
const dependencies = ['/', '/products', '/categories', '/search', '/recipes', '/gifts'];
const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response('{}'));
function req(body: unknown = {}, files?: unknown): Request {
    return { body, params: { id: initial.id }, files } as unknown as Request;
}
function response() {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res); res.json.mockReturnValue(res);
    return res as unknown as Response;
}
function invalidatedPaths(): string[] {
    const init = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
    return JSON.parse(String(init?.body)).paths;
}

beforeEach(() => {
    _clearSimpleCache();
    vi.resetAllMocks();
    vi.stubEnv('REVALIDATION_SECRET', 'fixture-only');
    vi.stubEnv('FRONTEND_URL', 'http://fixture.local');
    vi.stubGlobal('fetch', fetcher);
    fetcher.mockImplementation(async () => new Response('{}'));
    mocks.findProduct.mockResolvedValue({ ...initial });
    mocks.createProduct.mockResolvedValue({ ...initial });
    mocks.updateProduct.mockResolvedValue({ ...initial, slug: 'new-cinnamon' });
    mocks.archiveProduct.mockResolvedValue({ ...initial, status: 'ARCHIVED' });
    mocks.audit.mockResolvedValue(undefined);
    mocks.uploadImage.mockResolvedValue({ url: 'https://fixture.local/image.webp', publicId: 'fixture-image' });
    mocks.createImage.mockImplementation(async ({ data }: { data: { position: number } }) => ({ id: `image-${data.position}`, ...data }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('public product mutation invalidation', () => {
    it.each(['create', 'update', 'archive', 'images'])('invalidates committed %s changes even when auditing fails, preserving the audit error', async operation => {
        // Audit constraint errors must not be mistaken for a rejected SKU write
        // after the product mutation has already committed.
        const failure = Object.assign(new Error('audit unavailable'), { code: 'P2002' });
        mocks.audit.mockRejectedValue(failure);
        const work = operation === 'create'
            ? createProduct(req({ name: 'Cinnamon', slug: initial.slug, description: 'Fresh Ceylon cinnamon', categoryId: 'spices', variants: [{ sku: 'cinnamon', weight: 50, price: 10 }] }), response())
            : operation === 'update' ? updateProduct(req({ slug: 'new-cinnamon' }), response())
            : operation === 'archive' ? archiveProduct(req(), response())
            : uploadProductImages(req({}, [{ buffer: Buffer.from('image') }]), response());
        await expect(work).rejects.toBe(failure);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(invalidatedPaths()).toEqual(expect.arrayContaining([...dependencies, `/products/${initial.slug}`]));
        if (operation === 'update') expect(invalidatedPaths()).toContain('/products/new-cinnamon');
    });

    it('invalidates cached misses, listings and dependent views after product creation', async () => {
        const res = response();
        await createProduct(req({ name: 'Cinnamon', slug: initial.slug, description: 'Fresh Ceylon cinnamon', categoryId: 'spices', variants: [{ sku: 'cinnamon', weight: 50, price: 10 }] }), res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(invalidatedPaths()).toEqual([...dependencies, `/products/${initial.slug}`]);
        expect(mocks.audit.mock.invocationCallOrder[0]).toBeLessThan(fetcher.mock.invocationCallOrder[0]!);
    });

    it('invalidates old and new identities plus all dependencies after a slug, category and price edit', async () => {
        await updateProduct(req({ slug: 'new-cinnamon', categoryId: 'new-category', variants: [{ sku: 'cinnamon', weight: 50, price: 12 }] }), response());
        expect(invalidatedPaths()).toEqual([...dependencies, '/products/old-cinnamon', '/products/new-cinnamon']);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('invalidates archived detail and listings after the archive has completed', async () => {
        await archiveProduct(req(), response());
        expect(invalidatedPaths()).toEqual([...dependencies, `/products/${initial.slug}`]);
        expect(mocks.archiveProduct.mock.invocationCallOrder[0]).toBeLessThan(fetcher.mock.invocationCallOrder[0]!);
    });

    it('invalidates image changes after their writes and audit, retaining gallery positions', async () => {
        const res = response();
        await uploadProductImages(req({}, [{ buffer: Buffer.from('image') }]), res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(mocks.createImage).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ position: 3 }) }));
        expect(invalidatedPaths()).toEqual([...dependencies, `/products/${initial.slug}`]);
        expect(mocks.audit.mock.invocationCallOrder[0]).toBeLessThan(fetcher.mock.invocationCallOrder[0]!);
    });

    it('waits for a delayed successful image write and invalidates it even when another upload failed first', async () => {
        const failure = new Error('upload failed');
        let finish!: (image: { url: string; publicId: string }) => void;
        mocks.uploadImage.mockRejectedValueOnce(failure).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const work = uploadProductImages(req({}, [{ buffer: Buffer.from('bad') }, { buffer: Buffer.from('good') }]), response());
        const rejected = expect(work).rejects.toBe(failure);
        await vi.waitFor(() => expect(mocks.uploadImage).toHaveBeenCalledTimes(2));
        expect(fetcher).not.toHaveBeenCalled();
        finish({ url: 'https://fixture.local/new.webp', publicId: 'new' });
        await rejected;
        expect(mocks.createImage).toHaveBeenCalledTimes(1);
        expect(invalidatedPaths()).toEqual([...dependencies, `/products/${initial.slug}`]);
    });

    it('does not invalidate when an edit is rejected or the record does not exist', async () => {
        mocks.updateProduct.mockRejectedValue({ code: 'P2002' });
        const conflict = response();
        await updateProduct(req({ slug: 'new-cinnamon' }), conflict);
        expect(conflict.status).toHaveBeenCalledWith(409);
        mocks.findProduct.mockResolvedValue(null);
        const missing = response();
        await archiveProduct(req(), missing);
        expect(missing.status).toHaveBeenCalledWith(404);
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('does not invalidate when every image upload fails without committing an image', async () => {
        mocks.uploadImage.mockRejectedValue(new Error('upload failed'));
        await expect(uploadProductImages(req({}, [{ buffer: Buffer.from('bad') }]), response())).rejects.toThrow('upload failed');
        expect(mocks.createImage).not.toHaveBeenCalled();
        expect(fetcher).not.toHaveBeenCalled();
    });
});


describe('Develop cache compatibility with committed product changes', () => {
    async function warmCatalog() {
        await withCache('categories:LOCAL', 300_000, async () => 'old-categories');
        await withCache('products:featured:INTERNATIONAL', 300_000, async () => 'old-highlight');
    }
    async function expectFreshCatalog() {
        expect(await withCache('categories:LOCAL', 300_000, async () => 'new-categories')).toBe('new-categories');
        expect(await withCache('products:featured:INTERNATIONAL', 300_000, async () => 'new-highlight')).toBe('new-highlight');
    }
    it.each(['create', 'update', 'archive', 'images'])('evicts committed %s views even when audit and remote invalidation fail', async operation => {
        await warmCatalog();
        const failure = new Error('audit unavailable');
        mocks.audit.mockRejectedValue(failure);
        fetcher.mockRejectedValue(new Error('remote unavailable'));
        const work = operation === 'create'
            ? createProduct(req({ name: 'Cinnamon', slug: initial.slug, description: 'Fresh Ceylon cinnamon', categoryId: 'spices', variants: [{ sku: 'cinnamon', weight: 50, price: 10 }] }), response())
            : operation === 'update' ? updateProduct(req({ slug: 'new-cinnamon' }), response())
            : operation === 'archive' ? archiveProduct(req(), response())
            : uploadProductImages(req({}, [{ buffer: Buffer.from('image') }]), response());
        await expect(work).rejects.toBe(failure);
        await expectFreshCatalog();
    });
    it('evicts successful partial image commits before preserving the sibling failure', async () => {
        await warmCatalog();
        const failure = new Error('second image failed');
        mocks.uploadImage.mockResolvedValueOnce({ url: 'https://fixture.local/image.webp', publicId: 'fixture-image' }).mockRejectedValueOnce(failure);
        await expect(uploadProductImages(req({}, [{ buffer: Buffer.from('one') }, { buffer: Buffer.from('two') }]), response())).rejects.toBe(failure);
        await expectFreshCatalog();
    });
    it('does not evict a rejected mutation that never commits', async () => {
        await warmCatalog();
        mocks.findProduct.mockResolvedValue(null);
        await updateProduct(req({ slug: 'new-cinnamon' }), response());
        expect(await withCache('categories:LOCAL', 300_000, async () => 'new')).toBe('old-categories');
    });
});
