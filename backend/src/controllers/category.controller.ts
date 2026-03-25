import type { Request, Response } from 'express';
import { prisma } from '../index.js';

export async function listCategories(_req: Request, res: Response) {
    const categories = await prisma.category.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
    });
    return res.json({ categories });
}