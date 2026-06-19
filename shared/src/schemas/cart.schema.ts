import { z } from 'zod';

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
    guestEmail: z.string().email().optional(),
    customerPhone: z.string().min(1).optional(),
    shippingAddress: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        region: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().min(2).max(2), // ISO 3166-1 alpha-2
    }),
    shippingMethod: z.enum(['STANDARD', 'EXPRESS']),
    saveAddress: z.boolean().default(false),
    couponCode: z.string().optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;