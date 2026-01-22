// Pulse2Pay Webhook Handler
// Verifies webhook signatures and processes payment status updates

import crypto from 'crypto';
import pool from '../../config/database';
import { WebhookPayload, PaymentStatus, WebhookEventType } from './pulse2payTypes';
import { TransactionType, TransactionStatus } from '../../types';
import { logger } from '../../utils/logger';
import { logAdminAction } from '../../utils/auditLogger';

// ============ Configuration ============

const WEBHOOK_SECRET = process.env.PULSE2PAY_WEBHOOK_SECRET || '';
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

// ============ Signature Verification ============

/**
 * Verify webhook signature from Pulse2Pay
 * Format: HMAC-SHA256(secret, timestamp + "." + payload)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  if (!WEBHOOK_SECRET) {
    logger.warn('[Webhook] Webhook secret not configured, skipping signature verification');
    return true; // Allow in development without secret
  }

  // Verify timestamp is within tolerance
  const timestampMs = parseInt(timestamp, 10);
  const now = Date.now();

  if (Math.abs(now - timestampMs) > TIMESTAMP_TOLERANCE_MS) {
    logger.warn('[Webhook] Timestamp outside tolerance window', {
      timestamp: timestampMs,
      now,
      diff: Math.abs(now - timestampMs)
    });
    return false;
  }

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    logger.warn('[Webhook] Invalid signature', {
      expected: expectedSignature.substring(0, 16) + '...',
      received: signature.substring(0, 16) + '...'
    });
  }

  return isValid;
}

// ============ Webhook Processing ============

/**
 * Process incoming webhook payload
 * Returns true if processed successfully, false if should be retried
 */
export async function processWebhook(payload: WebhookPayload): Promise<boolean> {
  const { type, data } = payload;
  const { paymentId, status } = data;

  logger.info('[Webhook] Processing webhook', {
    eventType: type,
    paymentId,
    status
  });

  // Get database connection with row-level locking
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find and lock the crypto deposit record
    const depositResult = await client.query(
      `SELECT cd.*, u.balance as user_balance
       FROM crypto_deposits cd
       JOIN users u ON cd.user_id = u.id
       WHERE cd.payment_id = $1
       FOR UPDATE OF cd, u`,
      [paymentId]
    );

    if (depositResult.rows.length === 0) {
      logger.warn('[Webhook] Deposit not found', { paymentId });
      await client.query('ROLLBACK');
      return true; // Don't retry for unknown payments
    }

    const deposit = depositResult.rows[0];
    const previousStatus = deposit.status;

    // Check for idempotency - skip if already in final state
    if (isFinalStatus(previousStatus) && previousStatus === status) {
      logger.info('[Webhook] Deposit already in final state', {
        paymentId,
        status: previousStatus
      });
      await client.query('ROLLBACK');
      return true;
    }

    // Append webhook data to history
    const webhookHistory = deposit.webhook_data || [];
    webhookHistory.push({
      ...payload,
      processedAt: new Date().toISOString()
    });

    // Update deposit based on status
    switch (status) {
      case PaymentStatus.CONFIRMED:
        await handleConfirmed(client, deposit, data, webhookHistory);
        break;

      case PaymentStatus.UNDERPAID:
        await handleUnderpaid(client, deposit, data, webhookHistory);
        break;

      case PaymentStatus.OVERPAID:
        await handleOverpaid(client, deposit, data, webhookHistory);
        break;

      case PaymentStatus.EXPIRED:
        await handleExpired(client, deposit, webhookHistory);
        break;

      case PaymentStatus.FAILED:
        await handleFailed(client, deposit, data, webhookHistory);
        break;

      case PaymentStatus.CANCELED:
        await handleCanceled(client, deposit, webhookHistory);
        break;

      case PaymentStatus.PENDING:
        await handlePending(client, deposit, data, webhookHistory);
        break;

      default:
        logger.warn('[Webhook] Unknown status', { status, paymentId });
        await client.query('ROLLBACK');
        return true;
    }

    await client.query('COMMIT');

    logger.info('[Webhook] Deposit updated successfully', {
      paymentId,
      previousStatus,
      newStatus: status
    });

    // Emit socket event for real-time UI update (outside transaction)
    await emitDepositUpdate(deposit.user_id, paymentId, status, data);

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('[Webhook] Processing failed', { error, paymentId });
    throw error;
  } finally {
    client.release();
  }
}

// ============ Status Handlers ============

