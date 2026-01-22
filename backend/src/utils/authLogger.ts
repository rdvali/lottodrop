// Simple authentication logging utility
// Logs to dedicated auth_logs table without affecting existing audit_logs

import pool from '../config/database';

export interface AuthLogEntry {
  userId?: string;
  action: string; // LOGIN, LOGOUT, REGISTER, PASSWORD_CHANGE, AUTH_FAILURE, TOKEN_REFRESH, UNAUTHORIZED_ACCESS, SESSION_EXPIRED
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  metadata?: Record<string, any>;
}

/**
 * Log an authentication event to the auth_logs table
 */
export async function logAuthEvent(entry: AuthLogEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO auth_logs (user_id, action, ip_address, user_agent, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.userId || null,
        entry.action,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.status,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]
    );

    // Log to console for immediate visibility
    console.log(`[AuthLog] ${entry.action} - ${entry.status}`, {
      userId: entry.userId,
      ip: entry.ipAddress,
      metadata: entry.metadata
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error('[AuthLogger] Failed to log auth event:', error);
    console.error('[AuthLogger] Failed entry:', entry);
  }
}

/**
 * Helper function to log successful login
 */
export async function logLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'LOGIN',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata
  });
}

/**
 * Helper function to log failed login
 */
export async function logLoginFailure(
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'LOGIN',
    ipAddress,
    userAgent,
    status: 'FAILED',
    metadata
  });
}

/**
 * Helper function to log logout
 */
export async function logLogout(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'LOGOUT',
    ipAddress,
    userAgent,
    status: 'SUCCESS'
  });
}

/**
 * Helper function to log registration
 */
export async function logRegister(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'REGISTER',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata
  });
}

/**
 * Helper function to log password change
 */
export async function logPasswordChange(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  success: boolean = true
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'PASSWORD_CHANGE',
    ipAddress,
    userAgent,
    status: success ? 'SUCCESS' : 'FAILED'
  });
}

/**
 * Helper function to log token refresh
 */
export async function logTokenRefresh(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'TOKEN_REFRESH',
    ipAddress,
    userAgent,
    status: 'SUCCESS'
  });
}

/**
 * Helper function to log unauthorized access attempts
 */
export async function logUnauthorizedAccess(
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuthEvent({
    action: 'UNAUTHORIZED_ACCESS',
    ipAddress,
    userAgent,
    status: 'FAILED',
    metadata
  });
}

/**
 * Helper function to log session expiration/timeout
 */
export async function logSessionExpired(
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'SESSION_EXPIRED',
    ipAddress,
    userAgent,
    status: 'TIMEOUT',
    metadata
  });
}
