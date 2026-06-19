import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { listGifts, getGiftBySlug } from '../controllers/gift.controller.js';

const router = Router();

router.get('/', asyncHandler(listGifts));
router.get('/:slug', asyncHandler(getGiftBySlug));

export default router;
