import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/authenticate.js';
import { createIntent, stubComplete } from '../controllers/checkout.controller.js';

const router = Router();

// optionalAuth: works for both authenticated users and guests (#17).
router.post('/create-intent', asyncHandler(optionalAuth), asyncHandler(createIntent));

// Stub-mode payment confirmation (no-op in live mode — see controller).
router.post('/stub/complete', asyncHandler(optionalAuth), asyncHandler(stubComplete));

export default router;
