// SECURITY FIX (Week 3): Comprehensive Audit Logging
// Logs all critical security and financial operations for compliance and forensics

import pool from '../config/database';

/**
 * Audit event categories for classification
 */
export enum AuditCategory {
  // Authentication & Authorization
  AUTH = 'AUTH',
  SESSION = 'SESSION',

  // User Management
  USER = 'USER',
  ADMIN = 'ADMIN',

  // Financial Operations
  TRANSACTION = 'TRANSACTION',
  BALANCE = 'BALANCE',

  // Game Operations
  GAME = 'GAME',
  ROOM = 'ROOM',

  // Security Events
  SECURITY = 'SECURITY',
  ACCESS_CONTROL = 'ACCESS_CONTROL',

  // System Events
  SYSTEM = 'SYSTEM',
  CONFIG = 'CONFIG',
}

/**
 * Audit event types for specific actions
 */
export enum AuditEventType {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // Session Management
  TOKEN_ISSUED = 'TOKEN_ISSUED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Account Security
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  FAILED_LOGIN_ATTEMPT = 'FAILED_LOGIN_ATTEMPT',
  CSRF_VALIDATION_FAILURE = 'CSRF_VALIDATION_FAILURE',
  MASS_ASSIGNMENT_ATTEMPT = 'MASS_ASSIGNMENT_ATTEMPT',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_REACTIVATED = 'USER_REACTIVATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',

  // Admin Actions
  ADMIN_PRIVILEGE_GRANTED = 'ADMIN_PRIVILEGE_GRANTED',
  ADMIN_PRIVILEGE_REVOKED = 'ADMIN_PRIVILEGE_REVOKED',
  ADMIN_ACTION = 'ADMIN_ACTION',

  // Financial Operations
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BALANCE_ADJUSTMENT = 'BALANCE_ADJUSTMENT',
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REVERSED = 'TRANSACTION_REVERSED',

  // Game Operations
  GAME_JOINED = 'GAME_JOINED',
  GAME_LEFT = 'GAME_LEFT',
  BET_PLACED = 'BET_PLACED',
  GAME_WON = 'GAME_WON',
  GAME_LOST = 'GAME_LOST',
  PRIZE_AWARDED = 'PRIZE_AWARDED',

  // Room Management
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_UPDATED = 'ROOM_UPDATED',
  ROOM_DELETED = 'ROOM_DELETED',
  ROOM_STATUS_CHANGED = 'ROOM_STATUS_CHANGED',

  // Security Events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  // System Events
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  SERVICE_STARTED = 'SERVICE_STARTED',
  SERVICE_STOPPED = 'SERVICE_STOPPED',
}

/**
 * Audit log severity levels
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  category: AuditCategory;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  targetUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Main audit logger class
 */
class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {
    console.log('[AuditLogger] Initialized');
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Logs an audit event to the database
   */
  public async log(entry: AuditLogEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs (
          category, event_type, severity, user_id, target_user_id,
          ip_address, user_agent, description, metadata, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entry.category,
          entry.eventType,
          entry.severity,
          entry.userId || null,
          entry.targetUserId || null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.description,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          entry.success ?? true,
          entry.errorMessage || null,
        ]
      );

      // Also log to console for immediate visibility
      const logLevel = entry.severity === AuditSeverity.CRITICAL || entry.severity === AuditSeverity.ERROR
        ? 'error'
        : entry.severity === AuditSeverity.WARNING
        ? 'warn'
        : 'log';

