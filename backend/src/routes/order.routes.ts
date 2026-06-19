import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, optionalAuth } from '../middleware/authenticate.js';
import { listMyOrders, getMyOrder } from '../controllers/order.controller.js';
import { prisma } from '../index.js';

const router = Router();

// Authenticated order history
router.get('/', asyncHandler(requireAuth), asyncHandler(listMyOrders));

// Order detail — handles both authenticated users and guest polling.
// Authenticated: full IDOR-guarded response via order.controller.
// Guest:         returns just {id, status, total, currency} for order-paid polling;
//                only works for guest orders (userId null) since the cuid is unguessable.
router.get('/:id', asyncHandler(optionalAuth), asyncHandler(async (req, res) => {
    if (req.user) {
        // Authenticated path — IDOR-safe (order must belong to this user)
        return getMyOrder(req, res);
    }

    // Guest path — minimal status only, guest orders only
    const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true, total: true, currency: true, userId: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Don't expose authenticated-user orders to unauthenticated callers
    if (order.userId) {
        return res.status(403).json({ error: 'Sign in to view this order.' });
    }

    return res.json({ order });
}));

export default router;
