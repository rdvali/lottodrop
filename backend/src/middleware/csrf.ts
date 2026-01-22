// SECURITY FIX: CSRF Protection Middleware
// Validates CSRF tokens on state-changing operations (POST, PUT, DELETE, PATCH)
// Prevents Cross-Site Request Forgery attacks

import { Request, Response, NextFunction } from 'express';
import { validateCsrfToken } from '../utils/csrfToken';
import { AuthPayload } from '../types';

/**
 * CSRF validation middleware (Week 4 Update)
 * Should be applied to state-changing routes (POST, PUT, DELETE, PATCH)
 * Supports both authenticated and unauthenticated requests:
 * - Authenticated: Validates against userId
 * - Unauthenticated: Validates against session (IP + User-Agent)
 */
export const validateCsrf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      next();
      return;
    }

    // Extract CSRF token from header or body
    const csrfToken = req.headers['x-csrf-token'] as string || req.body.csrfToken;

    if (!csrfToken) {
      res.status(403).json({
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING'
      });
      return;
    }

    // Get user ID from authenticated request (if available)
    const user = req.user as AuthPayload | undefined;

    let isValid: boolean;

    if (user && user.userId) {
      // Authenticated request: Validate against userId
      isValid = await validateCsrfToken(csrfToken, user.userId);
      if (!isValid) {
        console.warn(`[CSRF] Invalid token for user ${user.userId} on ${req.method} ${req.path}`);
      }
    } else {
      // Unauthenticated request: Validate against session ID (for login/register)
      const sessionId = `session:${req.ip}:${req.headers['user-agent']}`;
      isValid = await validateCsrfToken(csrfToken, sessionId);
      if (!isValid) {
        console.warn(`[CSRF] Invalid session token for ${req.ip} on ${req.method} ${req.path}`);
      }
    }

    if (!isValid) {
      res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
      return;
    }

    // Token is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error('[CSRF] Middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

/**
 * Optional CSRF validation middleware
 * Returns 403 if CSRF token is present but invalid
 * Allows requests without CSRF token to proceed (for gradual rollout)
 */
export const validateCsrfOptional = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip CSRF validation for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      next();
      return;
    }

    // Extract CSRF token from header or body
    const csrfToken = req.headers['x-csrf-token'] as string || req.body.csrfToken;

    // If no token provided, allow request to proceed (optional mode)
    if (!csrfToken) {
      next();
      return;
    }

    // Get user ID from authenticated request
    const user = req.user as AuthPayload;

    if (!user || !user.userId) {
      next();
      return;
    }

    // Validate CSRF token if provided
    const isValid = await validateCsrfToken(csrfToken, user.userId);

    if (!isValid) {
      console.warn(`[CSRF] Invalid token for user ${user.userId} on ${req.method} ${req.path}`);
      res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
      return;
    }

    // Token is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error('[CSRF] Middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};
