import { Router } from 'express';
import { createProduct, getAllProducts, getFeaturedProducts, getProductBySlug, updateProduct, deleteProduct } from '../controllers/product.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// Public routes
router.get('/', getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', getProductBySlug);

// Admin-only routes
router.post('/', authenticate, authorize('ADMIN'), createProduct);
router.patch('/:id', authenticate, authorize('ADMIN'), updateProduct);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteProduct);

export default router;
