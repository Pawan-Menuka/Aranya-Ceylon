import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/authenticate.js';
import { checkoutLimiter } from '../middleware/rateLimit.js';
import { createIntent, stubComplete } from '../controllers/checkout.controller.js';

const router = Router();

// optionalAuth: guests get req.user = undefined; authenticated users get req.user populated.
// Guest cart is resolved by the guestCartToken cookie forwarded by the BFF.
// checkoutLimiter caps abuse of the billable Stripe PaymentIntent call.
router.post('/create-intent', checkoutLimiter, asyncHandler(optionalAuth), asyncHandler(createIntent));

// Stub-mode payment confirmation — no-op in live mode (controller guards with isStubPayments()).
router.post('/stub/complete', checkoutLimiter, asyncHandler(optionalAuth), asyncHandler(stubComplete));

export default router;
