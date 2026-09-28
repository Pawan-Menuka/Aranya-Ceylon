import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { constructWebhookEvent, stripe } from './stripe.service.js';

const secret = 'whsec_local_regression_fixture';
const payload = JSON.stringify({
    id: 'evt_local', object: 'event', type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_local', object: 'payment_intent', amount_received: 2599,
        currency: 'usd', metadata: { orderId: 'order_local' } } },
});
const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
beforeEach(() => { process.env.STRIPE_WEBHOOK_SECRET = secret; });
afterEach(() => {
    if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
});

describe('Stripe webhook signature verification (local, no API requests)', () => {
    it('accepts the exact signed raw body', () => {
        const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
        const event = constructWebhookEvent(Buffer.from(payload), signature);
        expect(event.id).toBe('evt_local');
        expect(event.data.object).toMatchObject({ amount_received: 2599, metadata: { orderId: 'order_local' } });
    });
    it('rejects a modified body', () => {
        const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
        expect(() => constructWebhookEvent(Buffer.from(payload.replace('2599', '1')), signature)).toThrow();
    });
    it('rejects a signature from another secret', () => {
        const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_wrong' });
        expect(() => constructWebhookEvent(Buffer.from(payload), signature)).toThrow();
    });
    it('rejects an expired signed delivery', () => {
        const signature = stripe.webhooks.generateTestHeaderString({ payload, secret,
            timestamp: Math.floor(Date.now() / 1000) - 600 });
        expect(() => constructWebhookEvent(Buffer.from(payload), signature)).toThrow();
    });
});
