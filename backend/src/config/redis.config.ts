import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryStrategy: (times: number) => number | void;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

const createRetryStrategy = (times: number): number | void => {
  const delay = Math.min(times * 50, 2000);
  console.log(`Redis connection retry #${times}, delay: ${delay}ms`);
  
  if (times > 10) {
    console.error('Redis connection failed after 10 retries');
    return undefined;
  }
  
  return delay;
};

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: createRetryStrategy,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  keepAlive: 1,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

export const redisSentinelConfig = {
  sentinels: process.env.REDIS_SENTINELS 
    ? process.env.REDIS_SENTINELS.split(',').map(sentinel => {
        const [host, port] = sentinel.split(':');
        return { host, port: parseInt(port) };
      })
    : [],
  name: process.env.REDIS_MASTER_NAME || 'lottodrop-master',
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: false,
  enableReadyCheck: true,
};

export const isProductionEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isRedisSentinelEnabled = (): boolean => {
  return !!process.env.REDIS_SENTINELS && isProductionEnvironment();
};

export const getRedisKeyPrefix = (): string => {
  const environment = process.env.NODE_ENV || 'development';
  return `lottodrop:${environment}:`;
};

export const REDIS_KEY_TTL = {
  SESSION: 86400, // 24 hours
  ROOM_STATE: 300, // 5 minutes
  GAME_RESULT: 3600, // 1 hour
  LEADERBOARD: 3600, // 1 hour
  CHAT_MESSAGE: 1800, // 30 minutes
  TEMP_DATA: 120, // 2 minutes
  USER_CACHE: 600, // 10 minutes
  LOTTERY_POOL: 600, // 10 minutes
  RATE_LIMIT: 60, // 1 minute
} as const;

export const REDIS_KEYS = {
  // Sessions
  SESSION: (sessionId: string) => `${getRedisKeyPrefix()}session:${sessionId}`,
  USER_SESSIONS: (userId: string) => `${getRedisKeyPrefix()}user:${userId}:sessions`,
  
  // Rooms
  ROOM_STATE: (roomId: string) => `${getRedisKeyPrefix()}room:${roomId}:state`,
  ROOM_PLAYERS: (roomId: string) => `${getRedisKeyPrefix()}room:${roomId}:players`,
  ROOM_LOCK: (roomId: string) => `${getRedisKeyPrefix()}room:${roomId}:lock`,
  
  // Game Results
  GAME_RESULT: (roundId: string) => `${getRedisKeyPrefix()}result:${roundId}`,
  RECENT_RESULTS: () => `${getRedisKeyPrefix()}results:recent`,
  
  // Leaderboards
  LEADERBOARD_DAILY: () => `${getRedisKeyPrefix()}leaderboard:daily`,
  LEADERBOARD_WEEKLY: () => `${getRedisKeyPrefix()}leaderboard:weekly`,
  LEADERBOARD_MONTHLY: () => `${getRedisKeyPrefix()}leaderboard:monthly`,
  LEADERBOARD_ALLTIME: () => `${getRedisKeyPrefix()}leaderboard:alltime`,
  
  // User Data
  USER_BALANCE: (userId: string) => `${getRedisKeyPrefix()}user:${userId}:balance`,
  USER_STATS: (userId: string) => `${getRedisKeyPrefix()}user:${userId}:stats`,
  USER_NOTIFICATIONS: (userId: string) => `${getRedisKeyPrefix()}user:${userId}:notifications`,
  
  // Lottery Pools
  LOTTERY_POOL: (poolId: string) => `${getRedisKeyPrefix()}pool:${poolId}`,
  LOTTERY_TICKETS: (poolId: string) => `${getRedisKeyPrefix()}pool:${poolId}:tickets`,
  ACTIVE_POOLS: () => `${getRedisKeyPrefix()}pools:active`,
  
  // Rate Limiting
  RATE_LIMIT_API: (ip: string, endpoint: string) => `${getRedisKeyPrefix()}ratelimit:api:${ip}:${endpoint}`,
  RATE_LIMIT_SOCKET: (userId: string) => `${getRedisKeyPrefix()}ratelimit:socket:${userId}`,
  
  // Pub/Sub Channels
  CHANNEL_ROOM_EVENTS: (roomId: string) => `${getRedisKeyPrefix()}channel:room:${roomId}:events`,
  CHANNEL_GLOBAL_EVENTS: () => `${getRedisKeyPrefix()}channel:global:events`,
  CHANNEL_USER_EVENTS: (userId: string) => `${getRedisKeyPrefix()}channel:user:${userId}:events`,
  
  // Locks
  LOCK_TRANSACTION: (transactionId: string) => `${getRedisKeyPrefix()}lock:transaction:${transactionId}`,
  LOCK_POOL_UPDATE: (poolId: string) => `${getRedisKeyPrefix()}lock:pool:${poolId}:update`,
  
  // Cache
  CACHE_HOT_NUMBERS: () => `${getRedisKeyPrefix()}cache:hotnumbers`,
  CACHE_JACKPOT: () => `${getRedisKeyPrefix()}cache:jackpot`,
  CACHE_STATISTICS: () => `${getRedisKeyPrefix()}cache:statistics`,
} as const;