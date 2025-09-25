import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/authRoutes';
import balanceRoutes from './routes/balanceRoutes';
import roomRoutes from './routes/roomRoutes';
import adminRoutes from './routes/adminRoutes';
import healthRoutes from './routes/health';
import resultsRoutes from './routes/resultsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { SocketManager } from './socket/socketManager';
import pool from './config/database';
import { existsSync } from 'fs';
import { initializeRedis } from './services/redis';
import { apiLimit, authLimit } from './middleware/rateLimiter';

// Only load .env file if it exists (not needed in Docker where env vars are provided)
if (existsSync('.env')) {
  dotenv.config();
}

const app = express();
const httpServer = createServer(app);
const socketManager = new SocketManager(httpServer);

// Secure CORS Configuration
const corsOptions = {
  origin: function(origin: string | undefined, callback: Function) {
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost', 'http://localhost:80', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
    
    // Allow requests with no origin (like health checks, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // In production, strictly reject unknown origins
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
    
    // In development, warn but allow
    console.warn(`⚠️  Origin ${origin} not in allowed list - allowed in development only`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());

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

// Health check routes
app.use('/', healthRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error details:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    // Initialize Redis services
    const redisServices = await initializeRedis();
    console.log('✅ Redis services initialized');
    
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

        console.log(`Admin user created: ${adminEmail}`);
      }
    }

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Export for use in other modules
export { socketManager };