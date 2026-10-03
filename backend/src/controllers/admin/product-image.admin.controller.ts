import type { Request, Response } from 'express';
import { reorderProductImagesSchema } from '@aranya/shared';
import { prisma } from '../../lib/prisma.js';
import { auditPublicMutation } from '../../lib/audit-public-mutation.js';
import { deleteImage } from '../../services/cloudinary.service.js';

// Remove and reorder a product's images (final audit #44). Uploading stays on
// POST /products/:id/images. Position 0 is the lead image.

// Image changes show on cards, the catalog, search, recipes and gifts as well as the product page.
const imagePaths = (slug: string) => ['/', '/products', '/categories', '/search', '/recipes', '/gifts', `/products/${slug}`];

export async function deleteProductImage(req: Request, res: Response) {
    const { id: productId, imageId } = req.params as { id: string; imageId: string };

    // Matching on both ids means an image id from another product cannot be removed through this one.
    const image = await prisma.productImage.findFirst({
        where: { id: imageId, productId },
        select: { id: true, publicId: true, product: { select: { slug: true } } },
    });
    if (!image) { res.status(404).json({ error: 'Image not found' }); return; }

    await prisma.productImage.delete({ where: { id: image.id } });

    // The database row is the source of truth. A failed Cloudinary cleanup only leaves an
    // unreferenced file behind, so it is logged (without the id) and does not fail the request.
    let storageCleaned = true;
    if (image.publicId) {
        try { await deleteImage(image.publicId); } catch {
            storageCleaned = false;
            console.warn('[images] Could not remove a deleted product image from storage.');
        }
    }

    await auditPublicMutation({
        req, event: 'PRODUCT_IMAGE_DELETE', targetType: 'Product', targetId: productId,
        diff: { imageId, storageCleaned },
    }, imagePaths(image.product.slug));

    res.json({ deleted: true, storageCleaned });
}

export async function reorderProductImages(req: Request, res: Response) {
    const productId = req.params.id!;
    const { imageIds } = reorderProductImagesSchema.parse(req.body);

    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { slug: true, images: { select: { id: true } } },
    });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    // The new order must list exactly this product's images: none missing, none foreign.
    const current = new Set(product.images.map((image) => image.id));
    if (imageIds.length !== current.size || !imageIds.every((id) => current.has(id))) {
        res.status(400).json({ error: 'List every image of this product exactly once.', code: 'IMAGE_SET_MISMATCH' });
        return;
    }

    await prisma.$transaction(imageIds.map((id, position) => prisma.productImage.update({ where: { id }, data: { position } })));

    await auditPublicMutation({
        req, event: 'PRODUCT_IMAGE_REORDER', targetType: 'Product', targetId: productId,
        diff: { order: imageIds },
    }, imagePaths(product.slug));

    res.json({ order: imageIds });
}
