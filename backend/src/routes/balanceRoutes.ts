import { Router } from 'express';
import { getBalance, getTransactionHistory, adjustBalance, getGameHistory } from '../controllers/balanceController';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

router.get('/balance', authenticateToken, getBalance);
router.get('/transactions', authenticateToken, getTransactionHistory);
router.get('/games', authenticateToken, getGameHistory);
// SECURITY FIX (HIGH-007): Idempotency protection for admin balance adjustments
router.post('/adjust', authenticateToken, isAdmin, idempotencyMiddleware, adjustBalance);

export default router;