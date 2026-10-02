import { z } from 'zod';

const pageFields = {
    view: z.literal('page'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().min(1).max(2048).optional(),
    q: z.string().trim().max(200).default(''),
};
const status = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).optional();
export const adminProductPageSchema = z.object({
    ...pageFields,
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    lowStock: z.enum(['true', 'false']).optional().transform(value => value === undefined ? undefined : value === 'true'),
});
export const adminContentPageSchema = z.object({ ...pageFields, status });
export const adminAuditPageSchema = z.object({
    ...pageFields,
    filter: z.enum(['all', 'admin', 'warn', 'job']).default('all'),
    event: z.string().min(1).max(100).optional(),
    targetType: z.string().min(1).max(100).optional(),
    actorId: z.string().min(1).max(200).optional(),
});
export const publicSearchSchema = z.object({
    q: z.string().trim().max(200).default(''),
    sort: z.enum(['relevance', 'price-asc', 'price-desc', 'rating']).default('relevance'),
    resource: z.enum(['all', 'products', 'journal']).default('all'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    productCursor: z.string().min(1).max(2048).optional(),
    journalCursor: z.string().min(1).max(2048).optional(),
});
export type AdminProductPageInput = z.infer<typeof adminProductPageSchema>;
export type AdminContentPageInput = z.infer<typeof adminContentPageSchema>;
export type AdminAuditPageInput = z.infer<typeof adminAuditPageSchema>;
export type PublicSearchInput = z.infer<typeof publicSearchSchema>;
export interface PageMetadata {
    total: number;
    nextCursor: string | null;
    hasNextPage: boolean;
}
export interface SearchPage<T> extends PageMetadata { items: T[] }
