import { Router } from 'express';
import express from 'express';
import { stripeWebhook, payHereWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Stripe: must use express.raw() — parsed body breaks signature verification
router.post(
    '/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhook,
);

// PayHere: sends form-encoded POST — express.urlencoded() parses it
router.post(
    '/payhere',
    express.urlencoded({ extended: false }),
    payHereWebhook,
);

export default router;