import { Router } from 'express';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getCart);
router.post('/add', authenticate, addItem);
router.patch('/update', authenticate, updateItem);
router.delete('/remove/:productId', authenticate, removeItem);
router.delete('/clear', authenticate, clearCart);

export default router;
