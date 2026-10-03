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
router.get('/search', asyncHandler(productController.searchProducts));
router.get('/:slug', asyncHandler(productController.getProduct));
router.get('/:slug/reviews', asyncHandler(reviewController.listProductReviews));

// Signed-in buyers submit a review; it is held for moderation until an admin approves it.
router.post('/:id/reviews',
    asyncHandler(requireAuth), reviewLimiter,
    asyncHandler(reviewController.createReview),
);

// Admin routes
// Two-segment path so it can't be captured by the public GET '/:slug'.
router.get('/admin/all',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    asyncHandler(productController.adminListProducts),
);
router.post('/',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    asyncHandler(productController.createProduct),
);
router.patch('/:id',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    asyncHandler(productController.updateProduct),
);
router.post('/:id/images',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'), adminLimiter,
    uploadMiddleware.array('images', 10),
    validateImageContent, // reject spoofed Content-Type by checking magic bytes
    asyncHandler(productController.uploadProductImages),
);
router.delete('/:id',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    asyncHandler(productController.archiveProduct),
);

export default router;