async function handleConfirmed(
  client: any,
  deposit: any,
  data: WebhookPayload['data'],
  webhookHistory: any[]
): Promise<void> {
  const receivedAmount = parseFloat(data.receivedAmount || '0');
  const feeAmount = parseFloat(data.feeAmount || '0');
  const netAmount = parseFloat(data.netAmount || receivedAmount.toString());

  // Update deposit status
  await client.query(
    `UPDATE crypto_deposits
     SET status = $1,
         received_amount = $2,
         fee_amount = $3,
         net_amount = $4,
         tx_hash = $5,
         confirmations = $6,
         confirmed_at = NOW(),
         webhook_data = $7,
         updated_at = NOW()
     WHERE id = $8`,
    [
      PaymentStatus.CONFIRMED,
      receivedAmount,
      feeAmount,
      netAmount,
      data.txHash,
      data.confirmations,
      JSON.stringify(webhookHistory),
      deposit.id
    ]
  );

  // Create transaction record
  const transactionResult = await client.query(
    `INSERT INTO transactions (user_id, type, amount, currency, status, description, reference_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      deposit.user_id,
      TransactionType.DEPOSIT,
      netAmount,
      'USD',
      TransactionStatus.SUCCESS,
      `Crypto deposit: ${netAmount} USDT via ${deposit.network}`,
      deposit.id,
      JSON.stringify({
        cryptoNetwork: deposit.network,
        tokenStandard: deposit.token_standard,
        txHash: data.txHash,
        paymentId: data.paymentId,
        originalAmount: receivedAmount,
        fee: feeAmount
      })
    ]
  );

  // Link transaction to deposit
  await client.query(
    `UPDATE crypto_deposits SET transaction_id = $1 WHERE id = $2`,
    [transactionResult.rows[0].id, deposit.id]
  );

  // Update user balance
  await client.query(
    `UPDATE users SET balance = balance + $1 WHERE id = $2`,
    [netAmount, deposit.user_id]
  );

  // Log audit trail
  await logAdminAction(
    'SYSTEM',
    'CRYPTO_DEPOSIT_CONFIRMED',
    deposit.user_id,
    undefined,
    {
      depositId: deposit.id,
      paymentId: data.paymentId,
      amount: netAmount,
      network: deposit.network,
      txHash: data.txHash
    }
  );

  logger.info('[Webhook] Deposit confirmed and balance updated', {
    userId: deposit.user_id,
    amount: netAmount,
    txHash: data.txHash
  });
}

async function handleUnderpaid(
  client: any,
  deposit: any,
  data: WebhookPayload['data'],
  webhookHistory: any[]
): Promise<void> {
  const receivedAmount = parseFloat(data.receivedAmount || '0');

  await client.query(
    `UPDATE crypto_deposits
     SET status = $1,
         received_amount = $2,
         tx_hash = $3,
         confirmations = $4,
         webhook_data = $5,
         error_message = $6,
         updated_at = NOW()
     WHERE id = $7`,
    [
      PaymentStatus.UNDERPAID,
      receivedAmount,
      data.txHash,
      data.confirmations,
      JSON.stringify(webhookHistory),
      `Underpaid: received ${receivedAmount}, expected ${deposit.expected_amount}`,
      deposit.id
    ]
  );

  logger.warn('[Webhook] Deposit underpaid', {
    depositId: deposit.id,
    expected: deposit.expected_amount,
    received: receivedAmount
  });
}

async function handleOverpaid(
  client: any,
  deposit: any,
  data: WebhookPayload['data'],
  webhookHistory: any[]
): Promise<void> {
  // For overpaid, we credit the full received amount
  const receivedAmount = parseFloat(data.receivedAmount || '0');
  const feeAmount = parseFloat(data.feeAmount || '0');
  const netAmount = parseFloat(data.netAmount || receivedAmount.toString());

  await client.query(
    `UPDATE crypto_deposits
     SET status = $1,
         received_amount = $2,
         fee_amount = $3,
         net_amount = $4,
         tx_hash = $5,
         confirmations = $6,
         confirmed_at = NOW(),
         webhook_data = $7,
         updated_at = NOW()
     WHERE id = $8`,
    [
      PaymentStatus.OVERPAID,
      receivedAmount,
      feeAmount,
      netAmount,
      data.txHash,
      data.confirmations,
      JSON.stringify(webhookHistory),
      deposit.id
    ]
  );

  // Create transaction for the full amount
  const transactionResult = await client.query(
    `INSERT INTO transactions (user_id, type, amount, currency, status, description, reference_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      deposit.user_id,
      TransactionType.DEPOSIT,
      netAmount,
      'USD',
      TransactionStatus.SUCCESS,
      `Crypto deposit (overpaid): ${netAmount} USDT via ${deposit.network}`,
      deposit.id,
      JSON.stringify({
        cryptoNetwork: deposit.network,
        tokenStandard: deposit.token_standard,
        txHash: data.txHash,
        paymentId: data.paymentId,
        expectedAmount: deposit.expected_amount,
        receivedAmount,
        overpaidBy: receivedAmount - deposit.expected_amount
      })
    ]
  );

  await client.query(
    `UPDATE crypto_deposits SET transaction_id = $1 WHERE id = $2`,
    [transactionResult.rows[0].id, deposit.id]
  );

  // Update user balance with full amount
  await client.query(
    `UPDATE users SET balance = balance + $1 WHERE id = $2`,
    [netAmount, deposit.user_id]
  );

  logger.info('[Webhook] Deposit overpaid, credited full amount', {
    depositId: deposit.id,
    expected: deposit.expected_amount,
    received: receivedAmount,
    credited: netAmount
  });
}

