import { z } from 'zod';

export const createProductSchema = z.object({
    name: z.string().min(2).max(200),
    slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
    description: z.string().min(10),
    categoryId: z.string().min(1),
    certifications: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    variants: z.array(z.object({
        weight: z.number().int().positive(),
        price: z.number().positive(),
        sku: z.string().min(1),
        stock: z.number().int().min(0).default(0),
    })).min(1, 'At least one variant is required'),
});

export const updateProductSchema = createProductSchema.partial();

export const productFilterSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(12),
    category: z.string().optional(),
    featured: z.coerce.boolean().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'bestselling']).default('newest'),
    search: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;