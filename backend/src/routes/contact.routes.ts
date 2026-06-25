import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { submitContact } from '../controllers/contact.controller.js';

const router = Router();

router.post('/', contactLimiter, asyncHandler(submitContact));

export default router;