async function handleExpired(
  client: any,
  deposit: any,
  webhookHistory: any[]
): Promise<void> {
  await client.query(
    `UPDATE crypto_deposits
     SET status = $1,
         webhook_data = $2,
         error_message = 'Payment expired before receiving funds',
         updated_at = NOW()
     WHERE id = $3`,
    [PaymentStatus.EXPIRED, JSON.stringify(webhookHistory), deposit.id]
  );

  logger.info('[Webhook] Deposit expired', { depositId: deposit.id });
}

async function handleFailed(
  client: any,
  deposit: any,
  data: WebhookPayload['data'],
  webhookHistory: any[]
): Promise<void> {
  await client.query(
    `UPDATE crypto_deposits
     SET status = $1,
         webhook_data = $2,
         error_message = 'Payment failed',
         updated_at = NOW()
     WHERE id = $3`,
    [PaymentStatus.FAILED, JSON.stringify(webhookHistory), deposit.id]
  );

  logger.error('[Webhook] Deposit failed', {
    depositId: deposit.id,
    paymentId: data.paymentId
  });
}

async function handleCanceled(
  client: any,
  deposit: any,
  webhookHistory: any[]
): Promise<void> {
  await client.query(
    `UPDATE crypto_deposits
     SET status = $1,
         webhook_data = $2,
         error_message = 'Payment canceled',
         updated_at = NOW()
     WHERE id = $3`,
    [PaymentStatus.CANCELED, JSON.stringify(webhookHistory), deposit.id]
  );

  logger.info('[Webhook] Deposit canceled', { depositId: deposit.id });
}

async function handlePending(
  client: any,
  deposit: any,
  data: WebhookPayload['data'],
  webhookHistory: any[]
): Promise<void> {
  // Update confirmations count if available
  const updates: string[] = ['webhook_data = $1', 'updated_at = NOW()'];
  const params: any[] = [JSON.stringify(webhookHistory)];

  if (data.confirmations !== undefined) {
    params.push(data.confirmations);
    updates.push(`confirmations = $${params.length}`);
  }

  if (data.txHash) {
    params.push(data.txHash);
    updates.push(`tx_hash = $${params.length}`);
  }

  params.push(deposit.id);

  await client.query(
    `UPDATE crypto_deposits SET ${updates.join(', ')} WHERE id = $${params.length}`,
    params
  );

  logger.info('[Webhook] Deposit pending update', {
    depositId: deposit.id,
    confirmations: data.confirmations,
    txHash: data.txHash
  });
}

// ============ Helper Functions ============

function isFinalStatus(status: string): boolean {
  return [
    PaymentStatus.CONFIRMED,
    PaymentStatus.OVERPAID,
    PaymentStatus.EXPIRED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELED
  ].includes(status as PaymentStatus);
}

async function emitDepositUpdate(
  userId: string,
  paymentId: string,
  status: string,
  data: WebhookPayload['data']
): Promise<void> {
  try {
    // Get socket manager from global
    const { socketManager } = await import('../../index');

    if (socketManager) {
      // Emit to the specific user
      socketManager.emitToUser(userId, 'deposit-status-update', {
        paymentId,
        status,
        receivedAmount: data.receivedAmount,
        confirmations: data.confirmations,
        txHash: data.txHash
      });

      // If confirmed, emit balance update
      if (status === PaymentStatus.CONFIRMED || status === PaymentStatus.OVERPAID) {
        const balanceResult = await pool.query(
          'SELECT balance FROM users WHERE id = $1',
          [userId]
        );

        if (balanceResult.rows.length > 0) {
          socketManager.emitToUser(userId, 'balance-updated', {
            balance: parseFloat(balanceResult.rows[0].balance)
          });
        }
      }
    }
  } catch (error) {
    // Socket emission failure shouldn't break webhook processing
    logger.warn('[Webhook] Failed to emit socket event', { error, userId, paymentId });
  }
}

// Export for testing
export const __testing = {
  verifyWebhookSignature,
  isFinalStatus
};
