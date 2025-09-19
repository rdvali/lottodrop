import { Router, Request, Response } from 'express';
import RedisClient from '../services/redis/redisClient';
import pool from '../config/database';

const router = Router();

// Simple health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    let dbStatus = 'down';
    try {
      await pool.query('SELECT 1');
      dbStatus = 'up';
    } catch (error) {
      dbStatus = 'down';
    }

    // Check Redis connectivity
    let redisStatus = 'down';
    try {
      const redisHealth = await RedisClient.healthCheck();
      redisStatus = redisHealth.healthy ? 'up' : 'down';
    } catch (error) {
      redisStatus = 'down';
    }

    // Determine overall health status
    const isHealthy = dbStatus === 'up' && redisStatus === 'up';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        redis: redisStatus
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date()
    });
  }
});

export default router;