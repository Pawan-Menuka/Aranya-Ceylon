import type { Request, Response } from 'express';
import { prisma } from '../index.js';
import { Prisma } from '@prisma/client';

export async function listWishlist(req: Request, res: Response) {
    const market = req.market ?? 'INTERNATIONAL';
    const items = await prisma.wishlistItem.findMany({
        where: { userId: req.user!.userId },
        include: {
            product: {
                select: {
                    id: true, name: true, slug: true, description: true,
                    featured: true, market: true, color: true, latin: true,
                    variants: {
                        where: { market: { in: [market, 'BOTH'] } },
                        select: { id: true, weight: true, price: true, currency: true, market: true, stock: true },
                    },
                    category: { select: { id: true, name: true, slug: true } },
                },
            },
        },
        orderBy: { addedAt: 'desc' },
    });
    return res.json({ items });
}

export async function addToWishlist(req: Request, res: Response) {
    const { productId } = req.body as { productId?: string };
    if (!productId) return res.status(400).json({ error: 'productId is required.' });

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    try {
        const item = await prisma.wishlistItem.create({
            data: { userId: req.user!.userId, productId },
        });
        return res.status(201).json({ item });
    } catch (err) {
        // P2002 = unique constraint — already wishlisted
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return res.status(409).json({ error: 'Product is already in wishlist.' });
        }
        throw err;
    }
}

export async function removeFromWishlist(req: Request, res: Response) {
    const { productId } = req.params;
    const userId = req.user!.userId;

    const item = await prisma.wishlistItem.findFirst({ where: { userId, productId } });
    if (!item) return res.status(404).json({ error: 'Item not in wishlist.' });

    await prisma.wishlistItem.delete({ where: { id: item.id } });
    return res.json({ ok: true });
}
