import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(cartController.getCart));
router.post('/items', asyncHandler(cartController.addItem));
router.patch('/items/:itemId', asyncHandler(cartController.updateItem));
router.post('/coupon', asyncHandler(cartController.applyCoupon));

export default router;