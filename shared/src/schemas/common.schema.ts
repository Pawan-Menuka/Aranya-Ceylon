import { z } from 'zod';

// Reusable pagination schema — used by products, orders, blog etc.
export const paginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(12),
});

export type PaginationInput = z.infer<typeof paginationSchema>;