import type { Request, Response } from 'express';
import { prisma } from '../index.js';

export async function listRecipes(req: Request, res: Response) {
    // Coerce to a single string — a duplicated param makes req.query.course an array.
    const rawCourse = req.query.course;
    const course = Array.isArray(rawCourse) ? rawCourse[0] : (rawCourse as string | undefined);

    const recipes = await prisma.recipe.findMany({
        where: {
            status: 'PUBLISHED',
            ...(course && course !== 'All' ? { course } : {}),
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
        take: 100,
    });

    return res.json({ recipes });
}

export async function getRecipeBySlug(req: Request, res: Response) {
    const { slug } = req.params;

    const recipe = await prisma.recipe.findFirst({
        where: { slug, status: 'PUBLISHED' },
    });

    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    return res.json({ recipe });
}
