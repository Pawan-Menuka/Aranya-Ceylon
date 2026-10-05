import { adminContentPageSchema } from '@aranya/shared';
import { listAdminPage } from '../../services/admin-page.service.js';
import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { auditPublicMutation } from '../../lib/audit-public-mutation.js';
import { publicMutation } from '../../lib/public-mutation.js';
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

export async function listRecipes(req: Request, res: Response) {
    if (req.query.view === 'page') return res.json(await listAdminPage('recipes', adminContentPageSchema.parse(req.query)));
    const recipes = await prisma.recipe.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500, // bound an otherwise unlimited load (PERF-07)
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

    let recipe;
    try {
        recipe = await publicMutation(tx => tx.recipe.create({ data }), result => data.status === 'PUBLISHED' ? ['/recipes', '/search', `/recipes/${result.slug}`] : []);
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            res.status(409).json({ error: 'A recipe with that slug already exists' }); return;
        }
        throw err;
    }

    await auditPublicMutation({
        req, event: 'RECIPE_CREATE',
        targetType: 'Recipe', targetId: recipe.id,
    }, data.status === 'PUBLISHED' ? ['/recipes', '/search', `/recipes/${recipe.slug}`] : []);

    res.status(201).json({ recipe });
}

export async function updateRecipe(req: Request, res: Response) {
    const id = req.params.id!;
    const data = recipeSchema.partial().parse(req.body);

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Recipe not found' }); return; }

    let recipe;
    try {
        recipe = await publicMutation(tx => tx.recipe.update({ where: { id }, data }), result => ['/recipes', '/search', `/recipes/${existing.slug}`, `/recipes/${result.slug}`]);
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            res.status(409).json({ error: 'A recipe with that slug already exists' }); return;
        }
        throw err;
    }

    // P3-3: audit log for updates (was missing)
    await auditPublicMutation({
        req, event: 'RECIPE_UPDATE',
        targetType: 'Recipe', targetId: id,
        diff: { before: existing, after: recipe },
    }, ['/recipes', '/search', `/recipes/${existing.slug}`, `/recipes/${recipe.slug}`]);

    res.json({ recipe });
}

export async function deleteRecipe(req: Request, res: Response) {
    const id = req.params.id!;

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Recipe not found' }); return; }

    await publicMutation(tx => tx.recipe.delete({ where: { id } }), () => ['/recipes', '/search', `/recipes/${existing.slug}`]);

    await auditPublicMutation({
        req, event: 'RECIPE_DELETE',
        targetType: 'Recipe', targetId: id,
    }, ['/recipes', '/search', `/recipes/${existing.slug}`]);

    res.json({ ok: true });
}
