import { z } from 'zod';

// A product variant on create. market/currency are optional (default BOTH/LKR
// preserves prior behaviour) so the admin can author per-market variants.
const variantShape = z.object({
    weight: z.number().int().positive(),
    price: z.number().positive(),
    sku: z.string().min(1),
    stock: z.number().int().min(0).default(0),
    market: z.enum(['LOCAL', 'INTERNATIONAL', 'BOTH']).default('BOTH'),
    currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']).default('LKR'),
});

function refineVariantMarket<T extends { market: string; currency: string }>(v: T, ctx: z.RefinementCtx) {
    if (v.market === 'LOCAL' && v.currency !== 'LKR') {
        ctx.addIssue({ code: 'custom', path: ['currency'], message: 'LOCAL variants must use LKR' });
    }
    if (v.market === 'INTERNATIONAL' && v.currency === 'LKR') {
        ctx.addIssue({ code: 'custom', path: ['currency'], message: 'INTERNATIONAL variants must not use LKR' });
    }
}

const variantInput = variantShape.superRefine(refineVariantMarket);

export const createProductSchema = z.object({
    name: z.string().min(2).max(200),
    slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
    description: z.string().min(10),
    categoryId: z.string().min(1),
    certifications: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    // Lifecycle status. Without this, admin-created products were stuck DRAFT
    // forever and could never appear on the storefront (public queries filter
    // status=ACTIVE) — BUG-08. Defaults to DRAFT to preserve prior behaviour.
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
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
    slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only').optional(),
    description: z.string().min(10).optional(),
    categoryId: z.string().min(1).optional(),
    certifications: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    // Lets the admin console's active/archive toggle actually take effect (BUG-08).
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    latin: z.string().optional().nullable(),
    originLabel: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    variants: z.array(variantShape.extend({ id: z.string().optional() }).superRefine(refineVariantMarket)).min(1).optional(),
});

export const productFilterSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(12),
    category: z.string().optional(),
    // z.coerce.boolean() treats ANY non-empty string as true, so ?featured=false
    // returned featured products (BUG-13). Parse the literal tokens instead.
    featured: z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'bestselling']).default('newest'),
    search: z.string().optional(),
}).superRefine((v, ctx) => {
    if (v.minPrice !== undefined && v.maxPrice !== undefined && v.minPrice > v.maxPrice) {
        ctx.addIssue({ code: 'custom', path: ['minPrice'], message: 'minPrice must be ≤ maxPrice' });
    }
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