      console[logLevel](`[AUDIT] ${entry.category}:${entry.eventType}`, {
        userId: entry.userId,
        targetUserId: entry.targetUserId,
        description: entry.description,
        success: entry.success,
      });
    } catch (error) {
      // If audit logging fails, log to console but don't throw
      console.error('[AuditLogger] Failed to write audit log:', error);
      console.error('[AuditLogger] Failed entry:', entry);
    }
  }

  /**
   * Logs authentication events
   */
  public async logAuth(
    eventType: AuditEventType,
    userId: string | undefined,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      category: AuditCategory.AUTH,
      eventType,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId,
      ipAddress,
      userAgent,
      description: `Authentication event: ${eventType}`,
      metadata,
      success,
    });
  }

  /**
   * Logs financial transactions
   */
  public async logTransaction(
    eventType: AuditEventType,
    userId: string,
    amount: number,
    currency: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      category: AuditCategory.TRANSACTION,
      eventType,
      severity: success ? AuditSeverity.INFO : AuditSeverity.ERROR,
      userId,
      description: `Transaction: ${eventType} - ${amount} ${currency}`,
      metadata: {
        ...metadata,
        amount,
        currency,
      },
      success,
    });
  }

  /**
   * Logs balance changes
   */
  public async logBalanceChange(
    userId: string,
    oldBalance: number,
    newBalance: number,
    reason: string,
    adminUserId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const change = newBalance - oldBalance;
    await this.log({
      category: AuditCategory.BALANCE,
      eventType: AuditEventType.BALANCE_ADJUSTMENT,
      severity: adminUserId ? AuditSeverity.WARNING : AuditSeverity.INFO,
      userId: adminUserId || userId,
      targetUserId: adminUserId ? userId : undefined,
      description: `Balance changed: ${change > 0 ? '+' : ''}${change}`,
      metadata: {
        ...metadata,
        oldBalance,
        newBalance,
        change,
        reason,
      },
      success: true,
    });
  }

  /**
   * Logs admin actions
   */
  public async logAdminAction(
    adminUserId: string,
    action: string,
    targetUserId: string | undefined,
    ipAddress: string | undefined,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      category: AuditCategory.ADMIN,
      eventType: AuditEventType.ADMIN_ACTION,
      severity: AuditSeverity.WARNING,
      userId: adminUserId,
      targetUserId,
      ipAddress,
      description: `Admin action: ${action}`,
      metadata,
      success: true,
    });
  }

  /**
   * Logs security events
   */
  public async logSecurityEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    userId: string | undefined,
    ipAddress: string | undefined,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      category: AuditCategory.SECURITY,
      eventType,
      severity,
      userId,
      ipAddress,
      description,
      metadata,
      success: false,
    });
  }

  /**
   * Logs unauthorized access attempts
   */
  public async logUnauthorizedAccess(
    userId: string | undefined,
    resource: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      category: AuditCategory.ACCESS_CONTROL,
      eventType: AuditEventType.UNAUTHORIZED_ACCESS,
      severity: AuditSeverity.WARNING,
      userId,
      ipAddress,
      userAgent,
      description: `Unauthorized access attempt to: ${resource}`,
      metadata,
      success: false,
    });
  }

  /**
   * Logs game events
   */
  public async logGameEvent(
    eventType: AuditEventType,
    userId: string,
    roomId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      category: AuditCategory.GAME,
      eventType,
      severity: AuditSeverity.INFO,
      userId,
      description: `Game event: ${eventType} in room ${roomId}`,
      metadata: {
        ...metadata,
        roomId,
      },
      success: true,
    });
  }

  /**
   * Query audit logs with filters
   */
  public async queryLogs(filters: {
    userId?: string;
    category?: AuditCategory;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.userId) {
      query += ` AND (user_id = $${paramCount} OR target_user_id = $${paramCount})`;
      params.push(filters.userId);
      paramCount++;
    }

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.eventType) {
      query += ` AND event_type = $${paramCount}`;
      params.push(filters.eventType);
      paramCount++;
    }

    if (filters.severity) {
      query += ` AND severity = $${paramCount}`;
      params.push(filters.severity);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
      paramCount++;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Export convenience methods
export const logAuth = auditLogger.logAuth.bind(auditLogger);
export const logTransaction = auditLogger.logTransaction.bind(auditLogger);
export const logBalanceChange = auditLogger.logBalanceChange.bind(auditLogger);
export const logAdminAction = auditLogger.logAdminAction.bind(auditLogger);
export const logSecurityEvent = auditLogger.logSecurityEvent.bind(auditLogger);
export const logUnauthorizedAccess = auditLogger.logUnauthorizedAccess.bind(auditLogger);
export const logGameEvent = auditLogger.logGameEvent.bind(auditLogger);
