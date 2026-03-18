import { Router } from 'express';
import { createReview, getMyReviews, getReviewsByProduct, getTopReviews, deleteReview } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public
router.get('/top', getTopReviews);
router.get('/product/:productId', getReviewsByProduct);

// Auth-protected
router.get('/my', authenticate, getMyReviews);
router.post('/', authenticate, createReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
