import type { Request, Response } from 'express';
import type { GiftSet } from '@prisma/client';
import { prisma } from '../index.js';
import { BlogStatus } from '@prisma/client';

// Gift sets are backed by a DRAFT product whose slug is `gift-<giftSlug>` (see
// prisma/seed-gifts.ts). We attach that product's id + variants to each gift so
// the storefront can add it to the cart and check out through the normal
// product pipeline. Backing product missing (not yet seeded) → productId null,
// and the gift simply isn't purchasable yet (graceful).
async function attachBackingProducts<T extends GiftSet>(gifts: T[]) {
    if (gifts.length === 0) return [];
    const slugToGift = new Map(gifts.map((g) => [`gift-${g.slug}`, g.slug]));
    const products = await prisma.product.findMany({
        where: { slug: { in: [...slugToGift.keys()] } },
        include: { variants: true },
    });
    const byGiftSlug = new Map<string, (typeof products)[number]>();
    for (const p of products) {
        const giftSlug = slugToGift.get(p.slug);
        if (giftSlug) byGiftSlug.set(giftSlug, p);
    }
    return gifts.map((g) => {
        const p = byGiftSlug.get(g.slug);
        return { ...g, productId: p?.id ?? null, variants: p?.variants ?? [] };
    });
}

export async function listGifts(req: Request, res: Response) {
    const featured = req.query.featured === 'true' ? true : undefined;

    const gifts = await prisma.giftSet.findMany({
        where: {
            status: BlogStatus.PUBLISHED,
            ...(featured !== undefined && { featured }),
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
        take: 100,
    });

    res.json({ gifts: await attachBackingProducts(gifts) });
}

export async function getGiftBySlug(req: Request, res: Response) {
    const gift = await prisma.giftSet.findFirst({
        where: { slug: req.params.slug, status: BlogStatus.PUBLISHED },
    });

    if (!gift) {
        res.status(404).json({ error: 'Gift set not found' });
        return;
    }

    const [enriched] = await attachBackingProducts([gift]);
    res.json({ gift: enriched });
}
