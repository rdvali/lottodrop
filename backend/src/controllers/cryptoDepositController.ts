// Crypto Deposit Controller
// Handles USDT cryptocurrency deposits via Pulse2Pay

import { Request, Response } from 'express';
import pool from '../config/database';
import {
  createPayment,
  getSupportedNetworks,
  validateNetworkConfig,
  validateAmount,
  isConfigured
} from '../services/pulse2pay/pulse2payClient';
import {
  verifyWebhookSignature,
  processWebhook
} from '../services/pulse2pay/pulse2payWebhook';
import {
  CryptoNetwork,
  TokenStandard,
  WebhookPayload,
  WebhookEventType,
  PaymentStatus
} from '../services/pulse2pay/pulse2payTypes';
import { logger } from '../utils/logger';
import { logAdminAction } from '../utils/auditLogger';
import RedisClient from '../services/redis/redisClient';
import { REDIS_KEYS, REDIS_KEY_TTL } from '../config/redis.config';

// ============ User Endpoints ============

/**
 * GET /api/crypto/networks
 * Get supported cryptocurrency networks
 */
export const getNetworks = async (_req: Request, res: Response) => {
  try {
    const networks = getSupportedNetworks();

    return res.json({
      success: true,
      data: networks.map(n => ({
        network: n.network,
        currency: n.currency,
        tokenStandard: n.tokenStandard,
        displayName: n.displayName,
        minAmount: n.minAmount,
        maxAmount: n.maxAmount
      }))
    });
  } catch (error) {
    logger.error('Get networks error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/crypto/deposit
 * Create a new crypto deposit request
 */
export const createDeposit = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { amount, network, tokenStandard } = req.body;

  // Validate inputs
  if (!amount || !network || !tokenStandard) {
    return res.status(400).json({
      error: 'Missing required fields: amount, network, tokenStandard'
    });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Validate network config
  if (!validateNetworkConfig(network as CryptoNetwork, tokenStandard as TokenStandard)) {
    return res.status(400).json({ error: 'Invalid network or token standard' });
  }

  // Validate amount limits
  const amountValidation = validateAmount(
    amountNum,
    network as CryptoNetwork,
    tokenStandard as TokenStandard
  );
  if (!amountValidation.valid) {
    return res.status(400).json({ error: amountValidation.error });
  }

  // Check if Pulse2Pay is configured
  if (!isConfigured()) {
    logger.error('Pulse2Pay not configured');
    return res.status(503).json({ error: 'Crypto deposits temporarily unavailable' });
  }

  try {
    // Create payment with Pulse2Pay
    const payment = await createPayment(
      amountNum,
      network as CryptoNetwork,
      tokenStandard as TokenStandard,
      userId
    );

    // Store deposit in database
    const depositResult = await pool.query(
      `INSERT INTO crypto_deposits (
        user_id, payment_id, network, currency, token_standard,
        deposit_address, expected_amount, status, expires_at,
        address_mode, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        payment.id,
        payment.network,
        payment.currency,
        payment.tokenStandard,
        payment.depositAddress,
        amountNum,
        PaymentStatus.PENDING,
        payment.expiresAt,
        payment.addressMode,
        JSON.stringify({
          merchantUserId: payment.merchantUserId,
          createdVia: 'api'
        })
      ]
    );

    const deposit = depositResult.rows[0];

    // Log action
    await logAdminAction(
      userId,
      'CRYPTO_DEPOSIT_CREATED',
      userId,
      req.ip,
      {
        depositId: deposit.id,
        paymentId: payment.id,
        amount: amountNum,
        network: payment.network
      }
    );

    logger.info('Crypto deposit created', {
      userId,
      depositId: deposit.id,
      amount: amountNum,
      network
    });

    return res.status(201).json({
      success: true,
      data: {
        id: deposit.id,
        paymentId: payment.id,
        network: deposit.network,
        currency: deposit.currency,
        tokenStandard: deposit.token_standard,
        depositAddress: deposit.deposit_address,
        expectedAmount: parseFloat(deposit.expected_amount),
        status: deposit.status,
        expiresAt: deposit.expires_at,
        createdAt: deposit.created_at
      }
    });
  } catch (error: any) {
    logger.error('Create deposit error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create deposit'
    });
  }
};

/**
 * GET /api/crypto/deposits
 * Get user's deposit history
 */
export const getDeposits = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const {
    page = 1,
    limit = 10,
    status,
    network
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
  const offset = (pageNum - 1) * limitNum;

  try {
    // Build query
    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    if (network) {
      params.push(network);
      whereClause += ` AND network = $${params.length}`;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM crypto_deposits ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get deposits
    const depositsResult = await pool.query(
      `SELECT id, payment_id, network, currency, token_standard,
              deposit_address, expected_amount, received_amount,
              fee_amount, net_amount, status, tx_hash, confirmations,
              expires_at, confirmed_at, created_at, updated_at, error_message
       FROM crypto_deposits
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    const deposits = depositsResult.rows.map(row => ({
      id: row.id,
      paymentId: row.payment_id,
      network: row.network,
      currency: row.currency,
      tokenStandard: row.token_standard,
      depositAddress: row.deposit_address,
      expectedAmount: parseFloat(row.expected_amount),
      receivedAmount: parseFloat(row.received_amount || 0),
      feeAmount: parseFloat(row.fee_amount || 0),
      netAmount: parseFloat(row.net_amount || 0),
      status: row.status,
      txHash: row.tx_hash,
      confirmations: row.confirmations,
      expiresAt: row.expires_at,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      errorMessage: row.error_message
    }));

    return res.json({
      success: true,
      data: deposits,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get deposits error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/crypto/deposits/:id
 * Get single deposit status
 */
export const getDepositById = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid deposit ID' });
  }

  try {
    const result = await pool.query(
      `SELECT id, payment_id, network, currency, token_standard,
              deposit_address, expected_amount, received_amount,
              fee_amount, net_amount, status, tx_hash, confirmations,
              expires_at, confirmed_at, created_at, updated_at,
              error_message, address_mode
       FROM crypto_deposits
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: row.id,
        paymentId: row.payment_id,
        network: row.network,
        currency: row.currency,
        tokenStandard: row.token_standard,
        depositAddress: row.deposit_address,
        expectedAmount: parseFloat(row.expected_amount),
        receivedAmount: parseFloat(row.received_amount || 0),
        feeAmount: parseFloat(row.fee_amount || 0),
        netAmount: parseFloat(row.net_amount || 0),
        status: row.status,
        txHash: row.tx_hash,
        confirmations: row.confirmations,
        expiresAt: row.expires_at,
        confirmedAt: row.confirmed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        errorMessage: row.error_message,
        addressMode: row.address_mode
      }
    });
  } catch (error) {
    logger.error('Get deposit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ Webhook Endpoint ============

/**
 * Transform flat Pulse2Pay webhook payload to internal format
 * Pulse2Pay sends: { payment_id, status, amount, received_amount, tx_hash, ... }
 * We expect: { id, type, data: { paymentId, status, ... } }
 */
function transformWebhookPayload(rawPayload: any): WebhookPayload {
  // Map status to event type
  const statusToEventType: Record<string, WebhookEventType> = {
    'pending': WebhookEventType.PAYMENT_PENDING,
    'confirmed': WebhookEventType.PAYMENT_CONFIRMED,
    'underpaid': WebhookEventType.PAYMENT_UNDERPAID,
    'overpaid': WebhookEventType.PAYMENT_OVERPAID,
    'expired': WebhookEventType.PAYMENT_EXPIRED,
    'failed': WebhookEventType.PAYMENT_FAILED,
    'canceled': WebhookEventType.PAYMENT_CANCELED
  };

  const status = rawPayload.status?.toLowerCase() || 'pending';
  const eventType = statusToEventType[status] || WebhookEventType.PAYMENT_PENDING;

  return {
    id: rawPayload.payment_id || rawPayload.paymentId || `webhook_${Date.now()}`,
    type: eventType,
    createdAt: rawPayload.created_at || new Date().toISOString(),
    data: {
      paymentId: rawPayload.payment_id || rawPayload.paymentId,
      merchantId: rawPayload.merchant_id || rawPayload.merchantId || '',
      status: status as PaymentStatus,
      amount: String(rawPayload.amount || '0'),
      currency: rawPayload.currency || 'USDT',
      network: rawPayload.network as CryptoNetwork,
      tokenStandard: rawPayload.token_standard || rawPayload.tokenStandard || TokenStandard.TRC20,
      depositAddress: rawPayload.deposit_address || rawPayload.depositAddress || rawPayload.generated_address || '',
      receivedAmount: String(rawPayload.received_amount || rawPayload.receivedAmount || '0'),
      feeAmount: String(rawPayload.fee_amount || rawPayload.feeAmount || '0'),
      netAmount: String(rawPayload.net_amount || rawPayload.netAmount || rawPayload.received_amount || '0'),
      txHash: rawPayload.tx_hash || rawPayload.txHash,
      confirmations: rawPayload.confirmations,
      confirmedAt: rawPayload.confirmed_at || rawPayload.confirmedAt,
      merchantUserId: rawPayload.merchant_user_id || rawPayload.merchantUserId,
      metadata: rawPayload.metadata
    }
  };
}

/**
 * POST /api/crypto/webhook
 * Pulse2Pay webhook receiver
 * No JWT auth - uses HMAC signature verification (MANDATORY in production)
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-pulse2pay-signature'] as string;
  const timestamp = req.headers['x-pulse2pay-timestamp'] as string;
  const webhookId = req.headers['x-pulse2pay-webhook-id'] as string;
  const webhookSecret = process.env.PULSE2PAY_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log incoming webhook for debugging (sanitized in production)
  logger.info('Webhook received', {
    headers: {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasWebhookId: !!webhookId,
      contentType: req.headers['content-type']
    },
    bodyPreview: isProduction ? '[redacted]' : JSON.stringify(req.body).substring(0, 200)
  });

  // SECURITY: Signature verification is MANDATORY in production
  if (!webhookSecret) {
    if (isProduction) {
      logger.error('CRITICAL: Webhook secret not configured in production - rejecting request');
      return res.status(503).json({ error: 'Webhook endpoint not configured' });
    }
    logger.warn('DEV MODE: Webhook signature verification disabled - configure PULSE2PAY_WEBHOOK_SECRET');
  } else {
    // Verify signature headers exist
    if (!signature || !timestamp) {
      logger.warn('Webhook missing signature or timestamp headers', {
        ip: req.ip,
        hasSignature: !!signature,
        hasTimestamp: !!timestamp
      });
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      logger.warn('Webhook signature verification failed', {
        ip: req.ip,
        timestampHeader: timestamp
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  // SECURITY: Webhook deduplication using X-Pulse2Pay-Webhook-Id header
  // Prevents replay attacks and duplicate processing
  if (webhookId) {
    try {
      const redis = RedisClient.getMaster();
      const dedupKey = REDIS_KEYS.WEBHOOK_DEDUP(webhookId);
      const exists = await redis.get(dedupKey);

      if (exists) {
        logger.info('Duplicate webhook ignored (already processed)', {
          webhookId,
          ip: req.ip
        });
        return res.json({ success: true, message: 'Duplicate webhook' });
      }

      // Mark as being processed (set early to prevent race conditions)
      await redis.setex(dedupKey, REDIS_KEY_TTL.WEBHOOK_DEDUP, '1');
    } catch (redisError) {
      // Log but don't fail - deduplication is a defense-in-depth measure
      logger.warn('Webhook deduplication check failed (Redis error)', {
        error: redisError,
        webhookId
      });
    }
  } else {
    logger.warn('Webhook missing X-Pulse2Pay-Webhook-Id header - deduplication skipped', {
      ip: req.ip
    });
  }

  // Transform the flat Pulse2Pay payload to our internal format
  let payload: WebhookPayload;

  // Check if payload is already in our expected format
  if (req.body.type && req.body.data && req.body.data.paymentId) {
    payload = req.body as WebhookPayload;
  } else if (req.body.payment_id || req.body.paymentId) {
    // Flat Pulse2Pay format - transform it
    payload = transformWebhookPayload(req.body);
  } else {
    logger.warn('Webhook invalid payload structure', { payload: req.body });
    return res.status(400).json({ error: 'Invalid payload structure' });
  }

  // Validate transformed payload
  if (!payload.data.paymentId) {
    logger.warn('Webhook missing paymentId', { payload });
    return res.status(400).json({ error: 'Missing payment ID' });
  }

  logger.info('Webhook payload transformed', {
    eventId: payload.id,
    eventType: payload.type,
    paymentId: payload.data.paymentId,
    status: payload.data.status
  });

  try {
    // SECURITY: Validate payment exists in our database BEFORE processing
    // This prevents attackers from crediting accounts with fabricated payment IDs
    const paymentId = payload.data.paymentId;
    const existsCheck = await pool.query(
      'SELECT id, status, expected_amount FROM crypto_deposits WHERE payment_id = $1',
      [paymentId]
    );

    if (existsCheck.rows.length === 0) {
      logger.warn('Webhook received for unknown payment_id - potential attack or stale webhook', {
        paymentId,
        ip: req.ip,
        eventType: payload.type
      });
      // Return 200 to prevent Pulse2Pay from retrying unknown payments
      // but log as suspicious activity
      return res.json({ success: true, message: 'Unknown payment ignored' });
    }

    const existingDeposit = existsCheck.rows[0];
    logger.info('Webhook payment validated', {
      paymentId,
      depositId: existingDeposit.id,
      currentStatus: existingDeposit.status,
      expectedAmount: existingDeposit.expected_amount
    });

    await processWebhook(payload);
    return res.json({ success: true, received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    // Return 500 so Pulse2Pay will retry
    return res.status(500).json({ error: 'Processing failed, please retry' });
  }
};
