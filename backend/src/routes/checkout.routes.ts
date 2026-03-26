import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authenticate.js';
import { createIntent } from '../controllers/checkout.controller.js';

const router = Router();

router.post('/create-intent', asyncHandler(requireAuth), asyncHandler(createIntent));

export default router;