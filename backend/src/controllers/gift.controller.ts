import type { Request, Response } from 'express';
import { prisma } from '../index.js';
import { BlogStatus } from '@prisma/client';

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

    res.json({ gifts });
}

export async function getGiftBySlug(req: Request, res: Response) {
    const gift = await prisma.giftSet.findFirst({
        where: { slug: req.params.slug, status: BlogStatus.PUBLISHED },
    });

    if (!gift) {
        res.status(404).json({ error: 'Gift set not found' });
        return;
    }

    res.json({ gift });
}
