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
import { webhookLimit, webhookGlobalLimit } from '../middleware/rateLimiter';
import { webhookIPWhitelist, webhookHeadersValidation } from '../middleware/webhookSecurity';

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
// Security layers (in order):
// 1. IP Whitelist (blocks unauthorized IPs in production)
// 2. Global Rate Limit (60 req/min per IP across all payments)
// 3. Payment-specific Rate Limit (30 req/min per IP per payment_id)
// 4. Header Validation (ensures proper Content-Type and body)
// 5. HMAC Signature Verification (in controller - mandatory in production)
// 6. Webhook Deduplication (in controller - prevents replay attacks)
// 7. Payment Existence Validation (in controller - blocks unknown payment_ids)
// 8. Amount Validation (in service - prevents crediting wrong amounts)
router.post(
  '/webhook',
  webhookIPWhitelist,
  webhookGlobalLimit(),
  webhookLimit(),
  webhookHeadersValidation,
  handleWebhook
);

export default router;
