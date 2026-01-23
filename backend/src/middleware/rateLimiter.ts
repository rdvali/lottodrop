import { Request, Response, NextFunction } from 'express';
import RedisClient from '../services/redis/redisClient';
import { REDIS_KEYS, REDIS_KEY_TTL } from '../config/redis.config';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  skip?: (req: Request) => boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

class RateLimiter {
  private static instance: RateLimiter;

  private constructor() {}

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  public createLimiter(options: RateLimitOptions = {}) {
    const {
      windowMs = 60000, // 1 minute default
      max = 100, // 100 requests per window default
      message = 'Too many requests, please try again later.',
      statusCode = 429,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = this.defaultKeyGenerator,
      handler = this.defaultHandler,
      skip = () => false,
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if should skip
        if (skip(req)) {
          return next();
        }

        const key = keyGenerator(req);
        const redis = RedisClient.getMaster();
        
        // Get current count
        const current = await redis.incr(key);
        
        // Set expiry on first request
        if (current === 1) {
          await redis.expire(key, Math.ceil(windowMs / 1000));
        }
        
        // Get TTL for reset time
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + ttl * 1000);
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current).toString());
        res.setHeader('X-RateLimit-Reset', resetTime.toISOString());
        
        // Check if limit exceeded
        if (current > max) {
          res.setHeader('Retry-After', ttl.toString());
          
          if (handler) {
            return handler(req, res);
          }
          
          return res.status(statusCode).json({
            error: message,
            retryAfter: ttl,
            resetTime: resetTime.toISOString(),
          });
        }
        
        // Store rate limit info in request
        (req as any).rateLimit = {
          limit: max,
          current,
          remaining: max - current,
          resetTime,
        } as RateLimitInfo;
        
        // Handle response to potentially skip counting
        if (skipSuccessfulRequests || skipFailedRequests) {
          const originalSend = res.send;
          res.send = function(data) {
            const shouldSkip = 
              (skipSuccessfulRequests && res.statusCode < 400) ||
              (skipFailedRequests && res.statusCode >= 400);
            
            if (shouldSkip) {
              // Decrement the counter
              redis.decr(key).catch(err => 
                console.error('Failed to decrement rate limit counter:', err)
              );
            }
            
            return originalSend.call(this, data);
          };
        }
        
        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // In case of Redis error, allow the request
        next();
      }
    };
  }

  private defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const endpoint = req.path;
    return REDIS_KEYS.RATE_LIMIT_API(ip, endpoint);
  }

  private defaultHandler(req: Request, res: Response): void {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      message: 'Rate limit exceeded',
    });
  }

  // Preset limiters for common use cases
  public strict() {
    return this.createLimiter({
      windowMs: 60000, // 1 minute
      max: 10,
      message: 'Rate limit exceeded. Please wait before trying again.',
    });
  }

  public standard() {
    return this.createLimiter({
      windowMs: 60000, // 1 minute
      max: 120, // Increased from 60 to 120
      message: 'Too many requests. Please slow down.',
    });
  }

  public relaxed() {
    return this.createLimiter({
      windowMs: 60000, // 1 minute
      max: 500, // Increased from 200 to 500
      message: 'Request limit reached. Please wait a moment.',
    });
  }

  public api() {
    return this.createLimiter({
      windowMs: 60000, // 1 minute
      max: 300, // Increased from 100 to 300 requests per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: true,
    });
  }

  public auth() {
    // SECURITY FIX (Week 3): Stricter rate limiting for authentication endpoints
    return this.createLimiter({
      windowMs: 300000, // 5 minutes
      max: 5, // SECURITY: Reduced from 20 to 5 attempts per 5 minutes
      message: 'Too many authentication attempts. Please try again in 5 minutes.',
      statusCode: 429,
      skipSuccessfulRequests: true, // Only count failed login attempts
      skipFailedRequests: false,
      keyGenerator: (req) => {
        const ip = req.ip || 'unknown';
        return REDIS_KEYS.RATE_LIMIT_API(ip, 'auth');
      },
    });
  }

  public transaction() {
    return this.createLimiter({
      windowMs: 60000, // 1 minute
      max: 10,
      message: 'Transaction rate limit exceeded. Please wait before making another transaction.',
      keyGenerator: (req) => {
        const userId = (req as any).user?.id || 'anonymous';
        return REDIS_KEYS.RATE_LIMIT_API(userId, 'transaction');
      },
    });
  }

  /**
   * Webhook rate limiter - stricter limits for external webhook endpoints
   * Prevents DoS attacks and brute force attempts on webhook endpoints
   * Rate limits by IP AND payment_id to prevent flooding
   */
  public webhook() {
    return this.createLimiter({
      windowMs: 60000, // 1 minute
      max: 30, // 30 requests per minute (0.5/sec) - much stricter than API
      message: 'Too many webhook requests. Rate limit exceeded.',
      statusCode: 429,
      keyGenerator: (req) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        // Include payment_id in key to rate limit per payment
        const paymentId = req.body?.payment_id || req.body?.paymentId || 'unknown';
        return REDIS_KEYS.RATE_LIMIT_API(ip, `webhook:${paymentId}`);
      },
    });
  }

  /**
   * Webhook IP rate limiter - global rate limit per IP for webhook endpoints
   * Separate from payment-specific rate limiting
   */
  public webhookGlobal() {
    return this.createLimiter({
      windowMs: 60000, // 1 minute
      max: 60, // 60 requests per minute per IP across all payments
      message: 'Too many webhook requests from this IP.',
      statusCode: 429,
      keyGenerator: (req) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return REDIS_KEYS.RATE_LIMIT_API(ip, 'webhook:global');
      },
    });
  }

  // Socket.IO rate limiting
  public createSocketLimiter(options: {
    windowMs?: number;
    max?: number;
    message?: string;
  } = {}) {
    const {
      windowMs = 1000, // 1 second default for sockets
      max = 10,
      message = 'Too many socket events',
    } = options;

    return async (socket: any, next: (err?: Error) => void) => {
      try {
        const userId = socket.userId || socket.id;
        const key = REDIS_KEYS.RATE_LIMIT_SOCKET(userId);
        const redis = RedisClient.getMaster();
        
        const current = await redis.incr(key);
        
        if (current === 1) {
          await redis.expire(key, Math.ceil(windowMs / 1000));
        }
        
        if (current > max) {
          const error = new Error(message);
          (error as any).type = 'RATE_LIMIT_ERROR';
          (error as any).data = {
            limit: max,
            current,
            windowMs,
          };
          return next(error);
        }
        
        next();
      } catch (error) {
        console.error('Socket rate limiter error:', error);
        next();
      }
    };
  }

  // Get rate limit info for a key
  public async getRateLimitInfo(key: string, max: number): Promise<RateLimitInfo | null> {
    try {
      const redis = RedisClient.getReplica();
      
      const [current, ttl] = await Promise.all([
        redis.get(key),
        redis.ttl(key),
      ]);
      
      if (!current) {
        return {
          limit: max,
          current: 0,
          remaining: max,
          resetTime: new Date(Date.now() + 60000),
        };
      }
      
      const currentCount = parseInt(current);
      const resetTime = ttl > 0 ? new Date(Date.now() + ttl * 1000) : new Date();
      
      return {
        limit: max,
        current: currentCount,
        remaining: Math.max(0, max - currentCount),
        resetTime,
      };
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
      return null;
    }
  }

  // Reset rate limit for a specific key
  public async resetRateLimit(key: string): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const result = await redis.del(key);
      return result === 1;
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
      return false;
    }
  }

  // Reset all rate limits for a user
  public async resetUserRateLimits(userId: string): Promise<number> {
    try {
      const redis = RedisClient.getMaster();
      const pattern = `*ratelimit:*${userId}*`;
      
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Failed to reset user rate limits:', error);
      return 0;
    }
  }
}

// Export singleton instance
const rateLimiter = RateLimiter.getInstance();

// Export middleware creators
export const strictLimit = rateLimiter.strict.bind(rateLimiter);
export const standardLimit = rateLimiter.standard.bind(rateLimiter);
export const relaxedLimit = rateLimiter.relaxed.bind(rateLimiter);
export const apiLimit = rateLimiter.api.bind(rateLimiter);
export const authLimit = rateLimiter.auth.bind(rateLimiter);
export const transactionLimit = rateLimiter.transaction.bind(rateLimiter);
export const webhookLimit = rateLimiter.webhook.bind(rateLimiter);
export const webhookGlobalLimit = rateLimiter.webhookGlobal.bind(rateLimiter);

export default rateLimiter;