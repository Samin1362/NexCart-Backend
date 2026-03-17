import { Router } from 'express';
import { createReview, getReviewsByProduct, deleteReview } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public
router.get('/product/:productId', getReviewsByProduct);

// Auth-protected
router.post('/', authenticate, createReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
