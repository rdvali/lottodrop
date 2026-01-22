// SECURITY FIX (Week 3): Production-safe logging
// Prevents console.log in production while preserving errors and warnings

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  includeTimestamp: boolean;
  includeLevel: boolean;
}

/**
 * Production-safe logger that respects NODE_ENV
 */
class Logger {
  private static instance: Logger;
  private isProduction: boolean;
  private config: LoggerConfig;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = {
      level: this.isProduction ? LogLevel.WARN : LogLevel.DEBUG,
      enableColors: !this.isProduction,
      includeTimestamp: true,
      includeLevel: true,
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Formats log message with metadata
   */
  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.config.includeLevel) {
      parts.push(`[${level}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * DEBUG level logging - only in development
   * Used for detailed debugging information
   */
  public debug(message: string, context?: any): void {
    if (this.isProduction) {
      return; // Silent in production
    }

    const formattedMessage = this.formatMessage(LogLevel.DEBUG, message);
    if (context) {
      console.log(formattedMessage, context);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * INFO level logging - only in development
   * Used for general informational messages
   */
  public info(message: string, context?: any): void {
    if (this.isProduction) {
      return; // Silent in production
    }

    const formattedMessage = this.formatMessage(LogLevel.INFO, message);
    if (context) {
      console.log(formattedMessage, context);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * WARN level logging - enabled in all environments
   * Used for warning messages that need attention
   */
  public warn(message: string, context?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.WARN, message);
    if (context) {
      console.warn(formattedMessage, context);
    } else {
      console.warn(formattedMessage);
    }
  }

  /**
   * ERROR level logging - enabled in all environments
   * Used for error conditions that need immediate attention
   */
  public error(message: string, error?: Error | any, context?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message);

    if (error && context) {
      console.error(formattedMessage, error, context);
    } else if (error) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Security-specific logging (always enabled for audit trail)
   */
  public security(message: string, context?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.WARN, `[SECURITY] ${message}`);
    if (context) {
      console.warn(formattedMessage, context);
    } else {
      console.warn(formattedMessage);
    }
  }

  /**
   * Auth-specific logging (always enabled for security audit)
   */
  public auth(message: string, context?: any): void {
    const formattedMessage = this.formatMessage(LogLevel.INFO, `[AUTH] ${message}`);

    // In production, only log auth errors/warnings
    if (this.isProduction && !message.includes('error') && !message.includes('failed')) {
      return;
    }

    if (context) {
      console.log(formattedMessage, context);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * API request logging (development only)
   */
  public request(method: string, path: string, userId?: string, statusCode?: number): void {
    if (this.isProduction) {
      return;
    }

    const message = `${method} ${path} - User: ${userId || 'anonymous'} - Status: ${statusCode || 'pending'}`;
    this.info(message);
  }

  /**
   * Database query logging (development only)
   */
  public query(query: string, params?: any[]): void {
    if (this.isProduction) {
      return;
    }

    const message = `DB Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`;
    this.debug(message, params);
  }

  /**
   * WebSocket event logging (development only)
   */
  public socket(event: string, userId?: string, roomId?: string): void {
    if (this.isProduction) {
      return;
    }

    const message = `[Socket] Event: ${event} - User: ${userId || 'unknown'} - Room: ${roomId || 'none'}`;
    this.debug(message);
  }

  /**
   * Performance logging (development only)
   */
  public perf(operation: string, durationMs: number): void {
    if (this.isProduction) {
      return;
    }

    const message = `[PERF] ${operation} took ${durationMs}ms`;
    this.info(message);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience methods
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logSecurity = logger.security.bind(logger);
export const logAuth = logger.auth.bind(logger);
export const logRequest = logger.request.bind(logger);
export const logQuery = logger.query.bind(logger);
export const logSocket = logger.socket.bind(logger);
export const logPerf = logger.perf.bind(logger);

/**
 * Override global console in production
 * This prevents accidental console.log statements from appearing in production
 */
export const initializeProductionLogging = (): void => {
  if (process.env.NODE_ENV === 'production') {
    // Save original console methods
    const originalLog = console.log;
    const originalDebug = console.debug;
    const originalInfo = console.info;

    // Override console.log to be silent in production
    console.log = (...args: any[]) => {
      // Silent in production - use logger.info() instead
      if (process.env.NODE_ENV !== 'production') {
        originalLog(...args);
      }
    };

    // Override console.debug to be silent in production
    console.debug = (...args: any[]) => {
      // Silent in production - use logger.debug() instead
      if (process.env.NODE_ENV !== 'production') {
        originalDebug(...args);
      }
    };

    // Override console.info to be silent in production
    console.info = (...args: any[]) => {
      // Silent in production - use logger.info() instead
      if (process.env.NODE_ENV !== 'production') {
        originalInfo(...args);
      }
    };

    // Keep console.warn and console.error as-is (they're important)
    logger.warn('Production logging initialized - console.log/debug/info suppressed');
  } else {
    logger.info('Development logging active - all console methods enabled');
  }
};
