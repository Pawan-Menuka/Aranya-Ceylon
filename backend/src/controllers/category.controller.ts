import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { withCache } from '../lib/simpleCache.js';

// Category list + per-category active-product counts change only when an
// admin edits the catalog — cheap to cache for a few minutes (perf audit #6).
const CATEGORY_CACHE_TTL_MS = 5 * 60_000;

export async function listCategories(req: Request, res: Response) {
    const market = req.market ?? 'INTERNATIONAL';
    const categories = await withCache(`categories:${market}`, CATEGORY_CACHE_TTL_MS, () =>
        prisma.category.findMany({
            include: {
                _count: {
                    select: {
                        products: {
                            where: {
                                status: 'ACTIVE',
                                market: { in: [market, 'BOTH'] },
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        }),
    );
    return res.json({ categories });
}
