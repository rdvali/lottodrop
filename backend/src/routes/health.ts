import { Router, Request, Response } from 'express';
import RedisClient from '../services/redis/redisClient';
import pool from '../config/database';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    memory: ServiceHealth;
  };
  metrics?: {
    activeSessions?: number;
    memoryUsage?: any;
    redisMemory?: any;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  details?: any;
  error?: string;
}

// Basic health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      services: {
        database: { status: 'down' },
        redis: { status: 'down' },
        memory: { status: 'up' },
      },
    };

    // Check database
    const dbStart = Date.now();
    try {
      const result = await pool.query('SELECT 1');
      health.services.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      health.services.database = {
        status: 'down',
        error: (error as Error).message,
      };
      health.status = 'unhealthy';
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      const redisHealth = await RedisClient.healthCheck();
      health.services.redis = {
        status: redisHealth.healthy ? 'up' : 'down',
        latency: Date.now() - redisStart,
        details: redisHealth.details,
      };
      
      if (!redisHealth.healthy) {
        health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
    } catch (error) {
      health.services.redis = {
        status: 'down',
        error: (error as Error).message,
      };
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const maxHeap = 512 * 1024 * 1024; // 512MB threshold
    
    if (memUsage.heapUsed > maxHeap) {
      health.services.memory = {
        status: 'degraded',
        details: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        },
      };
      health.status = 'degraded';
    } else {
      health.services.memory = {
        status: 'up',
        details: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        },
      };
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 206 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date(),
    });
  }
});

// Detailed health check
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      services: {
        database: { status: 'down' },
        redis: { status: 'down' },
        memory: { status: 'up' },
      },
      metrics: {},
    };

    // Detailed database check
    const dbStart = Date.now();
    try {
      const [poolStats, tableCheck] = await Promise.all([
        pool.query('SELECT COUNT(*) as connections FROM pg_stat_activity'),
        pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          LIMIT 5
        `),
      ]);

      health.services.database = {
        status: 'up',
        latency: Date.now() - dbStart,
        details: {
          activeConnections: poolStats.rows[0]?.connections || 0,
          tables: tableCheck.rows.map((r: any) => r.table_name),
        },
      };
    } catch (error) {
      health.services.database = {
        status: 'down',
        error: (error as Error).message,
      };
      health.status = 'unhealthy';
    }

    // Detailed Redis check
    const redisStart = Date.now();
    try {
      const [redisHealth, redisInfo, redisMemory, connectionStatus] = await Promise.all([
        RedisClient.healthCheck(),
        RedisClient.getInfo(),
        RedisClient.getMemoryUsage(),
        Promise.resolve(RedisClient.getConnectionStatus()),
      ]);

      health.services.redis = {
        status: redisHealth.healthy ? 'up' : 'down',
        latency: Date.now() - redisStart,
        details: {
          ...redisHealth.details,
          connections: connectionStatus.clients,
          version: redisInfo?.server?.redis_version || 'unknown',
          uptime: redisInfo?.server?.uptime_in_seconds || 0,
        },
      };

      if (health.metrics) {
        health.metrics.redisMemory = {
          used: `${Math.round(redisMemory.used / 1024 / 1024)}MB`,
          peak: `${Math.round(redisMemory.peak / 1024 / 1024)}MB`,
          percentage: `${redisMemory.percentage}%`,
        };
      }

      if (!redisHealth.healthy) {
        health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
    } catch (error) {
      health.services.redis = {
        status: 'down',
        error: (error as Error).message,
      };
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Memory details
    const memUsage = process.memoryUsage();
    const maxHeap = 512 * 1024 * 1024; // 512MB threshold
    
    health.services.memory = {
      status: memUsage.heapUsed > maxHeap ? 'degraded' : 'up',
      details: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)}MB`,
      },
    };

    if (memUsage.heapUsed > maxHeap) {
      health.status = 'degraded';
    }

    // Additional metrics
    if (health.metrics) {
      health.metrics.memoryUsage = health.services.memory.details;
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 206 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date(),
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date(),
  });
});

// Readiness probe (for Kubernetes/Docker)
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Quick checks for readiness
    const [dbCheck, redisCheck] = await Promise.all([
      pool.query('SELECT 1').catch(() => null),
      RedisClient.healthCheck().catch(() => ({ healthy: false })),
    ]);

    const isReady = dbCheck !== null && redisCheck.healthy;

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date(),
        details: {
          database: dbCheck !== null ? 'ready' : 'not_ready',
          redis: redisCheck.healthy ? 'ready' : 'not_ready',
        },
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: (error as Error).message,
      timestamp: new Date(),
    });
  }
});

export default router;