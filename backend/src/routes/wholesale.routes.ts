import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { submitWholesale } from '../controllers/wholesale.controller.js';
import { contactLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Same anti-spam limiter as the contact form (5/hr/IP). Previously this public,
// unauthenticated endpoint relied only on the generous global limiter (SEC-05).
router.post('/apply', contactLimiter, asyncHandler(submitWholesale));

export default router;
