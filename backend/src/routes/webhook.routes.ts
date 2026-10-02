import { Router } from 'express';
import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { stripeWebhook, payHereWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Both handlers are async and Express 4 does not catch a rejected handler
// promise. Unwrapped, a transient database error while confirming a payment
// became an unhandled rejection — which terminates the Node process — instead
// of a 500. asyncHandler routes it to the error middleware, and that non-2xx
// reply is what makes the gateway retry the delivery later.

// Stripe: must use express.raw() — parsed body breaks signature verification
router.post(
    '/stripe',
    express.raw({ type: 'application/json' }),
    asyncHandler(stripeWebhook),
);

// PayHere: sends form-encoded POST — express.urlencoded() parses it
router.post(
    '/payhere',
    express.urlencoded({ extended: false }),
    asyncHandler(payHereWebhook),
);

export default router;
