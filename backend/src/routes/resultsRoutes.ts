import { Router } from 'express';
import { getResults, getResultsByUser, getResultsByRoom } from '../controllers/resultsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public route - anyone can view results
router.get('/', getResults);

// Protected routes - require authentication
router.get('/user/:userId', authenticateToken, getResultsByUser);
router.get('/room/:roomId', authenticateToken, getResultsByRoom);

export default router;