import { Router } from 'express';
import { register, login, getProfile, changePassword, getUserRooms, logout, refresh, getCsrfToken, getUserLogs, logSessionExpiry } from '../controllers/authController';
import { authenticateToken, authenticateTokenOptional } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout); // SECURITY FIX (CRIT-003): Logout endpoint
router.post('/refresh', refresh); // SECURITY FIX (CRIT-002): Token refresh endpoint
router.get('/csrf-token', authenticateTokenOptional, getCsrfToken); // SECURITY FIX (Week 4): CSRF token endpoint with optional auth
router.post('/log-session-expiry', logSessionExpiry); // Log session expiration (no auth required since token is expired)
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);
router.get('/me/rooms', authenticateToken, getUserRooms);
router.get('/me/logs', authenticateToken, getUserLogs); // Get user activity logs

export default router;