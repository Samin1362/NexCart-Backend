import { Router } from 'express';
import { getMe, updateMe, getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// Auth-protected routes (any logged-in user)
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);

// Admin-only routes
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);
router.get('/:id', authenticate, authorize('ADMIN'), getUserById);
router.patch('/:id', authenticate, authorize('ADMIN'), updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);

export default router;
