import { listAuditLogs } from '../controllers/admin/audit-page.controller.js';
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { adminLimiter } from '../middleware/rateLimit.js';
import * as orderAdmin from '../controllers/admin/order.admin.controller.js';
import * as blogAdmin from '../controllers/admin/blog.admin.controller.js';
import * as recipeAdmin from '../controllers/admin/recipe.admin.controller.js';
import * as giftAdmin from '../controllers/admin/gift.admin.controller.js';
import * as couponAdmin from '../controllers/admin/coupon.admin.controller.js';
import * as reviewAdmin from '../controllers/admin/review.admin.controller.js';
import * as analyticsAdmin from '../controllers/admin/analytics.admin.controller.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

// All admin routes require auth + ADMIN or SUPERADMIN role
router.use(asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'), adminLimiter);

// --- Analytics ---
router.get('/dashboard', asyncHandler(analyticsAdmin.getDashboard));
router.get('/audit-logs', asyncHandler(listAuditLogs));

// --- Orders ---
router.get('/orders', asyncHandler(orderAdmin.listOrders));
router.get('/orders/:id', asyncHandler(orderAdmin.getOrder));
router.patch('/orders/:id', asyncHandler(orderAdmin.updateOrderStatus));
router.post('/orders/:id/refund', asyncHandler(orderAdmin.refundOrder));

// --- Blog ---
router.get('/blogs', asyncHandler(blogAdmin.listBlogs));
router.get('/blogs/:id', asyncHandler(blogAdmin.getBlog));
router.post('/blogs', asyncHandler(blogAdmin.createBlog));
router.patch('/blogs/:id', asyncHandler(blogAdmin.updateBlog));
router.delete('/blogs/:id', asyncHandler(blogAdmin.deleteBlog));

// --- Recipes ---
router.get('/recipes', asyncHandler(recipeAdmin.listRecipes));
router.get('/recipes/:id', asyncHandler(recipeAdmin.getRecipe));
router.post('/recipes', asyncHandler(recipeAdmin.createRecipe));
router.patch('/recipes/:id', asyncHandler(recipeAdmin.updateRecipe));
router.delete('/recipes/:id', asyncHandler(recipeAdmin.deleteRecipe));

// --- Gifts ---
router.get('/gifts', asyncHandler(giftAdmin.listGifts));
router.get('/gifts/:id', asyncHandler(giftAdmin.getGift));
router.post('/gifts', asyncHandler(giftAdmin.createGift));
router.patch('/gifts/:id', asyncHandler(giftAdmin.updateGift));
router.delete('/gifts/:id', asyncHandler(giftAdmin.deleteGift));

// --- Coupons ---
router.get('/coupons', asyncHandler(couponAdmin.listCoupons));
router.get('/coupons/:id', asyncHandler(couponAdmin.getCoupon));
router.post('/coupons', asyncHandler(couponAdmin.createCoupon));
router.patch('/coupons/:id', asyncHandler(couponAdmin.updateCoupon));
router.post('/coupons/:id/deactivate', asyncHandler(couponAdmin.deactivateCoupon));

// --- Reviews (moderation) ---
router.get('/reviews', asyncHandler(reviewAdmin.listReviews));
router.patch('/reviews/:id', asyncHandler(reviewAdmin.moderateReview));

// --- Products ---
router.get('/products', asyncHandler(productController.adminListProducts));
router.post('/products', asyncHandler(productController.createProduct));
router.patch('/products/:id', asyncHandler(productController.updateProduct));
router.delete('/products/:id', asyncHandler(productController.archiveProduct));

export default router;
