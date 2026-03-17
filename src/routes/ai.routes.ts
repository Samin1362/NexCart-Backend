import { Router } from 'express';
import { chat, generateDescription, reviewSummary } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.post('/chat', chat);
router.post('/generate-description', authenticate, authorize('ADMIN'), generateDescription);
router.post('/review-summary', reviewSummary);

export default router;
