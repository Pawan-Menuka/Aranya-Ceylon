import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { withCache } from '../lib/simpleCache.js';
import { getCategorySummary } from '../services/catalog.service.js';

const CATEGORY_CACHE_TTL_MS = 5 * 60_000;

export async function listCategories(req: Request, res: Response) {
    const market = req.market ?? 'INTERNATIONAL';
    if (req.query.view === 'summary') return res.json(await getCategorySummary(market));
    const categories = await withCache(`categories:${market}`, CATEGORY_CACHE_TTL_MS, () =>
        prisma.category.findMany({
            include: {
                _count: {
                    select: {
                        products: { where: { status: 'ACTIVE', market: { in: [market, 'BOTH'] } } },
                    },
                },
            },
            orderBy: { name: 'asc' },
        }),
    );
    return res.json({ categories });
}
