import { z } from 'zod';
import { emailSchema } from './auth.schema.js';

export const addToCartSchema = z.object({
    productId: z.string().min(1),
    variantId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
    quantity: z.number().int().min(0).max(99),
    // quantity 0 = remove item
});

export const applyCouponSchema = z.object({
    code: z.string().min(1).max(50).toUpperCase(),
});

export const checkoutSchema = z.object({
    // Required for guest checkout; ignored (user email used) when authenticated
    // Normalised like account emails so a guest's orders and a later account
    // with the same address match regardless of case.
    guestEmail: emailSchema.optional(),
    // Upper bounds: these are stored on the order and sent to PayHere, and
    // were otherwise limited only by the 512 KB request body.
    customerPhone: z.string().min(1).max(30).optional(),
    shippingAddress: z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        line1: z.string().min(1).max(200),
        line2: z.string().max(200).optional(),
        city: z.string().min(1).max(100),
        region: z.string().max(100).optional(),
        postalCode: z.string().max(20).optional(),
        country: z.string().min(2).max(2).transform((v) => v.toUpperCase()), // ISO 3166-1 alpha-2
    }),
    shippingMethod: z.enum(['STANDARD', 'EXPRESS']),
    saveAddress: z.boolean().default(false),
    couponCode: z.string().max(50).optional(),
    giftWrap: z.boolean().default(false),
    giftNote: z.string().max(500).optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;