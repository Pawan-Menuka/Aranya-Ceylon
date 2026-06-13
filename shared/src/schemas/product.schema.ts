import { z } from 'zod';

// A product variant on create. market/currency are optional (default BOTH/LKR
// preserves prior behaviour) so the admin can author per-market variants.
const variantInput = z.object({
    weight: z.number().int().positive(),
    price: z.number().positive(),
    sku: z.string().min(1),
    stock: z.number().int().min(0).default(0),
    market: z.enum(['LOCAL', 'INTERNATIONAL', 'BOTH']).default('BOTH'),
    currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']).default('LKR'),
});

export const createProductSchema = z.object({
    name: z.string().min(2).max(200),
    slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
    description: z.string().min(10),
    categoryId: z.string().min(1),
    certifications: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    latin: z.string().optional().nullable(),
    originLabel: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    variants: z.array(variantInput).min(1, 'At least one variant is required'),
});

// Update is partial on product fields. Variants, when provided, are reconciled
// by id: an `id` means "update this variant"; no `id` means "create"; existing
// variants absent from the array are removed (only if unreferenced by orders).
export const updateProductSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().min(10).optional(),
    categoryId: z.string().min(1).optional(),
    certifications: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    latin: z.string().optional().nullable(),
    originLabel: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    variants: z.array(variantInput.extend({ id: z.string().optional() })).min(1).optional(),
});

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