import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { submitWholesale } from '../controllers/wholesale.controller.js';

const router = Router();

router.post('/apply', asyncHandler(submitWholesale));

export default router;
