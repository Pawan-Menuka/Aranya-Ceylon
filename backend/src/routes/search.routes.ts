import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { search } from '../controllers/search.controller.js';

const router = Router();
router.get('/', asyncHandler(search));
export default router;
