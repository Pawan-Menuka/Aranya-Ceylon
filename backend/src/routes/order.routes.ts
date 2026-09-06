import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, optionalAuth } from '../middleware/authenticate.js';
import { listMyOrders, getMyOrder, getGuestOrder } from '../controllers/order.controller.js';

const router = Router();

// Authenticated order history
router.get('/', asyncHandler(requireAuth), asyncHandler(listMyOrders));

// Order detail — handles both authenticated users and guest polling.
// Authenticated: full IDOR-guarded response via order.controller.
// Guest:         returns just {id, status, total, currency} for order-paid polling;
//                only works for guest orders (userId null) since the cuid is unguessable.
router.get('/:id', asyncHandler(optionalAuth), asyncHandler(async (req, res) => {
    if (req.user) return getMyOrder(req, res);
    return getGuestOrder(req, res);
}));

export default router;
