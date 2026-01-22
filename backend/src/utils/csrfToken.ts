// SECURITY FIX: CSRF token generation and validation
// Prevents Cross-Site Request Forgery attacks on state-changing operations
// Uses cryptographically secure random tokens stored in Redis

import crypto from 'crypto';
import redisClient from '../services/redis/redisClient';

// Configuration
const CSRF_TOKEN_TTL = 3600; // 1 hour in seconds
const CSRF_TOKEN_PREFIX = 'csrf_token:';
const USER_CSRF_TOKENS_PREFIX = 'user_csrf_tokens:';
const CSRF_TOKEN_LENGTH = 32; // 64 characters in hex

/**
 * Generates a cryptographically secure CSRF token
 * @returns Random 64-character hex string
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Stores CSRF token in Redis with user association
 * @param token - The CSRF token
 * @param userId - The user ID
 */
export const storeCsrfToken = async (
  token: string,
  userId: string
): Promise<void> => {
  const redis = redisClient.getMaster();

  const tokenKey = `${CSRF_TOKEN_PREFIX}${token}`;
  const userTokensKey = `${USER_CSRF_TOKENS_PREFIX}${userId}`;

  // Store token with userId as value
  await redis.setex(tokenKey, CSRF_TOKEN_TTL, userId);

  // Add token to user's token set
  await redis.sadd(userTokensKey, token);
  await redis.expire(userTokensKey, CSRF_TOKEN_TTL);

  console.log(`[CSRF] Token generated for user ${userId} (expires in 1 hour)`);
};

/**
 * Validates CSRF token and checks it belongs to the user
 * @param token - The CSRF token to validate
 * @param userId - The user ID making the request
 * @returns true if valid, false otherwise
 */
export const validateCsrfToken = async (
  token: string,
  userId: string
): Promise<boolean> => {
  const redis = redisClient.getMaster();
  const tokenKey = `${CSRF_TOKEN_PREFIX}${token}`;

  try {
    const storedUserId = await redis.get(tokenKey);

    if (!storedUserId) {
      console.warn('[CSRF] Token not found or expired');
      return false;
    }

    if (storedUserId !== userId) {
      console.warn(`[CSRF] Token mismatch: expected ${userId}, got ${storedUserId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[CSRF] Error validating token:', error);
    return false;
  }
};

/**
 * Invalidates a specific CSRF token
 * Optionally called after single-use operations
 * @param token - The CSRF token to invalidate
 */
export const invalidateCsrfToken = async (token: string): Promise<void> => {
  const redis = redisClient.getMaster();
  const tokenKey = `${CSRF_TOKEN_PREFIX}${token}`;

  // Get userId before deleting to remove from user's set
  const userId = await redis.get(tokenKey);

  if (userId) {
    const userTokensKey = `${USER_CSRF_TOKENS_PREFIX}${userId}`;
    await redis.srem(userTokensKey, token);
  }

  await redis.del(tokenKey);

  console.log('[CSRF] Token invalidated');
};

/**
 * Invalidates all CSRF tokens for a user
 * Called on logout or password change
 * @param userId - The user ID
 */
export const invalidateAllUserCsrfTokens = async (userId: string): Promise<void> => {
  const redis = redisClient.getMaster();
  const userTokensKey = `${USER_CSRF_TOKENS_PREFIX}${userId}`;

  // Get all CSRF tokens for user
  const tokens = await redis.smembers(userTokensKey);

  // Delete each token
  const deletePromises = tokens.map(async (token) => {
    const tokenKey = `${CSRF_TOKEN_PREFIX}${token}`;
    await redis.del(tokenKey);
  });

  await Promise.all(deletePromises);

  // Delete the user's token set
  await redis.del(userTokensKey);

  console.log(`[CSRF] Invalidated ${tokens.length} CSRF tokens for user ${userId}`);
};

/**
 * Gets count of active CSRF tokens for a user
 * @param userId - The user ID
 * @returns Number of active CSRF tokens
 */
export const getActiveCsrfTokenCount = async (userId: string): Promise<number> => {
  const redis = redisClient.getMaster();
  const userTokensKey = `${USER_CSRF_TOKENS_PREFIX}${userId}`;

  return await redis.scard(userTokensKey);
};

// Export configuration constants
export { CSRF_TOKEN_TTL };
