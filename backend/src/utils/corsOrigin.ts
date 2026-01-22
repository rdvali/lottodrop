// SECURITY FIX (Week 3): Shared CORS origin validation
// Ensures consistent origin checking between HTTP and WebSocket connections

/**
 * Gets the list of allowed origins from environment variables
 * Falls back to localhost origins for development
 */
export const getAllowedOrigins = (): string[] => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }

  // Default fallback for development
  return [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ];
};

/**
 * Validates if an origin is allowed based on ALLOWED_ORIGINS environment variable
 *
 * @param origin - The origin to validate (can be undefined for server-to-server requests)
 * @returns true if origin is allowed, false otherwise
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (health checks, curl, server-to-server)
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check if origin is in allowed list
  if (allowedOrigins.indexOf(origin) !== -1) {
    return true;
  }

  // In production, strictly reject unknown origins
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[CORS] Rejected origin in production: ${origin}`);
    return false;
  }

  // In development, warn but allow
  console.warn(`⚠️  Origin ${origin} not in allowed list - allowed in development only`);
  return true;
};

/**
 * CORS origin validation function for Express cors middleware
 * Used in HTTP endpoints
 */
export const httpCorsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
};

/**
 * CORS origin validation function for Socket.IO
 * Used in WebSocket connections
 *
 * @param origin - The origin from the Socket.IO handshake
 * @param callback - Callback function (err, allow)
 */
export const socketCorsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    console.error(`[WebSocket CORS] Rejected connection from origin: ${origin}`);
    callback(new Error(`WebSocket origin ${origin} not allowed by CORS`));
  }
};

/**
 * Logs CORS configuration on startup for security audit
 */
export const logCorsConfiguration = (): void => {
  const allowedOrigins = getAllowedOrigins();
  console.log('[CORS] Configuration:');
  console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`  - Strict Mode: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
};
