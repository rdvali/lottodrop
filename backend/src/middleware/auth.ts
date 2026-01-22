import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';
import redisClient from '../services/redis/redisClient';
import { extractAccessToken } from '../utils/cookieManager';
import { logger } from '../utils/logger';
import { logUnauthorizedAccess } from '../utils/auditLogger';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// SECURITY FIX (CRIT-003 + Week 4): Check token blacklist before authentication
// Prevents revoked/logged-out tokens from being used
// Week 4: Added support for HttpOnly cookie authentication
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  // SECURITY FIX (Week 4): Extract token from HttpOnly cookie (preferred) or Authorization header (fallback)
  const token = extractAccessToken(req);

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    // Check if token is blacklisted (logout/session revocation)
    const redis = redisClient.getMaster();
    const isBlacklisted = await redis.get(`blacklist:${token}`);

    if (isBlacklisted) {
      res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
      return;
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
      if (err) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
      }
      req.user = user as AuthPayload;
      next();
    });
  } catch (error) {
    logger.error('[Auth] Token validation error:', error);
    res.status(500).json({ error: 'Authentication error' });
    return;
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but allows request to proceed even if no token/invalid token
 * Used for endpoints that behave differently for authenticated vs unauthenticated users
 * (e.g., CSRF token generation)
 */
export const authenticateTokenOptional = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractAccessToken(req);

  if (!token) {
    // No token - proceed without user
    next();
    return;
  }

  try {
    // Check if token is blacklisted
    const redis = redisClient.getMaster();
    const isBlacklisted = await redis.get(`blacklist:${token}`);

    if (isBlacklisted) {
      // Token is blacklisted - proceed without user
      next();
      return;
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
      if (err) {
        // Invalid token - proceed without user
        next();
        return;
      }
      req.user = user as AuthPayload;
      next();
    });
  } catch (error) {
    // Error during validation - proceed without user
    logger.warn('[Auth] Optional token validation error:', error);
    next();
  }
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    // Log authorization failure to audit logs
    await logUnauthorizedAccess(
      req.user?.userId,
      req.path,
      req.ip,
      req.headers['user-agent'],
      {
        requiredRole: 'admin',
        userRole: req.user?.isAdmin ? 'admin' : 'user',
        action: req.method,
        resource: req.path
      }
    );

    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};