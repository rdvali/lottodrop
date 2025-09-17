import RedisClient from './redisClient';
import SessionService from './sessionService';
import CacheService from './cacheService';
import LeaderboardService from './leaderboardService';
import PubSubService from './pubsubService';
import LotteryPoolService from './lotteryPoolService';
import RateLimiter from '../../middleware/rateLimiter';

export interface RedisServices {
  client: typeof RedisClient;
  session: typeof SessionService;
  cache: typeof CacheService;
  leaderboard: typeof LeaderboardService;
  pubsub: typeof PubSubService;
  lotteryPool: typeof LotteryPoolService;
  rateLimiter: typeof RateLimiter;
}

export const initializeRedis = async (): Promise<RedisServices> => {
  try {
    console.log('🚀 Initializing Redis services...');
    
    // Initialize Redis client connections
    await RedisClient.initialize();
    
    // Initialize PubSub service
    await PubSubService.initialize();
    
    // Initialize Lottery Pool service (needs lock initialization)
    await LotteryPoolService.initialize();
    
    // Warm up cache with frequently accessed data
    await CacheService.warmupCache();
    
    // Setup cleanup handlers
    setupCleanupHandlers();
    
    console.log('✅ All Redis services initialized successfully');
    
    return {
      client: RedisClient,
      session: SessionService,
      cache: CacheService,
      leaderboard: LeaderboardService,
      pubsub: PubSubService,
      lotteryPool: LotteryPoolService,
      rateLimiter: RateLimiter,
    };
  } catch (error) {
    console.error('❌ Failed to initialize Redis services:', error);
    throw error;
  }
};

const setupCleanupHandlers = (): void => {
  // Cleanup expired sessions periodically
  setInterval(async () => {
    try {
      const cleaned = await SessionService.cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
      }
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
    }
  }, 3600000); // Every hour

  // Cleanup expired lottery pools
  setInterval(async () => {
    try {
      const cleaned = await LotteryPoolService.cleanupExpiredPools();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired lottery pools`);
      }
    } catch (error) {
      console.error('Failed to cleanup lottery pools:', error);
    }
  }, 600000); // Every 10 minutes

  // Reset daily leaderboard at midnight
  const resetDailyLeaderboard = async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(async () => {
      try {
        await LeaderboardService.resetLeaderboard('daily');
        console.log('Daily leaderboard reset');
        
        // Schedule next reset
        setInterval(async () => {
          await LeaderboardService.resetLeaderboard('daily');
          console.log('Daily leaderboard reset');
        }, 86400000); // Every 24 hours
      } catch (error) {
        console.error('Failed to reset daily leaderboard:', error);
      }
    }, msUntilMidnight);
  };
  
  resetDailyLeaderboard();

  // Reset weekly leaderboard on Mondays
  const resetWeeklyLeaderboard = async () => {
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    
    const msUntilMonday = nextMonday.getTime() - now.getTime();
    
    setTimeout(async () => {
      try {
        await LeaderboardService.resetLeaderboard('weekly');
        console.log('Weekly leaderboard reset');
        
        // Schedule next reset
        setInterval(async () => {
          await LeaderboardService.resetLeaderboard('weekly');
          console.log('Weekly leaderboard reset');
        }, 604800000); // Every 7 days
      } catch (error) {
        console.error('Failed to reset weekly leaderboard:', error);
      }
    }, msUntilMonday);
  };
  
  resetWeeklyLeaderboard();

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received, starting graceful shutdown...`);
    
    try {
      // Clean up PubSub subscriptions
      await PubSubService.cleanup();
      
      // Disconnect Redis clients
      await RedisClient.disconnect();
      
      console.log('✅ Redis services shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// Export all services
export {
  RedisClient,
  SessionService,
  CacheService,
  LeaderboardService,
  PubSubService,
  LotteryPoolService,
  RateLimiter,
};

// Export types
export * from './sessionService';
export * from './cacheService';
export * from './leaderboardService';
export * from './pubsubService';
export * from './lotteryPoolService';
export * from '../../middleware/rateLimiter';