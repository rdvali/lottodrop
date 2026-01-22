// SECURITY FIX (HIGH-004): WebSocket re-authentication
// Implements periodic token validation for WebSocket connections
// Prevents compromised sessions from maintaining active connections

import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';
import redisClient from '../services/redis/redisClient';

// Configuration
const REAUTH_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const TOKEN_EXPIRY_BUFFER = 60; // 60 seconds buffer before expiration

export interface TokenValidationResult {
  isValid: boolean;
  reason?: 'expired' | 'blacklisted' | 'invalid' | 'missing';
  payload?: AuthPayload;
  expiresIn?: number; // Seconds until expiration
}

/**
 * Validates a JWT token and checks if it's blacklisted
 * @param token - The JWT token to validate
 * @returns Validation result with payload if valid
 */
export const validateSocketToken = async (
  token: string | undefined
): Promise<TokenValidationResult> => {
  if (!token) {
    return { isValid: false, reason: 'missing' };
  }

  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload & { exp: number };

    // Check if token is blacklisted (CRIT-003 integration)
    const redis = redisClient.getMaster();
    const isBlacklisted = await redis.get(`blacklist:${token}`);

    if (isBlacklisted) {
      console.warn(`[SocketAuth] Blacklisted token detected for user ${decoded.userId}`);
      return { isValid: false, reason: 'blacklisted' };
    }

    // Calculate time until expiration
    const currentTime = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - currentTime;

    // Check if token is about to expire (within buffer)
    if (expiresIn < TOKEN_EXPIRY_BUFFER) {
      console.warn(`[SocketAuth] Token about to expire for user ${decoded.userId} (${expiresIn}s remaining)`);
      return { isValid: false, reason: 'expired', expiresIn };
    }

    return {
      isValid: true,
      payload: decoded,
      expiresIn
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('[SocketAuth] Token expired:', error.message);
      return { isValid: false, reason: 'expired' };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('[SocketAuth] Invalid token:', error.message);
      return { isValid: false, reason: 'invalid' };
    }

    console.error('[SocketAuth] Token validation error:', error);
    return { isValid: false, reason: 'invalid' };
  }
};

/**
 * Creates a re-authentication interval for a socket connection
 * Periodically validates the token and disconnects if invalid
 * @param socketId - The socket ID
 * @param getToken - Function to retrieve the current token
 * @param onInvalid - Callback when token becomes invalid
 * @returns Interval ID for cleanup
 */
export const createReauthInterval = (
  socketId: string,
  getToken: () => string | undefined,
  onInvalid: (reason: string) => void
): NodeJS.Timeout => {
  const interval = setInterval(async () => {
    const token = getToken();
    const validation = await validateSocketToken(token);

    if (!validation.isValid) {
      console.warn(`[SocketAuth] Re-authentication failed for socket ${socketId}: ${validation.reason}`);
      onInvalid(validation.reason || 'unknown');
    } else {
      console.log(`[SocketAuth] Socket ${socketId} re-authenticated successfully (expires in ${validation.expiresIn}s)`);
    }
  }, REAUTH_CHECK_INTERVAL);

  console.log(`[SocketAuth] Re-authentication interval created for socket ${socketId}`);
  return interval;
};

/**
 * Clears a re-authentication interval
 * @param interval - The interval to clear
 */
export const clearReauthInterval = (interval: NodeJS.Timeout): void => {
  clearInterval(interval);
  console.log('[SocketAuth] Re-authentication interval cleared');
};

/**
 * Validates token before allowing socket connection
 * Used in Socket.IO middleware
 * @param token - The JWT token
 * @returns Promise that resolves with payload or rejects with error
 */
export const authenticateSocketConnection = async (
  token: string | undefined
): Promise<AuthPayload> => {
  const validation = await validateSocketToken(token);

  if (!validation.isValid) {
    const errorMessages = {
      missing: 'No authentication token provided',
      expired: 'Authentication token has expired',
      blacklisted: 'Authentication token has been revoked',
      invalid: 'Invalid authentication token'
    };

    throw new Error(errorMessages[validation.reason!] || 'Authentication failed');
  }

  return validation.payload!;
};

// Export configuration constants
export { REAUTH_CHECK_INTERVAL, TOKEN_EXPIRY_BUFFER };
