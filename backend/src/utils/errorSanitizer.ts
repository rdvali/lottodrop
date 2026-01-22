// SECURITY FIX (Week 3): Error Message Sanitization
// Prevents information leakage through error messages in production

export interface SanitizedError {
  error: string;
  code?: string;
  details?: any;
  statusCode: number;
}

/**
 * Error codes for consistent client-side handling
 */
export const ErrorCodes = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Transaction errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Patterns that should be removed from error messages in production
 */
const SENSITIVE_PATTERNS = [
  // Database-related
  /\bPOSTGRES\b/gi,
  /\bSELECT\b.*\bFROM\b/gi,
  /\bINSERT\s+INTO\b/gi,
  /\bUPDATE\b.*\bSET\b/gi,
  /\bDELETE\s+FROM\b/gi,
  /\bWHERE\b.*\=/gi,
  /relation\s+"[^"]+"/gi,
  /column\s+"[^"]+"/gi,
  /table\s+"[^"]+"/gi,

  // File system paths
  /\/Users\/[^\s]+/g,
  /\/home\/[^\s]+/g,
  /\/var\/[^\s]+/g,
  /\/opt\/[^\s]+/g,
  /C:\\\\[^\s]+/g,

  // Stack traces
  /at\s+[^\s]+\s+\([^\)]+\)/g,

  // Environment variables
  /process\.env\.[A-Z_]+/g,

  // IP addresses (internal)
  /\b(?:10|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.[0-9]{1,3}\.[0-9]{1,3}\b/g,

  // Common sensitive keywords
  /password[^\s]*/gi,
  /secret[^\s]*/gi,
  /token[^\s]*/gi,
  /api[_-]?key/gi,
];

/**
 * Sanitizes error messages for production by removing sensitive information
 *
 * @param error - The original error message or Error object
 * @param context - Additional context (only included in development)
 * @returns Sanitized error message
 */
export const sanitizeErrorMessage = (
  error: Error | string,
  context?: Record<string, any>
): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  const originalMessage = typeof error === 'string' ? error : error.message;

  if (!isProduction) {
    // In development, return full error details
    return originalMessage;
  }

  // In production, sanitize the message
  let sanitized = originalMessage;

  // Remove sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // If the message still contains potentially sensitive info, use generic message
  if (
    sanitized.includes('REDACTED') ||
    sanitized.length > 200 || // Very long messages likely contain stack traces
    /\b(error|exception|failed|invalid)\b.*\b(at|in|from)\b/i.test(sanitized)
  ) {
    return 'An error occurred while processing your request';
  }

  return sanitized;
};

/**
 * Creates a sanitized error response for API endpoints
 *
 * @param error - The original error
 * @param defaultMessage - Default user-facing message
 * @param statusCode - HTTP status code
 * @param errorCode - Application error code
 * @returns Sanitized error object
 */
export const createSanitizedErrorResponse = (
  error: Error | string,
  defaultMessage: string,
  statusCode: number = 500,
  errorCode?: string
): SanitizedError => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;

  const errorObj: SanitizedError = {
    error: defaultMessage,
    statusCode,
  };

  if (errorCode) {
    errorObj.code = errorCode;
  }

  // In development, include additional details
  if (isDevelopment) {
    errorObj.details = {
      originalError: typeof error === 'string' ? error : error.message,
      stack: typeof error !== 'string' ? error.stack : undefined,
    };
  }

  return errorObj;
};

/**
 * Sanitizes database errors to prevent information leakage
 *
 * @param error - Database error
 * @returns Sanitized error response
 */
export const sanitizeDatabaseError = (error: any): SanitizedError => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log full error for debugging
  console.error('[Database Error]', error);

  // Common database error patterns
  if (error.code === '23505') {
    // Unique violation
    return {
      error: 'This record already exists',
      code: ErrorCodes.ALREADY_EXISTS,
      statusCode: 409,
    };
  }

  if (error.code === '23503') {
    // Foreign key violation
    return {
      error: 'Cannot complete this operation due to related records',
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    };
  }

  if (error.code === '23502') {
    // Not null violation
    return {
      error: 'Required field is missing',
      code: ErrorCodes.MISSING_REQUIRED_FIELD,
      statusCode: 400,
    };
  }

  if (error.code === '42P01') {
    // Undefined table
    return {
      error: 'Database configuration error',
      code: ErrorCodes.DATABASE_ERROR,
      statusCode: 500,
      details: isProduction ? undefined : 'Table not found',
    };
  }

  // Generic database error
  return {
    error: 'A database error occurred',
    code: ErrorCodes.DATABASE_ERROR,
    statusCode: 500,
    details: isProduction ? undefined : error.message,
  };
};

/**
 * Sanitizes validation errors for user-facing display
 *
 * @param errors - Array of validation errors or single error
 * @returns Sanitized validation error response
 */
export const sanitizeValidationErrors = (
  errors: Array<{ field: string; message: string }> | string
): SanitizedError => {
  if (typeof errors === 'string') {
    return {
      error: 'Validation failed',
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
      details: { message: errors },
    };
  }

  // Sanitize field names to prevent internal structure leakage
  const sanitizedErrors = errors.map(err => ({
    field: err.field.replace(/[._]/g, ' ').toLowerCase(),
    message: err.message,
  }));

  return {
    error: 'Validation failed',
    code: ErrorCodes.VALIDATION_ERROR,
    statusCode: 400,
    details: { errors: sanitizedErrors },
  };
};

/**
 * Prevents user enumeration by providing consistent error messages
 *
 * @param exists - Whether the user exists
 * @returns Generic error message that doesn't reveal user existence
 */
export const getUserEnumerationSafeMessage = (exists?: boolean): string => {
  // SECURITY: Always return the same message regardless of whether user exists
  return 'Invalid email or password';
};

/**
 * Logs sensitive errors internally without exposing to client
 *
 * @param error - The error to log
 * @param context - Additional context for debugging
 */
export const logSensitiveError = (
  error: Error | string,
  context?: Record<string, any>
): void => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const stack = typeof error !== 'string' ? error.stack : undefined;

  console.error('[SENSITIVE ERROR]', {
    message: errorMessage,
    stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Wrapper for async route handlers with automatic error sanitization
 *
 * @param handler - The async route handler
 * @returns Wrapped handler with error sanitization
 */
export const withErrorSanitization = (
  handler: (req: any, res: any) => Promise<any>
) => {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (error) {
      const sanitized = createSanitizedErrorResponse(
        error as Error,
        'An error occurred while processing your request',
        500,
        ErrorCodes.INTERNAL_ERROR
      );

      logSensitiveError(error as Error, {
        method: req.method,
        path: req.path,
        userId: req.user?.userId,
      });

      res.status(sanitized.statusCode).json(sanitized);
    }
  };
};
