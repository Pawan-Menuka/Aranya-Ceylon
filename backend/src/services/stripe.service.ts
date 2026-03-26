import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
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