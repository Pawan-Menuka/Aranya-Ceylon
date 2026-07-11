import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth, requireAuth } from '../middleware/authenticate.js';

const router = Router();

// optionalAuth: silently populates req.user when a Bearer token is present.
// Falls through as guest if no token — allows both guest and authenticated shopping.
router.use(asyncHandler(optionalAuth));

router.get('/', asyncHandler(cartController.getCart));
router.get('/totals', asyncHandler(cartController.getCartTotals));
router.post('/items', asyncHandler(cartController.addItem));
router.patch('/items/:itemId', asyncHandler(cartController.updateItem));
router.delete('/items/:itemId', asyncHandler(cartController.removeItem));
// Empty the whole cart (store switch / explicit clear).
router.delete('/', asyncHandler(cartController.clearCart));
router.post('/coupon', asyncHandler(cartController.applyCoupon));
// Merge the guest cart into the user's cart on login (auth required).
router.post('/merge', asyncHandler(requireAuth), asyncHandler(cartController.mergeCart));

export default router;