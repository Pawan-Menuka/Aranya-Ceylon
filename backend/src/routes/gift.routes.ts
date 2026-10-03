import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { listGifts } from '../controllers/gift.controller.js';

const router = Router();

router.get('/', asyncHandler(listGifts));

export default router;
