import { apiFetch } from "./http";
import { withRequestDeadline } from "./request-deadline";

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
  giftWrap?: boolean;
  giftNote?: string;
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

export interface StubIntent {
  provider: "stub";
  orderId: string;
  total: number;
  currency: string;
}

export type CheckoutIntent = StripeIntent | PayHereIntent | StubIntent;

export function createIntent(input: CheckoutInput): Promise<CheckoutIntent> {
  return apiFetch(`/checkout/create-intent`, { method: "POST", body: input, auth: true });
}

export interface PaymentPollOptions {
  signal?: AbortSignal;
  /** Total budget across every read, response body, refresh and polling wait. */
  timeoutMs?: number;
}

function waitForNextPoll(intervalMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, intervalMs);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export async function pollOrderPaid(
  orderId: string,
  tries = 12,
  intervalMs = 1500,
  { signal: callerSignal, timeoutMs = 20000 }: PaymentPollOptions = {},
): Promise<boolean> {
  if (!orderId || tries <= 0 || callerSignal?.aborted) return false;
  try {
    return await withRequestDeadline(timeoutMs, callerSignal, async (signal) => {
      const deadline = Date.now() + timeoutMs;
      for (let i = 0; i < tries; i++) {
        if (signal.aborted || Date.now() >= deadline) return false;
        try {
          const { order } = await apiFetch<{ order: { status: string } }>(
            `/orders/${encodeURIComponent(orderId)}`,
            { auth: true, signal, timeoutMs: Math.min(10000, deadline - Date.now()) },
          );
          if (signal.aborted) return false;
          // The order read, never a gateway/client callback, confirms payment.
          if (order?.status && /^(paid|processing|confirmed)$/i.test(order.status)) return true;
        } catch {
          if (signal.aborted) return false;
          /* Transient read failures may retry within this single total budget. */
        }
        // A final failed attempt completes immediately, with no unused sleep.
        if (i + 1 < tries) await waitForNextPoll(intervalMs, signal);
      }
      return false;
    });
  } catch {
    // Cancellation/deadline means unconfirmed, never payment success.
    return false;
  }
}
