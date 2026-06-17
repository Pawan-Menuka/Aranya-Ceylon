import { apiFetch } from "./http";

// Spec §6 — checkout / payments.
//   intl  → Stripe PaymentIntent (client_secret → Stripe Elements)
//   local → PayHere (returns a signed param set for the hosted form/redirect)
// The order is created server-side from the authoritative cart, so the client
// sends only contact/shipping/options. After payment, the success state polls
// GET /orders/:id until the webhook flips status to PAID (webhook may lag).

export interface CheckoutInput {
  email: string;
  phone?: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode?: string;
    country: string;
  };
  deliveryMethod: "standard" | "express";
  giftWrap?: boolean;
  giftNote?: string;
  couponCode?: string;
}

export interface StripeIntent {
  provider: "stripe";
  orderId: string;
  clientSecret: string;
  publishableKey: string;
}
export interface PayHereIntent {
  provider: "payhere";
  orderId: string;
  // signed param set for the PayHere hosted form
  params: Record<string, string>;
  action: string; // form POST target (sandbox/live)
}
export type CheckoutIntent = StripeIntent | PayHereIntent;

export function createIntent(input: CheckoutInput): Promise<CheckoutIntent> {
  return apiFetch(`/checkout/create-intent`, { method: "POST", body: input, auth: true });
}

// Poll an order until it is paid (or a sane attempt budget runs out).
export async function pollOrderPaid(orderId: string, tries = 10, intervalMs = 1500): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try {
      const { order } = await apiFetch<{ order: { status: string } }>(`/orders/${encodeURIComponent(orderId)}`, { auth: true });
      if (order?.status && /paid|processing|confirmed/i.test(order.status)) return true;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
