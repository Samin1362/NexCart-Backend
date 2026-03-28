import { Router } from 'express';
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlistStatus,
} from '../controllers/wishlist.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/',                     authenticate, getWishlist);
router.get('/check/:productId',     authenticate, checkWishlistStatus);
router.post('/:productId',          authenticate, toggleWishlist);
router.delete('/:productId',        authenticate, removeFromWishlist);
router.delete('/',                  authenticate, clearWishlist);

export default router;
