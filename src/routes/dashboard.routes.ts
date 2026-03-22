import { Router } from 'express';
import { getStats, getChartData, getRecentOrders, getTopProducts } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.get('/stats', authenticate, authorize('ADMIN'), getStats);
router.get('/chart-data', authenticate, authorize('ADMIN'), getChartData);
router.get('/recent-orders', authenticate, authorize('ADMIN'), getRecentOrders);
router.get('/top-products', authenticate, authorize('ADMIN'), getTopProducts);

export default router;
