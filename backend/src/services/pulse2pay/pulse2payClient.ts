// Pulse2Pay API Client
// Handles authentication, signing, and API calls to Pulse2Pay Merchant API v1

import crypto from 'crypto';
import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentResponse,
  CancelPaymentResponse,
  Pulse2PayError,
  Pulse2PayPayment,
  Pulse2PayRawResponse,
  CryptoNetwork,
  TokenStandard,
  AddressMode,
  SUPPORTED_NETWORKS
} from './pulse2payTypes';
import { logger } from '../../utils/logger';

// ============ Configuration ============

const API_BASE_URL = process.env.PULSE2PAY_API_URL || 'https://api.pulse2pay.com';
const API_PATH_PREFIX = '/api/merchant/v1';
const API_KEY = process.env.PULSE2PAY_API_KEY || '';
const API_SECRET = process.env.PULSE2PAY_API_SECRET || '';
const CALLBACK_URL = process.env.PULSE2PAY_CALLBACK_URL || `${process.env.API_BASE_URL || 'https://lottodrop.net'}/api/crypto/webhook`;

// Default expiry in minutes
const DEFAULT_EXPIRY_MINUTES = 30;

// ============ Signature Generation ============

/**
 * Generate HMAC-SHA256 signature for Pulse2Pay API requests
 * Format: HMAC-SHA256(secret, timestamp + "." + method + "." + path + "." + body)
 */
function generateSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string
): string {
  const payload = `${timestamp}.${method}.${path}.${body}`;
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Build headers for Pulse2Pay API requests
 */
function buildHeaders(method: string, path: string, body: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(method, path, body, timestamp);

  return {
    'Content-Type': 'application/json',
    'X-Pulse2Pay-Key': API_KEY,
    'X-Pulse2Pay-Signature': signature,
    'X-Pulse2Pay-Timestamp': timestamp
  };
}

// ============ Response Normalization ============

/**
 * Normalize Pulse2Pay API response to internal format
 * API returns: paymentId, generatedAddress
 * Internal uses: id, depositAddress
 */
function normalizePaymentResponse(raw: Pulse2PayRawResponse): Pulse2PayPayment {
  return {
    id: raw.paymentId,
    depositAddress: raw.generatedAddress,
    amount: raw.amount,
    currency: raw.currency,
    network: raw.network,
    status: raw.status,
    expiresAt: raw.expiresAt,
    merchantId: raw.merchantId,
    tokenStandard: raw.tokenStandard,
    addressMode: raw.addressMode,
    merchantUserId: raw.merchantUserId,
    receivedAmount: raw.receivedAmount,
    feeAmount: raw.feeAmount,
    netAmount: raw.netAmount,
    txHash: raw.txHash,
    confirmations: raw.confirmations,
    confirmedAt: raw.confirmedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    metadata: raw.metadata
  };
}

// ============ API Methods ============

/**
 * Create a new payment/deposit request
 */
export async function createPayment(
  amount: number,
  network: CryptoNetwork,
  tokenStandard: TokenStandard,
  userId: string,
  metadata?: Record<string, any>
): Promise<Pulse2PayPayment> {
  const endpoint = '/payments';
  const fullPath = `${API_PATH_PREFIX}${endpoint}`; // Full path for signature
  const method = 'POST';

  const requestBody: CreatePaymentRequest = {
    amount: amount.toFixed(2),
    currency: 'USDT',
    network,
    tokenStandard,
    addressMode: AddressMode.USER_REUSABLE, // Reusable addresses per user
    merchantUserId: userId,
    callbackUrl: CALLBACK_URL,
    expiresInMinutes: DEFAULT_EXPIRY_MINUTES,
    metadata: {
      ...metadata,
      userId,
      platform: 'lottodrop'
    }
  };

  const bodyStr = JSON.stringify(requestBody);
  const headers = buildHeaders(method, fullPath, bodyStr);

  logger.info(`[Pulse2Pay] Creating payment: ${amount} USDT on ${network}`, {
    userId,
    network,
    tokenStandard
  });

  try {
    const response = await fetch(`${API_BASE_URL}${fullPath}`, {
      method,
      headers,
      body: bodyStr
    });

    const data = await response.json() as any;

    logger.info('[Pulse2Pay] API Response', { status: response.status, dataKeys: Object.keys(data), fullData: JSON.stringify(data) });

    if (!response.ok) {
      logger.error('[Pulse2Pay] Create payment failed', {
        status: response.status,
        error: data.error
      });
      throw new Error(data.error?.message || 'Failed to create payment');
    }

    // Handle nested response format { data: {...} } or direct response
    const rawData = data.data || data;

    // Normalize the response to internal format
    // API uses: paymentId, generatedAddress
    // Internal uses: id, depositAddress
    const normalizedPayment = normalizePaymentResponse(rawData as Pulse2PayRawResponse);

    logger.info('[Pulse2Pay] Payment created successfully', {
      paymentId: normalizedPayment.id,
      depositAddress: normalizedPayment.depositAddress
    });

    return normalizedPayment;
  } catch (error) {
    logger.error('[Pulse2Pay] API request failed', { error });
    throw error;
  }
}

/**
 * Get payment status by ID
 */
export async function getPayment(paymentId: string): Promise<Pulse2PayPayment> {
  const endpoint = `/payments/${paymentId}`;
  const fullPath = `${API_PATH_PREFIX}${endpoint}`;
  const method = 'GET';
  const bodyStr = '';

  const headers = buildHeaders(method, fullPath, bodyStr);

  logger.info(`[Pulse2Pay] Getting payment status: ${paymentId}`);

  try {
    const response = await fetch(`${API_BASE_URL}${fullPath}`, {
      method,
      headers
    });

    const data = await response.json() as GetPaymentResponse | Pulse2PayError;

    if (!response.ok || !data.success) {
      const errorData = data as Pulse2PayError;
      logger.error('[Pulse2Pay] Get payment failed', {
        paymentId,
        status: response.status,
        error: errorData.error
      });
      throw new Error(errorData.error?.message || 'Failed to get payment');
    }

    return (data as GetPaymentResponse).data;
  } catch (error) {
    logger.error('[Pulse2Pay] API request failed', { error, paymentId });
    throw error;
  }
}

/**
 * Cancel a pending payment
 */
export async function cancelPayment(paymentId: string): Promise<boolean> {
  const endpoint = `/payments/${paymentId}/cancel`;
  const fullPath = `${API_PATH_PREFIX}${endpoint}`;
  const method = 'POST';
  const bodyStr = '';

  const headers = buildHeaders(method, fullPath, bodyStr);

  logger.info(`[Pulse2Pay] Canceling payment: ${paymentId}`);

  try {
    const response = await fetch(`${API_BASE_URL}${fullPath}`, {
      method,
      headers
    });

    const data = await response.json() as CancelPaymentResponse | Pulse2PayError;

    if (!response.ok || !data.success) {
      const errorData = data as Pulse2PayError;
      logger.error('[Pulse2Pay] Cancel payment failed', {
        paymentId,
        status: response.status,
        error: errorData.error
      });
      throw new Error(errorData.error?.message || 'Failed to cancel payment');
    }

    logger.info('[Pulse2Pay] Payment canceled successfully', { paymentId });
    return true;
  } catch (error) {
    logger.error('[Pulse2Pay] API request failed', { error, paymentId });
    throw error;
  }
}

// ============ Helper Functions ============

/**
 * Get supported networks configuration
 */
export function getSupportedNetworks() {
  return SUPPORTED_NETWORKS;
}

/**
 * Validate network and token standard combination
 */
export function validateNetworkConfig(
  network: CryptoNetwork,
  tokenStandard: TokenStandard
): boolean {
  return SUPPORTED_NETWORKS.some(
    config => config.network === network && config.tokenStandard === tokenStandard
  );
}

/**
 * Get network configuration by network and token standard
 */
export function getNetworkConfig(
  network: CryptoNetwork,
  tokenStandard: TokenStandard
) {
  return SUPPORTED_NETWORKS.find(
    config => config.network === network && config.tokenStandard === tokenStandard
  );
}

/**
 * Validate deposit amount against network limits
 */
export function validateAmount(
  amount: number,
  network: CryptoNetwork,
  tokenStandard: TokenStandard
): { valid: boolean; error?: string } {
  const config = getNetworkConfig(network, tokenStandard);

  if (!config) {
    return { valid: false, error: 'Unsupported network configuration' };
  }

  if (amount < config.minAmount) {
    return { valid: false, error: `Minimum deposit is ${config.minAmount} USDT` };
  }

  if (amount > config.maxAmount) {
    return { valid: false, error: `Maximum deposit is ${config.maxAmount} USDT` };
  }

  return { valid: true };
}

/**
 * Check if API is configured
 */
export function isConfigured(): boolean {
  return !!(API_KEY && API_SECRET);
}

// Export for testing
export const __testing = {
  generateSignature,
  buildHeaders
};
