import type { Request, Response } from 'express';
import { prisma } from '../index.js';

export async function listCategories(req: Request, res: Response) {
    const market = req.market ?? 'INTERNATIONAL';
    const categories = await prisma.category.findMany({
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
    });
    return res.json({ categories });
}