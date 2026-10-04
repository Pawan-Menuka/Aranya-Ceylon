import { z } from 'zod';

// Admin-side coupon management. Customer-facing apply/remove lives in cart.schema.ts.

/** Stored upper-case, exactly as the apply-coupon endpoint normalises what a shopper types. */
export const adminCouponCodeSchema = z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,32}$/, 'Use 3–32 letters, numbers, dashes or underscores');

const money = z.coerce
    .number()
    .positive('Must be greater than zero')
    .max(1_000_000)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'At most two decimal places');

export const createCouponSchema = z
    .object({
        code: adminCouponCodeSchema,
        discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
        discountValue: money,
        // A fixed amount is money, so it must name its store's currency; a
        // percentage works in any store and must not name one.
        currency: z.enum(['LKR', 'USD']).optional(),
        usageLimit: z.coerce.number().int().positive().max(1_000_000).optional(),
        expiresAt: z.coerce.date().optional(),
    })
    .superRefine((coupon, ctx) => {
        if (coupon.discountType === 'PERCENTAGE') {
            if (coupon.discountValue > 100) {
                ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'A percentage cannot exceed 100' });
            }
            if (coupon.currency) {
                ctx.addIssue({ code: 'custom', path: ['currency'], message: 'A percentage coupon applies in every store; leave currency empty' });
            }
        } else if (!coupon.currency) {
            ctx.addIssue({ code: 'custom', path: ['currency'], message: 'A fixed-amount coupon needs a currency (LKR or USD)' });
        }
        if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
            ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry must be in the future' });
        }
    });

/**
 * Only the limit and the expiry can change after creation. Changing a coupon's
 * type, value or currency would silently reprice orders that already used it.
 * `null` clears the limit / expiry.
 */
export const updateCouponSchema = z
    .object({
        usageLimit: z.coerce.number().int().positive().max(1_000_000).nullable().optional(),
        expiresAt: z.coerce.date().nullable().optional(),
    })
    .refine((patch) => patch.usageLimit !== undefined || patch.expiresAt !== undefined, 'Nothing to update');

export const listCouponsQuerySchema = z.object({
    status: z.enum(['active', 'expired']).optional(),
    search: z.string().trim().max(32).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(40).optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
