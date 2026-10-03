import { z } from 'zod';

// SUPERADMIN-only user management (final audit #43).

export const adminListUsersQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    role: z.enum(['CUSTOMER', 'ADMIN', 'SUPERADMIN']).optional(),
    suspended: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(40).optional(),
});

export const changeUserRoleSchema = z.object({
    role: z.enum(['CUSTOMER', 'ADMIN', 'SUPERADMIN']),
});

export const suspendUserSchema = z.object({
    // Kept in the audit trail only; never shown to the user.
    reason: z.string().trim().max(200).optional(),
});
