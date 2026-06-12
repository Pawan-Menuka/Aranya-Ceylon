import Stripe from 'stripe';

// Fallback placeholder so the module imports without a key in stub payment mode
// (PAYMENTS_MODE !== 'live'). Real API calls only happen in live mode, which
// requires a real STRIPE_SECRET_KEY.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_stub_unused', {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
});

// Amount is always calculated server-side — never trust the client
export async function createPaymentIntent(
    amountInCents: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {},
) {
    return stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: { enabled: true },
    });
}

// Verify webhook signature — ensures the request came from Stripe
export function constructWebhookEvent(payload: Buffer, signature: string) {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
    );
}