import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/authenticate.js';

const router = Router();

// optionalAuth: silently populates req.user when a Bearer token is present.
// Falls through as guest if no token — allows both guest and authenticated shopping.
router.use(asyncHandler(optionalAuth));

router.get('/', asyncHandler(cartController.getCart));
router.post('/items', asyncHandler(cartController.addItem));
router.patch('/items/:itemId', asyncHandler(cartController.updateItem));
router.delete('/items/:itemId', asyncHandler(cartController.removeItem));
router.post('/coupon', asyncHandler(cartController.applyCoupon));

export default router;