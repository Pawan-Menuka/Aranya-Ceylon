import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authenticate.js';
import { listMyOrders, getMyOrder } from '../controllers/order.controller.js';

const router = Router();

// A customer's own order history. Auth required; queries are scoped to req.user.
router.get('/', asyncHandler(requireAuth), asyncHandler(listMyOrders));
router.get('/:id', asyncHandler(requireAuth), asyncHandler(getMyOrder));

export default router;
