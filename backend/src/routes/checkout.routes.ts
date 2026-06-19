import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/authenticate.js';
import { createIntent, stubComplete } from '../controllers/checkout.controller.js';

const router = Router();

// optionalAuth: guests get req.user = undefined; authenticated users get req.user populated.
// Guest cart is resolved by the guestCartToken cookie forwarded by the BFF.
router.post('/create-intent', asyncHandler(optionalAuth), asyncHandler(createIntent));

// Stub-mode payment confirmation — no-op in live mode (controller guards with isStubPayments()).
router.post('/stub/complete', asyncHandler(optionalAuth), asyncHandler(stubComplete));

export default router;
