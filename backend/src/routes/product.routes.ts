import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { requireAuth, requireRole } from '../middleware/authenticate.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
const router = Router();

// Public routes
router.get('/', asyncHandler(productController.listProducts));
router.get('/featured', asyncHandler(productController.getFeatured));
router.get('/bestsellers', asyncHandler(productController.getBestsellers));
router.get('/search', asyncHandler(productController.searchProducts));
router.get('/:slug', asyncHandler(productController.getProduct));

// Admin routes
router.post('/',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    asyncHandler(productController.createProduct),
);
router.patch('/:id',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    asyncHandler(productController.updateProduct),
);
router.post('/:id/images',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    uploadMiddleware.array('images', 10),
    asyncHandler(productController.uploadProductImages),
);
router.delete('/:id',
    asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'),
    asyncHandler(productController.archiveProduct),
);

export default router;