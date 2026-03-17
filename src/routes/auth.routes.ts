import { Router } from 'express';
import { register, login, refreshToken, changePassword, logout, googleAuth } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/google', googleAuth);
router.patch('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

export default router;
