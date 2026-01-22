import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthPayload } from '../types';
import redisClient from '../services/redis/redisClient';
import { validatePassword } from '../utils/passwordValidator';
import { checkAccountLockout, recordFailedAttempt, clearFailedAttempts } from '../utils/accountLockout';
import {
  generateRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserRefreshTokens,
  rotateRefreshToken,
  ACCESS_TOKEN_EXPIRY
} from '../utils/refreshToken';
import {
  generateCsrfToken,
  storeCsrfToken,
  invalidateAllUserCsrfTokens,
  CSRF_TOKEN_TTL
} from '../utils/csrfToken';
import {
  getUserEnumerationSafeMessage,
  sanitizeDatabaseError,
  sanitizeValidationErrors,
  logSensitiveError,
  ErrorCodes
} from '../utils/errorSanitizer';
import {
  logAuth,
  logAdminAction,
  AuditEventType
} from '../utils/auditLogger';
import { logger } from '../utils/logger';
import {
  setAuthCookies,
  clearAllAuthCookies,
  extractAccessToken,
  extractRefreshToken
} from '../utils/cookieManager';
import {
  logLogin,
  logLoginFailure,
  logLogout,
  logRegister,
  logPasswordChange,
  logTokenRefresh,
  logSessionExpired
} from '../utils/authLogger';

