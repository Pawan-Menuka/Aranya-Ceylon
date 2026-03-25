import type { Request, Response } from 'express';
import { productFilterSchema, createProductSchema, updateProductSchema } from '@aranya/shared';
import * as productService from '../services/product.service.js';
import { uploadImage } from '../services/cloudinary.service.js';

// --- List products (public) ---
export async function listProducts(req: Request, res: Response) {
    const filters = productFilterSchema.parse(req.query);
    const products = await productService.listProducts(filters);

    // Cursor pagination: check if there's a next page
    const hasNextPage = products.length > filters.limit;
    const items = hasNextPage ? products.slice(0, -1) : products;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return res.json({ items, nextCursor, hasNextPage });
}

// --- Get single product (public) ---
export async function getProduct(req: Request, res: Response) {
    const { slug } = req.params;
    const product = await productService.getProductBySlug(slug);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json({ product });
}

// --- Search autocomplete (public) ---
export async function searchProducts(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return res.json({ results: [] });

    const results = await productService.searchAutocomplete(q);
    return res.json({ results });
}

// --- Featured products (public) ---
export async function getFeatured(req: Request, res: Response) {
    const products = await productService.getFeaturedProducts();
    return res.json({ products });
}

// --- Bestsellers (public) ---
export async function getBestsellers(req: Request, res: Response) {
    const products = await productService.getBestsellers();
    return res.json({ products });
}

// --- Create product (admin) ---
export async function createProduct(req: Request, res: Response) {
    const data = createProductSchema.parse(req.body);
    const product = await productService.createProduct(data);
    return res.status(201).json({ product });
}

// --- Update product (admin) ---
export async function updateProduct(req: Request, res: Response) {
    const { id } = req.params;
    const data = updateProductSchema.parse(req.body);
    const product = await productService.updateProduct(id, data);
    return res.json({ product });
}

// --- Upload product images (admin) ---
export async function uploadProductImages(req: Request, res: Response) {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files?.length) {
        return res.status(400).json({ error: 'No images provided' });
    }

    const uploads = await Promise.all(
        files.map((file, index) =>
            uploadImage(file.buffer, 'aranya-ceylon/products').then((result) =>
                prisma_import.productImage.create({
                    data: {
                        productId: id,
                        url: result.url,
                        position: index,
                    },
                }),
            ),
        ),
    );

    return res.status(201).json({ images: uploads });
}

// --- Archive product (admin) ---
export async function archiveProduct(req: Request, res: Response) {
    const { id } = req.params;
    await productService.archiveProduct(id);
    return res.json({ message: 'Product archived' });
}

// Import prisma for image creation (avoids circular import)
import { prisma as prisma_import } from '../index.js';