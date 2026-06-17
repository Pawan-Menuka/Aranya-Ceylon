import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { submitContact } from '../controllers/contact.controller.js';

const router = Router();

router.post('/', asyncHandler(submitContact));

export default router;
