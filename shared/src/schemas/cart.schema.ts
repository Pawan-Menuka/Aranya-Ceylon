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
    shippingAddress: z.object({
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        country: z.string().min(2).max(2), // ISO 3166-1 alpha-2
        postalCode: z.string().min(1),
    }),
    shippingMethod: z.enum(['STANDARD', 'EXPRESS']),
    saveAddress: z.boolean().default(false),
    // PayHere needs customer name + phone for the payment page
    customerName: z.string().min(1).optional(),
    customerPhone: z.string().min(1).optional(),
    // Required for guest checkout (no authenticated user) — where to send the
    // order confirmation. The controller enforces its presence for guests.
    guestEmail: z.string().email().optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;