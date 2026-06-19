import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authenticate.js';
import { listWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist.controller.js';

const router = Router();

router.use(asyncHandler(requireAuth));

router.get('/', asyncHandler(listWishlist));
router.post('/', asyncHandler(addToWishlist));
router.delete('/:productId', asyncHandler(removeFromWishlist));

export default router;
