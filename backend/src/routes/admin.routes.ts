import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as orderAdmin from '../controllers/admin/order.admin.controller.js';
import * as blogAdmin from '../controllers/admin/blog.admin.controller.js';
import * as analyticsAdmin from '../controllers/admin/analytics.admin.controller.js';

const router = Router();

// All admin routes require auth + ADMIN or SUPERADMIN role
router.use(asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN'));

// --- Analytics ---
router.get('/dashboard', asyncHandler(analyticsAdmin.getDashboard));
router.get('/audit-logs', asyncHandler(analyticsAdmin.getAuditLogs));

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

export default router;