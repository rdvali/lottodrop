import { Router } from 'express';
import { register, login, getProfile, changePassword, getUserRooms } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);
router.get('/me/rooms', authenticateToken, getUserRooms);

export default router;