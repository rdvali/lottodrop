import { Router } from 'express';
import { getBalance, getTransactionHistory, adjustBalance, getGameHistory } from '../controllers/balanceController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = Router();

router.get('/balance', authenticateToken, getBalance);
router.get('/transactions', authenticateToken, getTransactionHistory);
router.get('/games', authenticateToken, getGameHistory);
router.post('/adjust', authenticateToken, isAdmin, adjustBalance);

export default router;