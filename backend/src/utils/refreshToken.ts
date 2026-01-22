// SECURITY FIX (CRIT-002): Refresh token management
// Implements secure token rotation with Redis storage
// Separates short-lived access tokens (15min) from long-lived refresh tokens (7d)

import crypto from 'crypto';
import redisClient from '../services/redis/redisClient';
import { AuthPayload } from '../types';

// Configuration
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const USER_REFRESH_TOKENS_PREFIX = 'user_refresh_tokens:';

export interface RefreshTokenData {
  userId: string;
  email: string;
  isAdmin: boolean;
  createdAt: number;
  expiresAt: number;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Generates a cryptographically secure refresh token
 * @returns Random 64-character hex string
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Stores refresh token in Redis with user association
 * Implements token rotation by invalidating old tokens
 * @param refreshToken - The refresh token string
 * @param payload - User authentication data
 * @param metadata - Optional request metadata (user agent, IP)
 */
export const storeRefreshToken = async (
  refreshToken: string,
  payload: AuthPayload,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<void> => {
  const redis = redisClient.getMaster();

  const tokenData: RefreshTokenData = {
    userId: payload.userId,
    email: payload.email,
    isAdmin: payload.isAdmin,
    createdAt: Date.now(),
    expiresAt: Date.now() + (REFRESH_TOKEN_TTL * 1000),
    userAgent: metadata?.userAgent,
    ipAddress: metadata?.ipAddress
  };

  const tokenKey = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
  const userTokensKey = `${USER_REFRESH_TOKENS_PREFIX}${payload.userId}`;

  // Store token data with TTL
  await redis.setex(tokenKey, REFRESH_TOKEN_TTL, JSON.stringify(tokenData));

  // Add token to user's token set (for tracking multiple devices)
  await redis.sadd(userTokensKey, refreshToken);
  await redis.expire(userTokensKey, REFRESH_TOKEN_TTL);

  console.log(`[RefreshToken] Stored refresh token for user ${payload.userId} (expires in 7 days)`);
};

/**
 * Validates and retrieves refresh token data from Redis
 * @param refreshToken - The refresh token to validate
 * @returns Token data if valid, null if invalid or expired
 */
export const validateRefreshToken = async (
  refreshToken: string
): Promise<RefreshTokenData | null> => {
  const redis = redisClient.getMaster();
  const tokenKey = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;

  try {
    const tokenDataStr = await redis.get(tokenKey);

    if (!tokenDataStr) {
      console.warn('[RefreshToken] Token not found or expired');
      return null;
    }

    const tokenData: RefreshTokenData = JSON.parse(tokenDataStr);

    // Check if token is expired (double-check even though Redis TTL handles this)
    if (Date.now() > tokenData.expiresAt) {
      console.warn('[RefreshToken] Token expired');
      await invalidateRefreshToken(refreshToken);
      return null;
    }

    return tokenData;
  } catch (error) {
    console.error('[RefreshToken] Error validating token:', error);
    return null;
  }
};

/**
 * Invalidates a refresh token (token rotation on refresh)
 * @param refreshToken - The refresh token to invalidate
 */
export const invalidateRefreshToken = async (refreshToken: string): Promise<void> => {
  const redis = redisClient.getMaster();
  const tokenKey = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;

  // Get token data before deleting to remove from user's set
  const tokenDataStr = await redis.get(tokenKey);

  if (tokenDataStr) {
    const tokenData: RefreshTokenData = JSON.parse(tokenDataStr);
    const userTokensKey = `${USER_REFRESH_TOKENS_PREFIX}${tokenData.userId}`;

    // Remove from user's token set
    await redis.srem(userTokensKey, refreshToken);
  }

  // Delete the token
  await redis.del(tokenKey);

  console.log('[RefreshToken] Token invalidated');
};

/**
 * Invalidates all refresh tokens for a user (logout all devices)
 * @param userId - The user ID
 */
export const invalidateAllUserRefreshTokens = async (userId: string): Promise<void> => {
  const redis = redisClient.getMaster();
  const userTokensKey = `${USER_REFRESH_TOKENS_PREFIX}${userId}`;

  // Get all refresh tokens for user
  const refreshTokens = await redis.smembers(userTokensKey);

  // Delete each token
  const deletePromises = refreshTokens.map(async (token) => {
    const tokenKey = `${REFRESH_TOKEN_PREFIX}${token}`;
    await redis.del(tokenKey);
  });

  await Promise.all(deletePromises);

  // Delete the user's token set
  await redis.del(userTokensKey);

  console.log(`[RefreshToken] Invalidated ${refreshTokens.length} tokens for user ${userId}`);
};

/**
 * Gets count of active refresh tokens for a user (active sessions)
 * @param userId - The user ID
 * @returns Number of active refresh tokens
 */
export const getActiveSessionCount = async (userId: string): Promise<number> => {
  const redis = redisClient.getMaster();
  const userTokensKey = `${USER_REFRESH_TOKENS_PREFIX}${userId}`;

  return await redis.scard(userTokensKey);
};

/**
 * Implements token rotation: invalidate old token and issue new one
 * @param oldRefreshToken - The old refresh token
 * @param payload - User authentication data
 * @param metadata - Optional request metadata
 * @returns New refresh token
 */
export const rotateRefreshToken = async (
  oldRefreshToken: string,
  payload: AuthPayload,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<string> => {
  // Invalidate old token
  await invalidateRefreshToken(oldRefreshToken);

  // Generate and store new token
  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(newRefreshToken, payload, metadata);

  console.log(`[RefreshToken] Token rotated for user ${payload.userId}`);

  return newRefreshToken;
};

// Export configuration constants for use in auth controller
export { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_TTL };
