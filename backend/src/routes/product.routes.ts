import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { requireAuth, requireRole } from '../middleware/authenticate.js';
import { uploadMiddleware, validateImageContent } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { adminLimiter, reviewLimiter } from '../middleware/rateLimit.js';
import * as reviewController from '../controllers/review.controller.js';
const router = Router();

// Public routes
router.get('/', asyncHandler(productController.listProducts));
router.get('/featured', asyncHandler(productController.getFeatured));
router.get('/bestsellers', asyncHandler(productController.getBestsellers));
router.get('/:slug', asyncHandler(productController.getProduct));
router.get('/:slug/reviews', asyncHandler(reviewController.listProductReviews));

// Signed-in buyers submit a review; it is held for moderation until an admin approves it.
router.post('/:id/reviews',
    asyncHandler(requireAuth), reviewLimiter,
    asyncHandler(reviewController.createReview),
);

// Admin image upload. Product create / update / archive / list live under /admin/products
// (admin.routes.ts), which is what the console calls and which is rate limited.
router.post('/:id/images',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'), adminLimiter,
    uploadMiddleware.array('images', 10),
    validateImageContent, // reject spoofed Content-Type by checking magic bytes
    asyncHandler(productController.uploadProductImages),
);

export default router;