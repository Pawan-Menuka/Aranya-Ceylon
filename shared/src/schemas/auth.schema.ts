import { z } from 'zod';

// Every email that identifies an account is trimmed and lower-cased before it
// reaches the database. Without this "John@Gmail.com" and "john@gmail.com"
// were two different accounts, and signing in with a different case than at
// registration failed with "invalid email or password".
export const emailSchema = z.string().trim().toLowerCase().max(254).email('Invalid email address');

// bcrypt only uses the first 72 bytes; the cap stops unbounded input, not
// strong passphrases.
const newPasswordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: emailSchema,
    password: newPasswordSchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    // Deliberately looser than newPasswordSchema: sign-in must not reveal the
    // password rules, only bound the input.
    password: z.string().min(1, 'Password is required').max(1024),
});

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1).max(200),
    password: newPasswordSchema,
});

export const patchMeSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(30).optional(),
    newsletterOptIn: z.boolean().optional(),
});

const addressFields = {
    label: z.string().max(50).optional(),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    country: z.string().length(2).transform((v) => v.toUpperCase()),
    postalCode: z.string().max(20).optional(),
    isDefault: z.boolean().optional(),
};

export const createAddressSchema = z.object(addressFields);

export const updateAddressSchema = z.object({
    ...addressFields,
    line1: addressFields.line1.optional(),
    city: addressFields.city.optional(),
    country: z.string().length(2).transform((v) => v.toUpperCase()).optional(),
});

// TypeScript types auto-derived from Zod schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PatchMeInput = z.infer<typeof patchMeSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;