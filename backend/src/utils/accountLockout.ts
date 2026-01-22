// SECURITY FIX (HIGH-002): Account lockout mechanism
// Prevents brute force attacks by implementing progressive lockout
// Tracks failed login attempts per user account in Redis

import redisClient from '../services/redis/redisClient';

export interface LockoutStatus {
  isLocked: boolean;
  remainingAttempts?: number;
  lockoutDuration?: number; // in seconds
  attemptCount: number;
}

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 1800; // 30 minutes in seconds
const ATTEMPT_WINDOW = 900; // 15 minutes in seconds

/**
 * Records a failed login attempt for a user
 * @param email - User's email address
 * @returns Lockout status including whether account is locked
 */
export const recordFailedAttempt = async (email: string): Promise<LockoutStatus> => {
  const redis = redisClient.getMaster();
  const attemptKey = `login_attempts:${email.toLowerCase()}`;
  const lockoutKey = `account_locked:${email.toLowerCase()}`;

  // Check if account is already locked
  const isCurrentlyLocked = await redis.get(lockoutKey);
  if (isCurrentlyLocked) {
    const ttl = await redis.ttl(lockoutKey);
    return {
      isLocked: true,
      lockoutDuration: ttl > 0 ? ttl : LOCKOUT_DURATION,
      attemptCount: MAX_ATTEMPTS
    };
  }

  // Increment failed attempt counter
  const attempts = await redis.incr(attemptKey);

  // Set expiration on first attempt (sliding window)
  if (attempts === 1) {
    await redis.expire(attemptKey, ATTEMPT_WINDOW);
  }

  // Lock account if max attempts reached
  if (attempts >= MAX_ATTEMPTS) {
    await redis.setex(lockoutKey, LOCKOUT_DURATION, '1');

    // Log security event
    console.warn(`[SECURITY] Account locked due to ${attempts} failed login attempts: ${email}`);

    return {
      isLocked: true,
      lockoutDuration: LOCKOUT_DURATION,
      attemptCount: attempts
    };
  }

  // Account not locked yet
  return {
    isLocked: false,
    remainingAttempts: MAX_ATTEMPTS - attempts,
    attemptCount: attempts
  };
};

/**
 * Clears failed login attempts after successful login
 * @param email - User's email address
 */
export const clearFailedAttempts = async (email: string): Promise<void> => {
  const redis = redisClient.getMaster();
  const attemptKey = `login_attempts:${email.toLowerCase()}`;

  await redis.del(attemptKey);
};

/**
 * Checks if an account is currently locked
 * @param email - User's email address
 * @returns Lockout status
 */
export const checkAccountLockout = async (email: string): Promise<LockoutStatus> => {
  const redis = redisClient.getMaster();
  const attemptKey = `login_attempts:${email.toLowerCase()}`;
  const lockoutKey = `account_locked:${email.toLowerCase()}`;

  // Check if account is locked
  const isLocked = await redis.get(lockoutKey);

  if (isLocked) {
    const ttl = await redis.ttl(lockoutKey);
    return {
      isLocked: true,
      lockoutDuration: ttl > 0 ? ttl : 0,
      attemptCount: MAX_ATTEMPTS
    };
  }

  // Get current attempt count
  const attemptsStr = await redis.get(attemptKey);
  const attempts = attemptsStr ? parseInt(attemptsStr) : 0;

  return {
    isLocked: false,
    remainingAttempts: MAX_ATTEMPTS - attempts,
    attemptCount: attempts
  };
};

/**
 * Manually unlocks an account (admin function)
 * @param email - User's email address
 */
export const unlockAccount = async (email: string): Promise<void> => {
  const redis = redisClient.getMaster();
  const attemptKey = `login_attempts:${email.toLowerCase()}`;
  const lockoutKey = `account_locked:${email.toLowerCase()}`;

  await redis.del(attemptKey);
  await redis.del(lockoutKey);

  console.log(`[SECURITY] Account manually unlocked: ${email}`);
};
