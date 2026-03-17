import { Router } from 'express';
import { placeOrder, getUserOrders, getAllOrders, getOrderById, updateStatus, cancelOrder } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// Auth-protected (user)
router.post('/', authenticate, placeOrder);
router.get('/', authenticate, getUserOrders);
router.patch('/:id/cancel', authenticate, cancelOrder);

// Admin-only
router.get('/all', authenticate, authorize('ADMIN'), getAllOrders);
router.patch('/:id/status', authenticate, authorize('ADMIN'), updateStatus);

// Auth (user sees own, admin sees any)
router.get('/:id', authenticate, getOrderById);

export default router;
