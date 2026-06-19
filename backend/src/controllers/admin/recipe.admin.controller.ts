import type { Request, Response } from 'express';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { z } from 'zod';

const ingredientGroupSchema = z.object({
    group: z.string().optional(),
    items: z.array(z.string()),
});

const recipeSchema = z.object({
    title: z.string().min(2),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    dek: z.string().min(2),
    course: z.string().min(1),
    accent: z.string().default('#3C3A36'),
    slot: z.string().default(''),
    featured: z.boolean().default(false),
    prepMins: z.number().int().min(0).default(0),
    cookMins: z.number().int().min(0).default(0),
    serves: z.number().int().min(0).default(0),
    difficulty: z.string().default('Easy'),
    intro: z.string().default(''),
    spices: z.array(z.string()).default([]),
    ingredients: z.array(ingredientGroupSchema).default([]),
    method: z.array(z.string()).default([]),
    tips: z.array(z.string()).default([]),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export async function listRecipes(_req: Request, res: Response) {
    const recipes = await prisma.recipe.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, slug: true, title: true, course: true,
            difficulty: true, featured: true, status: true,
            prepMins: true, cookMins: true, serves: true, createdAt: true,
        },
    });
    res.json({ recipes });
}

export async function getRecipe(req: Request, res: Response) {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id! } });
    if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
    res.json({ recipe });
}

export async function createRecipe(req: Request, res: Response) {
    const data = recipeSchema.parse(req.body);

    const recipe = await prisma.recipe.create({ data });

    await writeAuditLog({
        req, event: 'RECIPE_CREATE',
        targetType: 'Recipe', targetId: recipe.id,
    });

    res.status(201).json({ recipe });
}

export async function updateRecipe(req: Request, res: Response) {
    const id = req.params.id!;
    const data = recipeSchema.partial().parse(req.body);

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Recipe not found' }); return; }

    const recipe = await prisma.recipe.update({ where: { id }, data });

    await revalidateFrontend(`/recipes/${recipe.slug}`);
    await revalidateFrontend('/recipes');

    res.json({ recipe });
}

export async function deleteRecipe(req: Request, res: Response) {
    const id = req.params.id!;

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Recipe not found' }); return; }

    await prisma.recipe.delete({ where: { id } });

    await writeAuditLog({
        req, event: 'RECIPE_DELETE',
        targetType: 'Recipe', targetId: id,
    });

    res.json({ ok: true });
}

async function revalidateFrontend(path: string) {
    const secret = process.env.REVALIDATION_SECRET;
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    if (!secret) return;
    try {
        await fetch(`${baseUrl}/api/revalidate?secret=${secret}&path=${encodeURIComponent(path)}`);
    } catch { /* non-fatal */ }
}
