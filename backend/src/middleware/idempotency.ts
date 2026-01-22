// SECURITY FIX (HIGH-007): Idempotency middleware for financial transactions
// Prevents duplicate charges from double-clicks, network retries, or malicious replay attacks
// Uses Redis to cache responses with idempotency keys

import { Request, Response, NextFunction } from 'express';
import redisClient from '../services/redis/redisClient';

// Configuration
const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds
const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Middleware to handle idempotent requests
 * Stores successful responses in Redis and returns cached responses for duplicate requests
 *
 * Usage:
 * router.post('/api/rooms/:roomId/join', authenticateToken, idempotencyMiddleware, joinRoom);
 */
export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get idempotency key from header
    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER] as string;

    // If no idempotency key provided, proceed without caching
    // (Makes middleware optional - client decides when to use it)
    if (!idempotencyKey) {
      next();
      return;
    }

    // Validate idempotency key format (must be UUID or similar unique string)
    if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      res.status(400).json({
        error: 'Invalid idempotency key format. Must be 16-128 characters.'
      });
      return;
    }

    const redis = redisClient.getMaster();

    // Create unique cache key combining user ID and idempotency key
    // This prevents collisions between different users using same key
    const userId = (req.user as any)?.userId || 'anonymous';
    const cacheKey = `idempotency:${userId}:${idempotencyKey}`;

    // Check if request has already been processed
    const cachedResponse = await redis.get(cacheKey);

    if (cachedResponse) {
      // Return cached response
      console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);

      try {
        const parsed = JSON.parse(cachedResponse);

        // Set status code if it was cached
        if (parsed.statusCode) {
          res.status(parsed.statusCode);
        }

        res.json(parsed.body);
        return;
      } catch (parseError) {
        // If parsing fails, log error but proceed with new request
        console.error('[Idempotency] Failed to parse cached response:', parseError);
      }
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Only cache successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const responseData = {
          statusCode: res.statusCode,
          body: body
        };

        // Cache response asynchronously (don't block response)
        redis
          .setex(cacheKey, IDEMPOTENCY_TTL, JSON.stringify(responseData))
          .then(() => {
            console.log(`[Idempotency] Cached response for key: ${idempotencyKey}`);
          })
          .catch((error) => {
            console.error('[Idempotency] Failed to cache response:', error);
          });
      }

      return originalJson(body);
    };

    // Proceed to actual request handler
    next();
  } catch (error) {
    console.error('[Idempotency] Middleware error:', error);

    // On error, proceed without idempotency protection
    // Better to process request than fail entirely
    next();
  }
};

/**
 * Manually invalidate an idempotency key (admin function)
 * @param userId - User ID
 * @param idempotencyKey - Idempotency key to invalidate
 */
export const invalidateIdempotencyKey = async (
  userId: string,
  idempotencyKey: string
): Promise<void> => {
  const redis = redisClient.getMaster();
  const cacheKey = `idempotency:${userId}:${idempotencyKey}`;

  await redis.del(cacheKey);
  console.log(`[Idempotency] Invalidated key: ${idempotencyKey} for user: ${userId}`);
};
