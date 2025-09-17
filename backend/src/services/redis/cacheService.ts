import RedisClient from './redisClient';
import { REDIS_KEYS, REDIS_KEY_TTL } from '../../config/redis.config';

export interface RoomState {
  id: string;
  name: string;
  players: string[];
  maxPlayers: number;
  currentRound: number;
  jackpot: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  updatedAt: Date;
}

export interface GameResult {
  roundId: string;
  roomId: string;
  winningNumbers: number[];
  winners: Array<{
    userId: string;
    username: string;
    prize: number;
    matchedNumbers: number;
  }>;
  totalPrize: number;
  timestamp: Date;
}

export interface UserStats {
  userId: string;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalPrize: number;
  biggestWin: number;
  currentStreak: number;
  lastPlayed: Date;
}

class CacheService {
  private static instance: CacheService;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Room State Management
  public async getRoomState(roomId: string): Promise<RoomState | null> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.ROOM_STATE(roomId);
      
      const data = await redis.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to get room state for ${roomId}:`, error);
      return null;
    }
  }

  public async setRoomState(roomId: string, state: RoomState): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.ROOM_STATE(roomId);
      
      await redis.setex(
        key,
        REDIS_KEY_TTL.ROOM_STATE,
        JSON.stringify(state)
      );

      return true;
    } catch (error) {
      console.error(`Failed to set room state for ${roomId}:`, error);
      return false;
    }
  }

  public async updateRoomState(
    roomId: string, 
    updates: Partial<RoomState>
  ): Promise<boolean> {
    try {
      const currentState = await this.getRoomState(roomId);
      
      if (!currentState) {
        return false;
      }

      const updatedState: RoomState = {
        ...currentState,
        ...updates,
        updatedAt: new Date(),
      };

      return await this.setRoomState(roomId, updatedState);
    } catch (error) {
      console.error(`Failed to update room state for ${roomId}:`, error);
      return false;
    }
  }

  public async deleteRoomState(roomId: string): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.ROOM_STATE(roomId);
      
      const result = await redis.del(key);
      return result === 1;
    } catch (error) {
      console.error(`Failed to delete room state for ${roomId}:`, error);
      return false;
    }
  }

  // Room Players Management
  public async addPlayerToRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.ROOM_PLAYERS(roomId);
      
      await redis.sadd(key, userId);
      await redis.expire(key, REDIS_KEY_TTL.ROOM_STATE);
      
      return true;
    } catch (error) {
      console.error(`Failed to add player ${userId} to room ${roomId}:`, error);
      return false;
    }
  }

  public async removePlayerFromRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.ROOM_PLAYERS(roomId);
      
      const result = await redis.srem(key, userId);
      return result === 1;
    } catch (error) {
      console.error(`Failed to remove player ${userId} from room ${roomId}:`, error);
      return false;
    }
  }

  public async getRoomPlayers(roomId: string): Promise<string[]> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.ROOM_PLAYERS(roomId);
      
      return await redis.smembers(key);
    } catch (error) {
      console.error(`Failed to get players for room ${roomId}:`, error);
      return [];
    }
  }

  // Game Results Management
  public async saveGameResult(result: GameResult): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const resultKey = REDIS_KEYS.GAME_RESULT(result.roundId);
      const recentKey = REDIS_KEYS.RECENT_RESULTS();
      
      await redis.setex(
        resultKey,
        REDIS_KEY_TTL.GAME_RESULT,
        JSON.stringify(result)
      );
      
      await redis.lpush(recentKey, JSON.stringify(result));
      await redis.ltrim(recentKey, 0, 99); // Keep last 100 results
      await redis.expire(recentKey, REDIS_KEY_TTL.GAME_RESULT);
      
      return true;
    } catch (error) {
      console.error(`Failed to save game result for round ${result.roundId}:`, error);
      return false;
    }
  }

  public async getGameResult(roundId: string): Promise<GameResult | null> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.GAME_RESULT(roundId);
      
      const data = await redis.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to get game result for round ${roundId}:`, error);
      return null;
    }
  }

  public async getRecentResults(limit: number = 10): Promise<GameResult[]> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.RECENT_RESULTS();
      
      const results = await redis.lrange(key, 0, limit - 1);
      
      return results.map(r => JSON.parse(r));
    } catch (error) {
      console.error('Failed to get recent results:', error);
      return [];
    }
  }

  // User Statistics
  public async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.USER_STATS(userId);
      
      const data = await redis.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to get stats for user ${userId}:`, error);
      return null;
    }
  }

  public async updateUserStats(userId: string, stats: UserStats): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.USER_STATS(userId);
      
      await redis.setex(
        key,
        REDIS_KEY_TTL.USER_CACHE,
        JSON.stringify(stats)
      );
      
      return true;
    } catch (error) {
      console.error(`Failed to update stats for user ${userId}:`, error);
      return false;
    }
  }

  // User Balance (with write-through caching)
  public async getUserBalance(userId: string): Promise<number | null> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.USER_BALANCE(userId);
      
      const balance = await redis.get(key);
      
      if (balance === null) {
        return null;
      }

      return parseFloat(balance);
    } catch (error) {
      console.error(`Failed to get balance for user ${userId}:`, error);
      return null;
    }
  }

  public async setUserBalance(userId: string, balance: number): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.USER_BALANCE(userId);
      
      await redis.setex(
        key,
        REDIS_KEY_TTL.USER_CACHE,
        balance.toString()
      );
      
      return true;
    } catch (error) {
      console.error(`Failed to set balance for user ${userId}:`, error);
      return false;
    }
  }

  // Jackpot Management
  public async getCurrentJackpot(): Promise<number> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.CACHE_JACKPOT();
      
      const jackpot = await redis.get(key);
      
      if (!jackpot) {
        return 0;
      }

      return parseFloat(jackpot);
    } catch (error) {
      console.error('Failed to get current jackpot:', error);
      return 0;
    }
  }

  public async updateJackpot(amount: number): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.CACHE_JACKPOT();
      
      await redis.set(key, amount.toString());
      
      return true;
    } catch (error) {
      console.error('Failed to update jackpot:', error);
      return false;
    }
  }

  public async incrementJackpot(amount: number): Promise<number> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.CACHE_JACKPOT();
      
      const newAmount = await redis.incrbyfloat(key, amount);
      
      return parseFloat(newAmount as any);
    } catch (error) {
      console.error('Failed to increment jackpot:', error);
      return 0;
    }
  }

  // Hot Numbers (frequently drawn numbers)
  public async getHotNumbers(limit: number = 10): Promise<Array<{ number: number; count: number }>> {
    try {
      const redis = RedisClient.getReplica();
      const key = REDIS_KEYS.CACHE_HOT_NUMBERS();
      
      const data = await redis.get(key);
      
      if (!data) {
        return [];
      }

      const hotNumbers = JSON.parse(data);
      return hotNumbers.slice(0, limit);
    } catch (error) {
      console.error('Failed to get hot numbers:', error);
      return [];
    }
  }

  public async updateHotNumbers(numbers: Array<{ number: number; count: number }>): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = REDIS_KEYS.CACHE_HOT_NUMBERS();
      
      await redis.setex(
        key,
        REDIS_KEY_TTL.GAME_RESULT,
        JSON.stringify(numbers)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to update hot numbers:', error);
      return false;
    }
  }

  // Generic cache methods
  public async get<T>(key: string): Promise<T | null> {
    try {
      const redis = RedisClient.getReplica();
      const data = await redis.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const data = JSON.stringify(value);
      
      if (ttl) {
        await redis.setex(key, ttl, data);
      } else {
        await redis.set(key, data);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to set cache for key ${key}:`, error);
      return false;
    }
  }

  public async delete(key: string): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const result = await redis.del(key);
      
      return result === 1;
    } catch (error) {
      console.error(`Failed to delete cache for key ${key}:`, error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const redis = RedisClient.getReplica();
      const result = await redis.exists(key);
      
      return result === 1;
    } catch (error) {
      console.error(`Failed to check existence for key ${key}:`, error);
      return false;
    }
  }

  // Cache invalidation
  public async invalidateRoomCache(roomId: string): Promise<void> {
    try {
      const redis = RedisClient.getMaster();
      const keys = [
        REDIS_KEYS.ROOM_STATE(roomId),
        REDIS_KEYS.ROOM_PLAYERS(roomId),
        REDIS_KEYS.ROOM_LOCK(roomId),
      ];
      
      await redis.del(...keys);
      console.log(`Cache invalidated for room ${roomId}`);
    } catch (error) {
      console.error(`Failed to invalidate cache for room ${roomId}:`, error);
    }
  }

  public async invalidateUserCache(userId: string): Promise<void> {
    try {
      const redis = RedisClient.getMaster();
      const keys = [
        REDIS_KEYS.USER_BALANCE(userId),
        REDIS_KEYS.USER_STATS(userId),
        REDIS_KEYS.USER_NOTIFICATIONS(userId),
      ];
      
      await redis.del(...keys);
      console.log(`Cache invalidated for user ${userId}`);
    } catch (error) {
      console.error(`Failed to invalidate cache for user ${userId}:`, error);
    }
  }

  public async warmupCache(): Promise<void> {
    try {
      console.log('Starting cache warmup...');
      
      // This would typically load frequently accessed data from the database
      // For now, we'll just initialize some default values
      
      await this.updateJackpot(10000);
      await this.updateHotNumbers([
        { number: 7, count: 45 },
        { number: 13, count: 42 },
        { number: 21, count: 40 },
        { number: 3, count: 38 },
        { number: 17, count: 35 },
      ]);
      
      console.log('Cache warmup completed');
    } catch (error) {
      console.error('Failed to warmup cache:', error);
    }
  }
}

export default CacheService.getInstance();