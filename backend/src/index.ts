import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/authRoutes';
import balanceRoutes from './routes/balanceRoutes';
import roomRoutes from './routes/roomRoutes';
import adminRoutes from './routes/adminRoutes';
import healthRoutes from './routes/health';
import resultsRoutes from './routes/resultsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import cryptoDepositRoutes from './routes/cryptoDepositRoutes';
import { SocketManager } from './socket/socketManager';
import pool from './config/database';
import { existsSync } from 'fs';
import { initializeRedis } from './services/redis';
import { apiLimit, authLimit } from './middleware/rateLimiter';
import { httpCorsOriginValidator, logCorsConfiguration } from './utils/corsOrigin';
import { createSanitizedErrorResponse, logSensitiveError, ErrorCodes } from './utils/errorSanitizer';
import { initializeProductionLogging, logger } from './utils/logger';

// Only load .env file if it exists (not needed in Docker where env vars are provided)
if (existsSync('.env')) {
  dotenv.config();
}

// SECURITY FIX (Week 3): Initialize production-safe logging (suppresses console.log in production)
initializeProductionLogging();

const app = express();
const httpServer = createServer(app);
const socketManager = new SocketManager(httpServer);

// SECURITY FIX (Week 3): Secure CORS Configuration with shared validation logic
const corsOptions = {
  origin: httpCorsOriginValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());

// SECURITY FIX (Week 4): Enable cookie parsing for HttpOnly authentication
app.use(cookieParser());

// Apply rate limiting (more lenient in development/Docker)
const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.DOCKER_ENV === 'true';
if (!isDevelopment) {
  app.use('/api/', apiLimit());
  app.use('/api/auth', authLimit());
} else {
  // Very relaxed limits for development/Docker
  const { relaxedLimit } = require('./middleware/rateLimiter');
  app.use('/api/', relaxedLimit());
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', balanceRoutes);
app.use('/api', roomRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/crypto', cryptoDepositRoutes);

// Health check routes
app.use('/', healthRoutes);

// SECURITY FIX (Week 3): Error handling middleware with message sanitization
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Log the full error for debugging
  logSensitiveError(err, {
    method: req.method,
    path: req.path,
    userId: (req as any).user?.userId,
    ip: req.ip,
  });

  // Create sanitized error response
  const sanitized = createSanitizedErrorResponse(
    err,
    'An unexpected error occurred',
    err.statusCode || err.status || 500,
    err.code || ErrorCodes.INTERNAL_ERROR
  );

  res.status(sanitized.statusCode).json(sanitized);
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('✅ Database connected successfully');

    // Initialize Redis services
    const redisServices = await initializeRedis();
    logger.info('✅ Redis services initialized');

    // SECURITY FIX (Week 3): Log CORS configuration for security audit
    logCorsConfiguration();
    
    // Make Redis services available globally
    (global as any).redisServices = redisServices;

    // Create admin user if not exists (only if environment variables are set)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.warn('⚠️  Admin credentials not configured. Skipping admin user creation.');
      console.warn('   Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file');
    } else {
      const adminCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

      if (adminCheck.rows.length === 0) {
        const bcrypt = require('bcrypt');
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      
      const adminResult = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, is_admin, balance)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        ['Admin', 'User', adminEmail, passwordHash, true, 10000]
      );

      await pool.query(
        'INSERT INTO admin_users (user_id) VALUES ($1)',
        [adminResult.rows[0].id]
      );

        logger.info(`Admin user created: ${adminEmail}`);
      }
    }

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export for use in other modules
export { socketManager };
export default app; // Export app for testing