export const register = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // SECURITY FIX (HIGH-001): Validate password strength
    const passwordValidation = validatePassword(password, [
      email.split('@')[0], // username from email
      firstName,
      lastName
    ]);

    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.message,
        score: passwordValidation.score,
        feedback: passwordValidation.feedback
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, first_name, last_name, email, balance, currency, is_admin, created_at`,
      [firstName, lastName, email, passwordHash]
    );

    const user = result.rows[0];

    // SECURITY FIX (CRIT-002): Generate short-lived access token (15 min)
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: ACCESS_TOKEN_EXPIRY // 15 minutes
    } as jwt.SignOptions);

    // SECURITY FIX (CRIT-002): Generate long-lived refresh token (7 days)
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(refreshToken, payload, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    // SECURITY FIX (Week 3): Audit log successful registration
    await logAuth(
      AuditEventType.REGISTER,
      user.id,
      req.ip,
      req.headers['user-agent'],
      true,
      { email, firstName, lastName }
    );

    // SECURITY FIX (Week 4): Set HttpOnly cookies for tokens
    setAuthCookies(res, accessToken, refreshToken);

    // Log successful registration
    await logRegister(user.id, req.ip, req.headers['user-agent'], { email: user.email });

    return res.status(201).json({
      message: 'Registration successful',
      // Tokens also included in response for backward compatibility
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        currency: user.currency,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    // SECURITY FIX (Week 3): Sanitize database errors
    logSensitiveError(error as Error, { endpoint: 'register', email });
    const sanitized = sanitizeDatabaseError(error);
    return res.status(sanitized.statusCode).json(sanitized);
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  logger.auth(`Login attempt for email: ${email}`);

  try {
    // Validate input
    if (!email || !password) {
      logger.debug('Missing email or password in login request');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // SECURITY FIX (HIGH-002): Check account lockout status
    const lockoutStatus = await checkAccountLockout(email);

    if (lockoutStatus.isLocked) {
      const minutes = Math.ceil(lockoutStatus.lockoutDuration! / 60);
      return res.status(429).json({
        error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutes} minutes.`,
        lockoutDuration: lockoutStatus.lockoutDuration,
        retryAfter: lockoutStatus.lockoutDuration
      });
    }

    // Get user
    logger.debug('Querying database for user');
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, balance, currency, is_admin, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      logger.info('Login failed: User not found');

      // SECURITY FIX (HIGH-002 + Week 3): Record failed attempt even for non-existent users
      // Prevents username enumeration attacks by returning same message
      await recordFailedAttempt(email);

      // SECURITY FIX (Week 3): Audit log failed login (user not found)
      await logAuth(
        AuditEventType.LOGIN_FAILURE,
        undefined,
        req.ip,
        req.headers['user-agent'],
        false,
        { email, reason: 'user_not_found' }
      );

      // Log failed login to auth_logs table
      await logLoginFailure(undefined, req.ip, req.headers['user-agent'], { email, reason: 'user_not_found' });

      return res.status(401).json({
        error: getUserEnumerationSafeMessage(),
        code: ErrorCodes.INVALID_CREDENTIALS
      });
    }
    logger.debug(`User found: ${result.rows[0].email}`);

    const user = result.rows[0];

    // SECURITY FIX (Week 3): Check if user is active without revealing account existence
    if (!user.is_active) {
      await recordFailedAttempt(email);

      // SECURITY FIX (Week 3): Audit log failed login (inactive account)
      await logAuth(
        AuditEventType.LOGIN_FAILURE,
        user.id,
        req.ip,
        req.headers['user-agent'],
        false,
        { email, reason: 'account_inactive' }
      );

      // Log failed login to auth_logs table
      await logLoginFailure(user.id, req.ip, req.headers['user-agent'], { email, reason: 'account_inactive' });

      return res.status(401).json({
        error: getUserEnumerationSafeMessage(),
        code: ErrorCodes.INVALID_CREDENTIALS
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      // SECURITY FIX (HIGH-002 + Week 3): Record failed login attempt
      const attemptStatus = await recordFailedAttempt(email);

      // SECURITY FIX (Week 3): Audit log failed login (wrong password)
      await logAuth(
        attemptStatus.isLocked ? AuditEventType.ACCOUNT_LOCKED : AuditEventType.LOGIN_FAILURE,
        user.id,
        req.ip,
        req.headers['user-agent'],
        false,
        {
          email,
          reason: attemptStatus.isLocked ? 'account_locked' : 'wrong_password',
          remainingAttempts: attemptStatus.remainingAttempts
        }
      );

      // Log failed login to auth_logs table
      await logLoginFailure(user.id, req.ip, req.headers['user-agent'], {
        email,
        reason: attemptStatus.isLocked ? 'account_locked' : 'wrong_password',
        remainingAttempts: attemptStatus.remainingAttempts
      });

      if (attemptStatus.isLocked) {
        const minutes = Math.ceil(attemptStatus.lockoutDuration! / 60);
        return res.status(429).json({
          error: `Too many failed login attempts. Account locked for ${minutes} minutes.`,
          code: ErrorCodes.ACCOUNT_LOCKED,
          lockoutDuration: attemptStatus.lockoutDuration,
          retryAfter: attemptStatus.lockoutDuration
        });
      }

      // SECURITY FIX (Week 3): Use user enumeration-safe message
      return res.status(401).json({
        error: getUserEnumerationSafeMessage(),
        code: ErrorCodes.INVALID_CREDENTIALS,
        remainingAttempts: attemptStatus.remainingAttempts
      });
    }

    // SECURITY FIX (HIGH-002): Clear failed attempts after successful login
    await clearFailedAttempts(email);

    // SECURITY FIX (CRIT-002): Generate short-lived access token (15 min)
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: ACCESS_TOKEN_EXPIRY // 15 minutes
    } as jwt.SignOptions);

    // SECURITY FIX (CRIT-002): Generate long-lived refresh token (7 days)
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(refreshToken, payload, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    logger.auth(`Login successful for user ${user.id} (access token: 15min, refresh token: 7d)`);

    // SECURITY FIX (Week 3): Audit log successful login
    await logAuth(
      AuditEventType.LOGIN_SUCCESS,
      user.id,
      req.ip,
      req.headers['user-agent'],
      true,
      { email, isAdmin: user.is_admin }
    );

    // Log successful login to auth_logs table
    await logLogin(user.id, req.ip, req.headers['user-agent'], { email: user.email });

    // SECURITY FIX (Week 4): Set HttpOnly cookies for tokens
    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      message: 'Login successful',
      // Tokens also included in response for backward compatibility
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        currency: user.currency,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    // SECURITY FIX (Week 3): Sanitize database errors
    logSensitiveError(error as Error, { endpoint: 'login', email });
    const sanitized = sanitizeDatabaseError(error);
    return res.status(sanitized.statusCode).json(sanitized);
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, balance, currency, is_admin, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    return res.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      balance: parseFloat(user.balance),
      currency: user.currency,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  // Accept both 'oldPassword' and 'currentPassword' for backward compatibility
  const { oldPassword, currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  // Use whichever field is provided (prioritize currentPassword for consistency with frontend)
  const passwordToVerify = currentPassword || oldPassword;

  try {
    // Validate input
    if (!passwordToVerify || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get current user info for password validation context
    const userResult = await pool.query(
      'SELECT password_hash, email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(passwordToVerify, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // SECURITY FIX (HIGH-001): Validate new password strength
    const passwordValidation = validatePassword(newPassword, [
      user.email.split('@')[0],
      user.first_name,
      user.last_name
    ]);

    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.message,
        score: passwordValidation.score,
        feedback: passwordValidation.feedback
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Log password change to audit logs
    await logAuth(
      AuditEventType.PASSWORD_CHANGE,
      userId,
      req.ip,
      req.headers['user-agent'],
      true,
      {
        method: 'manual_change',
        email: user.email
      }
    );

    // Log password change to auth_logs table
    await logPasswordChange(userId, req.ip, req.headers['user-agent'], true);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserRooms = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    // Get all rooms where user is currently participating in active rounds
    const result = await pool.query(
      `SELECT DISTINCT r.id, r.name, r.type, r.bet_amount, r.status,
              gr.id as round_id, rp.bet_amount as user_bet, gr.created_at
       FROM rooms r
       JOIN game_rounds gr ON gr.room_id = r.id
       JOIN round_participants rp ON rp.round_id = gr.id
       WHERE rp.user_id = $1
         AND gr.completed_at IS NULL
         AND r.status IN ('WAITING', 'ACTIVE')
       ORDER BY gr.created_at DESC`,
      [userId]
    );

    return res.json({
      rooms: result.rows
    });
  } catch (error) {
    console.error('Get user rooms error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// SECURITY FIX (CRIT-002 + CRIT-003): Implement logout with token blacklist
// This endpoint allows users to invalidate their JWT tokens server-side
// Tokens are blacklisted in Redis until their natural expiration
// Also invalidates refresh token to prevent token refresh after logout
export const logout = async (req: Request, res: Response) => {
  try {
    // SECURITY FIX (Week 4): Extract access token from cookie or Authorization header
    const accessToken = extractAccessToken(req);

    if (!accessToken) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Decode access token to get expiration time and user ID
    const decoded = jwt.decode(accessToken) as AuthPayload & { exp: number };

    if (!decoded || !decoded.exp) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    // Calculate TTL (time-to-live) for Redis key
    const currentTime = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - currentTime;

    // Blacklist access token if it hasn't already expired
    if (ttl > 0) {
      const redis = redisClient.getMaster();
      await redis.setex(`blacklist:${accessToken}`, ttl, '1');
      logger.auth(`Access token blacklisted for user ${decoded.userId} (TTL: ${ttl}s)`);
    }

    // SECURITY FIX (CRIT-002 + Week 4): Invalidate refresh token
    // Extract refresh token from cookie or request body
    const refreshToken = extractRefreshToken(req);

    if (refreshToken) {
      await invalidateRefreshToken(refreshToken);
      logger.auth(`Refresh token invalidated for user ${decoded.userId}`);
    } else {
      // If no refresh token provided, invalidate all user's refresh tokens (logout all devices)
      await invalidateAllUserRefreshTokens(decoded.userId);
      logger.auth(`All refresh tokens invalidated for user ${decoded.userId}`);
    }

    // SECURITY FIX: Invalidate all CSRF tokens on logout
    await invalidateAllUserCsrfTokens(decoded.userId);
    logger.auth(`CSRF tokens invalidated for user ${decoded.userId}`);

    // SECURITY FIX (Week 3): Audit log successful logout
    await logAuth(
      AuditEventType.LOGOUT,
      decoded.userId,
      req.ip,
      req.headers['user-agent'],
      true,
      { logoutAll: !refreshToken }
    );

    // Log logout to auth_logs table
    await logLogout(decoded.userId, req.ip, req.headers['user-agent']);

    // SECURITY FIX (Week 4): Clear all authentication cookies
    clearAllAuthCookies(res);

    return res.json({
      message: 'Logged out successfully',
      success: true
    });
  } catch (error) {
    // SECURITY FIX (Week 3): Sanitize logout errors
    logSensitiveError(error as Error, { endpoint: 'logout' });
    const sanitized = sanitizeDatabaseError(error);
    return res.status(sanitized.statusCode).json(sanitized);
  }
};

// SECURITY FIX (CRIT-002): Token refresh endpoint
// Implements token rotation: old refresh token is invalidated, new one is issued
// This prevents stolen refresh tokens from being used indefinitely
export const refresh = async (req: Request, res: Response) => {
  try {
    // SECURITY FIX (Week 4): Extract refresh token from cookie or request body
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Validate refresh token
    const tokenData = await validateRefreshToken(refreshToken);

    if (!tokenData) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new access token (15 minutes)
    const payload: AuthPayload = {
      userId: tokenData.userId,
      email: tokenData.email,
      isAdmin: tokenData.isAdmin
    };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: ACCESS_TOKEN_EXPIRY // 15 minutes
    } as jwt.SignOptions);

    // SECURITY FIX (CRIT-002): Implement token rotation
    // Invalidate old refresh token and issue new one
    const newRefreshToken = await rotateRefreshToken(refreshToken, payload, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    logger.auth(`Token refreshed for user ${tokenData.userId} (old token rotated)`);

    // Log token refresh to audit logs
    await logAuth(
      AuditEventType.TOKEN_REFRESHED,
      tokenData.userId,
      req.ip,
      req.headers['user-agent'],
      true,
      {
        email: tokenData.email,
        tokenRotated: true
      }
    );

    // SECURITY FIX (Week 4): Set new HttpOnly cookies for refreshed tokens
    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.json({
      message: 'Token refreshed successfully',
      // Tokens also included in response for backward compatibility
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// SECURITY FIX (Week 4): CSRF token generation endpoint
// Generates a CSRF token for both authenticated and unauthenticated users
// For authenticated users: Token is tied to userId
// For unauthenticated users: Token is session-based (for login/register)
// Token must be included in state-changing requests (POST, PUT, DELETE, PATCH)
export const getCsrfToken = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthPayload | undefined;

    // Generate CSRF token
    const csrfToken = generateCsrfToken();

    if (user && user.userId) {
      // Authenticated user: Store token with user association
      await storeCsrfToken(csrfToken, user.userId);
      logger.info(`CSRF token generated for authenticated user ${user.userId}`);
    } else {
      // Unauthenticated user: Store token with session ID (IP + User-Agent hash)
      // This allows CSRF protection for login/register endpoints
      const sessionId = `session:${req.ip}:${req.headers['user-agent']}`;
      await storeCsrfToken(csrfToken, sessionId);
      logger.info(`CSRF token generated for unauthenticated session (${req.ip})`);
    }

    return res.json({
      csrfToken,
      expiresIn: CSRF_TOKEN_TTL // 1 hour in seconds
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user activity logs from dedicated auth_logs table
export const getUserLogs = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      action
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];
    let paramCount = 2;

    // Filter by action type
    if (action && action !== 'all') {
      params.push(action);
      whereClause += ` AND action = $${paramCount}`;
      paramCount++;
    }

    // Filter by date range
    if (startDate) {
      params.push(startDate);
      whereClause += ` AND created_at >= $${paramCount}`;
      paramCount++;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND created_at <= $${paramCount}`;
      paramCount++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM auth_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get logs
    const query = `
      SELECT
        id,
        action,
        created_at as timestamp,
        ip_address as ip,
        user_agent,
        status,
        metadata
      FROM auth_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Transform logs to match frontend expectations
    const logs = result.rows.map(row => ({
      id: row.id,
      action: row.action,
      timestamp: row.timestamp,
      ip: row.ip || 'Unknown',
      device: parseUserAgent(row.user_agent),
      status: row.status,
      metadata: row.metadata
    }));

    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: logs,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get user logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user logs'
    });
  }
};

/**
 * Log session expiration event
 * This endpoint can be called without authentication (since token is expired)
 * but we try to extract userId from the expired token if possible
 */
export const logSessionExpiry = async (req: Request, res: Response) => {
  try {
    const { userId, lastActivity } = req.body;

    // Log session expiry with available information
    await logSessionExpired(
      userId, // May be undefined if token completely invalid
      req.ip,
      req.headers['user-agent'],
      {
        reason: 'token_expired',
        lastActivity: lastActivity || new Date().toISOString()
      }
    );

    return res.json({
      success: true,
      message: 'Session expiry logged successfully'
    });
  } catch (error) {
    console.error('Log session expiry error:', error);
    // Don't return 500, just log and continue
    // Session expiry logging is not critical enough to fail the flow
    return res.json({
      success: false,
      error: 'Failed to log session expiry'
    });
  }
};

// Helper function to parse user agent into friendly device string
function parseUserAgent(userAgent: string | undefined): string {
  if (!userAgent) return 'Unknown Device';

  try {
    // Simple user agent parsing
    const ua = userAgent.toLowerCase();

    // Handle command-line tools and API clients
    if (ua.includes('curl')) return 'cURL Client';
    if (ua.includes('postman')) return 'Postman API Client';
    if (ua.includes('insomnia')) return 'Insomnia API Client';
    if (ua.includes('httpie')) return 'HTTPie Client';

    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    // Detect OS
    if (ua.includes('mac os x')) os = 'MacOS';
    else if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Detect Browser
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    // If both OS and browser are unknown, return a generic message
    if (os === 'Unknown OS' && browser === 'Unknown Browser') {
      return 'Unknown Device';
    }

    return `${os} ${browser}`;
  } catch {
    return 'Unknown Device';
  }
}