import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { requireAuth, requireRole } from '../middleware/authenticate.js';
import { uploadMiddleware, validateImageContent } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
const router = Router();

// Public routes
router.get('/', asyncHandler(productController.listProducts));
router.get('/featured', asyncHandler(productController.getFeatured));
router.get('/bestsellers', asyncHandler(productController.getBestsellers));
router.get('/:slug', asyncHandler(productController.getProduct));

// Admin image upload. Product create / update / archive / list live under /admin/products
// (admin.routes.ts), which is what the console calls and which is rate limited.
router.post('/:id/images',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    uploadMiddleware.array('images', 10),
    validateImageContent, // reject spoofed Content-Type by checking magic bytes
    asyncHandler(productController.uploadProductImages),
);

export default router;