import type { Request, Response } from 'express';
import { productFilterSchema, createProductSchema, updateProductSchema } from '@aranya/shared';
import * as productService from '../services/product.service.js';
import { uploadImage } from '../services/cloudinary.service.js';
import { prisma } from '../index.js';

// ----------------------------------------------------------------
// PUBLIC CONTROLLERS
// All public endpoints read req.market (set by resolveMarket
// middleware) and pass it into the service layer.
// Market filtering happens at the Prisma query level — not here.
// ----------------------------------------------------------------

// --- List products (public) ---
export async function listProducts(req: Request, res: Response) {
    const filters = productFilterSchema.parse(req.query);
    const products = await productService.listProducts(filters, req.market!);

    // Cursor pagination: check if there's a next page
    const hasNextPage = products.length > filters.limit;
    const items = hasNextPage ? products.slice(0, -1) : products;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return res.json({ items, nextCursor, hasNextPage, market: req.market });
}

// --- Get single product by slug (public) ---
export async function getProduct(req: Request, res: Response) {
    const slug = req.params.slug!;
    const product = await productService.getProductBySlug(slug, req.market!);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json({ product, market: req.market });
}

// --- Search autocomplete (public) ---
export async function searchProducts(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return res.json({ results: [] });

    const results = await productService.searchAutocomplete(q, req.market!);
    return res.json({ results, market: req.market });
}

// --- Featured products (public) ---
export async function getFeatured(req: Request, res: Response) {
    const products = await productService.getFeaturedProducts(req.market!);
    return res.json({ products, market: req.market });
}

// --- Bestsellers (public) ---
export async function getBestsellers(req: Request, res: Response) {
    const products = await productService.getBestsellers(req.market!);
    return res.json({ products, market: req.market });
}

// ----------------------------------------------------------------
// ADMIN CONTROLLERS
// No market filter — admins see all products across both markets.
// ----------------------------------------------------------------

// --- List all products (admin) ---
export async function adminListProducts(_req: Request, res: Response) {
    const products = await productService.adminListProducts();
    return res.json({ products });
}

// A duplicate variant SKU trips the @unique constraint (Prisma P2002).
function isDuplicateSku(err: unknown): boolean {
    return (err as { code?: string }).code === 'P2002';
}
const SKU_CONFLICT = 'A variant SKU already exists — SKUs must be unique.';

// --- Create product (admin) ---
export async function createProduct(req: Request, res: Response) {
    const data = createProductSchema.parse(req.body);
    try {
        const product = await productService.createProduct(data);
        return res.status(201).json({ product });
    } catch (err) {
        if (isDuplicateSku(err)) return res.status(409).json({ error: SKU_CONFLICT });
        throw err;
    }
}

// --- Update product (admin) ---
export async function updateProduct(req: Request, res: Response) {
    const id = req.params.id!;
    const data = updateProductSchema.parse(req.body);
    try {
        const product = await productService.updateProduct(id, data);
        return res.json({ product });
    } catch (err) {
        if (isDuplicateSku(err)) return res.status(409).json({ error: SKU_CONFLICT });
        throw err;
    }
}

// --- Upload product images (admin) ---
export async function uploadProductImages(req: Request, res: Response) {
    const id = req.params.id!;
    const files = req.files as Express.Multer.File[];

    if (!files?.length) {
        return res.status(400).json({ error: 'No images provided' });
    }

    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Compute the next position after any existing images to avoid collisions.
    const existing = await prisma.productImage.aggregate({ where: { productId: id }, _max: { position: true } });
    const basePosition = (existing._max.position ?? -1) + 1;

    const uploads = await Promise.all(
        files.map((file, index) =>
            uploadImage(file.buffer, 'aranya-ceylon/products').then((result) =>
                prisma.productImage.create({
                    data: {
                        productId: id,
                        url: result.url,
                        publicId: result.publicId,
                        position: basePosition + index,
                    },
                }),
            ),
        ),
    );

    return res.status(201).json({ images: uploads });
}

// --- Archive product (admin) ---
export async function archiveProduct(req: Request, res: Response) {
    const id = req.params.id!;
    await productService.archiveProduct(id);
    return res.json({ message: 'Product archived' });
}