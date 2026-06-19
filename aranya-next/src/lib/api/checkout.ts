import { apiFetch } from "./http";

// Spec §6 — checkout / payments.
//   intl  → Stripe PaymentIntent (clientSecret → Stripe Elements)
//   local → PayHere (returns signed params for a hidden POST form redirect)
// The order is created server-side from the authoritative cart; the client sends
// only contact/shipping/options. After payment the success state polls
// GET /orders/:id until the webhook flips status to PAID.

export interface CheckoutInput {
  guestEmail?: string;       // required when not authenticated
  customerPhone?: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode?: string;
    country: string;           // ISO 3166-1 alpha-2 e.g. "LK", "US"
  };
  shippingMethod: "STANDARD" | "EXPRESS";
  saveAddress?: boolean;
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
  action: string;                    // PayHere checkout URL
  params: Record<string, string>;    // signed fields for the hidden form
}

export type CheckoutIntent = StripeIntent | PayHereIntent;

export function createIntent(input: CheckoutInput): Promise<CheckoutIntent> {
  return apiFetch(`/checkout/create-intent`, { method: "POST", body: input, auth: true });
}

export async function pollOrderPaid(orderId: string, tries = 12, intervalMs = 1500): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try {
      const { order } = await apiFetch<{ order: { status: string } }>(
        `/orders/${encodeURIComponent(orderId)}`,
        { auth: true },
      );
      if (order?.status && /paid|processing|confirmed/i.test(order.status)) return true;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
