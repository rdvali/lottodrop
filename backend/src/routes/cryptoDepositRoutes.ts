// Crypto Deposit Routes
// Handles cryptocurrency deposit endpoints via Pulse2Pay

import { Router } from 'express';
import {
  getNetworks,
  createDeposit,
  getDeposits,
  getDepositById,
  handleWebhook
} from '../controllers/cryptoDepositController';
import { authenticateToken } from '../middleware/auth';
import { validateCsrf } from '../middleware/csrf';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

// ============ User Endpoints (require authentication) ============

// GET /api/crypto/networks - Get supported networks
router.get('/networks', authenticateToken, getNetworks);

// POST /api/crypto/deposit - Create new deposit
// Protected by: JWT auth + CSRF + idempotency
router.post(
  '/deposit',
  authenticateToken,
  validateCsrf,
  idempotencyMiddleware,
  createDeposit
);

// GET /api/crypto/deposits - Get user's deposit history
router.get('/deposits', authenticateToken, getDeposits);

// GET /api/crypto/deposits/:id - Get single deposit status
router.get('/deposits/:id', authenticateToken, getDepositById);

// ============ Webhook Endpoint (no JWT auth, uses HMAC) ============

// POST /api/crypto/webhook - Pulse2Pay webhook receiver
// No JWT authentication - uses HMAC signature verification instead
router.post('/webhook', handleWebhook);

export default router;
