import { Router } from 'express';
import { register, login, getProfile, changePassword, getUserRooms, logout, refresh, getCsrfToken, getUserLogs, logSessionExpiry } from '../controllers/authController';
import { authenticateToken, authenticateTokenOptional } from '../middleware/auth';
import { unlockAccount } from '../utils/accountLockout';

const router = Router();

// Emergency account unlock endpoint (secured by secret key)
router.post('/unlock-account', async (req, res) => {
  const { email, secretKey } = req.body;
  const UNLOCK_SECRET = process.env.ADMIN_UNLOCK_SECRET || 'lottodrop-emergency-unlock-2026';

  if (secretKey !== UNLOCK_SECRET) {
    return res.status(403).json({ error: 'Invalid secret key' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    await unlockAccount(email);
    return res.json({ success: true, message: `Account ${email} has been unlocked` });
  } catch (error) {
    console.error('Unlock account error:', error);
    return res.status(500).json({ error: 'Failed to unlock account' });
  }
});

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