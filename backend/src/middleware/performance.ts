import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { createHash } from 'crypto';

// Enhanced compression middleware with game history optimizations
export const compressionMiddleware = compression({
  // Compression level (1-9, higher = better compression but slower)
  level: 6,
  
  // Threshold - only compress responses larger than this
  threshold: 1024, // 1KB
  
  // Custom filter for what to compress
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Always compress JSON responses (game history data)
    const contentType = res.getHeader('content-type') as string;
    if (contentType && contentType.includes('application/json')) {
      return true;
    }
    
    // Use default compression filter
    return compression.filter(req, res);
  }
});

// ETag generation for caching
export const etagMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(body: any) {
    // Generate ETag for game history responses
    if (req.path.includes('/games') && req.method === 'GET') {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      const etag = `"${createHash('md5').update(bodyStr).digest('hex')}"`;
      
      res.setHeader('ETag', etag);
      
      // Check if client has cached version
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        res.status(304).end();
        return this;
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Response time monitoring
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow queries for monitoring
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow query detected: ${req.method} ${req.path} - ${duration}ms`, {
        query: req.query,
        user: req.user?.userId,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

// Memory usage monitoring
export const memoryMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/games') && req.method === 'GET') {
    const memBefore = process.memoryUsage();
    
    res.on('finish', () => {
      const memAfter = process.memoryUsage();
      const heapDiff = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024; // MB
      
      // Log if memory usage is high
      if (heapDiff > 50) { // 50MB increase
        console.warn(`High memory usage detected: ${req.path} - ${heapDiff.toFixed(2)}MB increase`, {
          before: memBefore,
          after: memAfter,
          user: req.user?.userId
        });
      }
    });
  }
  
  next();
};

// Request deduplication for identical concurrent requests
const pendingRequests = new Map<string, Promise<any>>();

export const deduplicationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only deduplicate GET requests to game history
  if (req.method !== 'GET' || !req.path.includes('/games')) {
    return next();
  }
  
  // Create request signature
  const signature = `${req.user?.userId}:${req.path}:${JSON.stringify(req.query)}`;
  
  // Check if identical request is already processing
  const existingRequest = pendingRequests.get(signature);
  if (existingRequest) {
    // Wait for the existing request and return same result
    existingRequest
      .then(result => {
        res.json(result);
      })
      .catch(error => {
        res.status(500).json({ error: 'Request failed' });
      });
    return;
  }
  
  // Store this request as pending
  const requestPromise = new Promise((resolve, reject) => {
    const originalSend = res.send;
    const originalStatus = res.status;
    
    let responseData: any;
    let statusCode = 200;
    
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    res.send = function(body: any) {
      responseData = typeof body === 'string' ? JSON.parse(body) : body;
      
      if (statusCode === 200) {
        resolve(responseData);
      } else {
        reject(new Error('Request failed'));
      }
      
      return originalSend.call(this, body);
    };
    
    // Clean up after request completes
    res.on('finish', () => {
      pendingRequests.delete(signature);
    });
  });
  
  pendingRequests.set(signature, requestPromise);
  next();
};

// Rate limiting for expensive queries
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const gameHistoryRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.includes('/games') || req.method !== 'GET') {
    return next();
  }
  
  const userId = req.user?.userId;
  if (!userId) {
    return next();
  }
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 30; // Max 30 requests per minute per user
  
  const userKey = `rate_limit:${userId}`;
  const userLimit = rateLimitMap.get(userKey);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitMap.set(userKey, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (userLimit.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded for game history queries',
      retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
    });
  }
  
  userLimit.count++;
  next();
};

// Cleanup expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes