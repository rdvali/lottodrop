import RedisClient from './redisClient';
import { REDIS_KEYS, REDIS_KEY_TTL } from '../../config/redis.config';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank?: number;
  avatar?: string;
  additionalData?: any;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

class LeaderboardService {
  private static instance: LeaderboardService;

  private constructor() {}

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  private getLeaderboardKey(period: LeaderboardPeriod): string {
    switch (period) {
      case 'daily':
        return REDIS_KEYS.LEADERBOARD_DAILY();
      case 'weekly':
        return REDIS_KEYS.LEADERBOARD_WEEKLY();
      case 'monthly':
        return REDIS_KEYS.LEADERBOARD_MONTHLY();
      case 'alltime':
        return REDIS_KEYS.LEADERBOARD_ALLTIME();
      default:
        throw new Error(`Invalid leaderboard period: ${period}`);
    }
  }

  private getLeaderboardTTL(period: LeaderboardPeriod): number {
    switch (period) {
      case 'daily':
        return 86400; // 24 hours
      case 'weekly':
        return 604800; // 7 days
      case 'monthly':
        return 2592000; // 30 days
      case 'alltime':
        return 0; // No expiration
      default:
        return REDIS_KEY_TTL.LEADERBOARD;
    }
  }

  public async addScore(
    period: LeaderboardPeriod,
    userId: string,
    score: number,
    username?: string
  ): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = this.getLeaderboardKey(period);
      
      // Add score to sorted set
      await redis.zadd(key, score, userId);
      
      // Store username separately if provided
      if (username) {
        const userDataKey = `${key}:userdata:${userId}`;
        await redis.set(userDataKey, username);
        
        const ttl = this.getLeaderboardTTL(period);
        if (ttl > 0) {
          await redis.expire(userDataKey, ttl);
        }
      }
      
      // Set TTL for the leaderboard
      const ttl = this.getLeaderboardTTL(period);
      if (ttl > 0) {
        await redis.expire(key, ttl);
      }
      
      console.log(`Added score ${score} for user ${userId} to ${period} leaderboard`);
      return true;
    } catch (error) {
      console.error(`Failed to add score to ${period} leaderboard:`, error);
      return false;
    }
  }

  public async incrementScore(
    period: LeaderboardPeriod,
    userId: string,
    increment: number,
    username?: string
  ): Promise<number> {
    try {
      const redis = RedisClient.getMaster();
      const key = this.getLeaderboardKey(period);
      
      // Increment score in sorted set
      const newScore = parseFloat(await redis.zincrby(key, increment, userId) as any);
      
      // Store username if provided
      if (username) {
        const userDataKey = `${key}:userdata:${userId}`;
        await redis.set(userDataKey, username);
        
        const ttl = this.getLeaderboardTTL(period);
        if (ttl > 0) {
          await redis.expire(userDataKey, ttl);
        }
      }
      
      // Set TTL for the leaderboard
      const ttl = this.getLeaderboardTTL(period);
      if (ttl > 0) {
        await redis.expire(key, ttl);
      }
      
      return newScore;
    } catch (error) {
      console.error(`Failed to increment score in ${period} leaderboard:`, error);
      return 0;
    }
  }

  public async getTopPlayers(
    period: LeaderboardPeriod,
    limit: number = 10,
    withScores: boolean = true
  ): Promise<LeaderboardEntry[]> {
    try {
      const redis = RedisClient.getReplica();
      const key = this.getLeaderboardKey(period);
      
      // Get top players with scores (descending order)
      const results = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
      
      if (!results || results.length === 0) {
        return [];
      }
      
      const entries: LeaderboardEntry[] = [];
      
      // Process results (userId, score pairs)
      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = parseFloat(results[i + 1]);
        
        // Get username from separate key
        const userDataKey = `${key}:userdata:${userId}`;
        const username = await redis.get(userDataKey) || `User${userId}`;
        
        entries.push({
          userId,
          username,
          score: withScores ? score : 0,
          rank: Math.floor(i / 2) + 1,
        });
      }
      
      return entries;
    } catch (error) {
      console.error(`Failed to get top players from ${period} leaderboard:`, error);
      return [];
    }
  }

  public async getPlayerRank(
    period: LeaderboardPeriod,
    userId: string
  ): Promise<number | null> {
    try {
      const redis = RedisClient.getReplica();
      const key = this.getLeaderboardKey(period);
      
      // Get rank (0-indexed, so add 1)
      const rank = await redis.zrevrank(key, userId);
      
      if (rank === null) {
        return null;
      }
      
      return rank + 1;
    } catch (error) {
      console.error(`Failed to get player rank from ${period} leaderboard:`, error);
      return null;
    }
  }

  public async getPlayerScore(
    period: LeaderboardPeriod,
    userId: string
  ): Promise<number | null> {
    try {
      const redis = RedisClient.getReplica();
      const key = this.getLeaderboardKey(period);
      
      const score = await redis.zscore(key, userId);
      
      if (score === null) {
        return null;
      }
      
      return parseFloat(score);
    } catch (error) {
      console.error(`Failed to get player score from ${period} leaderboard:`, error);
      return null;
    }
  }

  public async getPlayerDetails(
    period: LeaderboardPeriod,
    userId: string
  ): Promise<LeaderboardEntry | null> {
    try {
      const redis = RedisClient.getReplica();
      const key = this.getLeaderboardKey(period);
      
      // Get both rank and score
      const [rank, score] = await Promise.all([
        this.getPlayerRank(period, userId),
        this.getPlayerScore(period, userId),
      ]);
      
      if (rank === null || score === null) {
        return null;
      }
      
      // Get username
      const userDataKey = `${key}:userdata:${userId}`;
      const username = await redis.get(userDataKey) || `User${userId}`;
      
      return {
        userId,
        username,
        score,
        rank,
      };
    } catch (error) {
      console.error(`Failed to get player details from ${period} leaderboard:`, error);
      return null;
    }
  }

  public async getPlayersAroundRank(
    period: LeaderboardPeriod,
    rank: number,
    range: number = 2
  ): Promise<LeaderboardEntry[]> {
    try {
      const redis = RedisClient.getReplica();
      const key = this.getLeaderboardKey(period);
      
      // Calculate start and end positions (0-indexed)
      const start = Math.max(0, rank - range - 1);
      const end = rank + range - 1;
      
      // Get players with scores
      const results = await redis.zrevrange(key, start, end, 'WITHSCORES');
      
      if (!results || results.length === 0) {
        return [];
      }
      
      const entries: LeaderboardEntry[] = [];
      
      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = parseFloat(results[i + 1]);
        
        // Get username
        const userDataKey = `${key}:userdata:${userId}`;
        const username = await redis.get(userDataKey) || `User${userId}`;
        
        entries.push({
          userId,
          username,
          score,
          rank: start + Math.floor(i / 2) + 1,
        });
      }
      
      return entries;
    } catch (error) {
      console.error(`Failed to get players around rank from ${period} leaderboard:`, error);
      return [];
    }
  }

  public async getPlayersAroundUser(
    period: LeaderboardPeriod,
    userId: string,
    range: number = 2
  ): Promise<LeaderboardEntry[]> {
    try {
      const rank = await this.getPlayerRank(period, userId);
      
      if (rank === null) {
        return [];
      }
      
      return await this.getPlayersAroundRank(period, rank, range);
    } catch (error) {
      console.error(`Failed to get players around user from ${period} leaderboard:`, error);
      return [];
    }
  }

  public async removePlayer(
    period: LeaderboardPeriod,
    userId: string
  ): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const key = this.getLeaderboardKey(period);
      
      // Remove from sorted set
      const removed = await redis.zrem(key, userId);
      
      // Remove username data
      const userDataKey = `${key}:userdata:${userId}`;
      await redis.del(userDataKey);
      
      return removed === 1;
    } catch (error) {
      console.error(`Failed to remove player from ${period} leaderboard:`, error);
      return false;
    }
  }

  public async getLeaderboardSize(period: LeaderboardPeriod): Promise<number> {
    try {
      const redis = RedisClient.getReplica();
      const key = this.getLeaderboardKey(period);
      
      return await redis.zcard(key);
    } catch (error) {
      console.error(`Failed to get ${period} leaderboard size:`, error);
      return 0;
    }
  }

  public async resetLeaderboard(period: LeaderboardPeriod): Promise<boolean> {
    try {
      if (period === 'alltime') {
        console.warn('Cannot reset all-time leaderboard');
        return false;
      }
      
      const redis = RedisClient.getMaster();
      const key = this.getLeaderboardKey(period);
      
      // Get all user IDs to delete their data
      const userIds = await redis.zrange(key, 0, -1);
      
      // Delete user data
      if (userIds.length > 0) {
        const userDataKeys = userIds.map(id => `${key}:userdata:${id}`);
        await redis.del(...userDataKeys);
      }
      
      // Delete the leaderboard
      await redis.del(key);
      
      console.log(`Reset ${period} leaderboard`);
      return true;
    } catch (error) {
      console.error(`Failed to reset ${period} leaderboard:`, error);
      return false;
    }
  }

  public async mergeLeaderboards(
    fromPeriod: LeaderboardPeriod,
    toPeriod: LeaderboardPeriod
  ): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const fromKey = this.getLeaderboardKey(fromPeriod);
      const toKey = this.getLeaderboardKey(toPeriod);
      
      // Get all scores from source leaderboard
      const scores = await redis.zrange(fromKey, 0, -1, 'WITHSCORES');
      
      if (scores.length === 0) {
        return true;
      }
      
      // Add scores to destination leaderboard
      for (let i = 0; i < scores.length; i += 2) {
        const userId = scores[i];
        const score = parseFloat(scores[i + 1]);
        
        // Add or update score
        await redis.zadd(toKey, 'INCR', score, userId);
        
        // Copy username data
        const fromUserDataKey = `${fromKey}:userdata:${userId}`;
        const toUserDataKey = `${toKey}:userdata:${userId}`;
        const username = await redis.get(fromUserDataKey);
        
        if (username) {
          await redis.set(toUserDataKey, username);
        }
      }
      
      console.log(`Merged ${fromPeriod} leaderboard into ${toPeriod}`);
      return true;
    } catch (error) {
      console.error(`Failed to merge leaderboards:`, error);
      return false;
    }
  }

  public async getMultiPeriodStats(userId: string): Promise<{
    daily: LeaderboardEntry | null;
    weekly: LeaderboardEntry | null;
    monthly: LeaderboardEntry | null;
    alltime: LeaderboardEntry | null;
  }> {
    try {
      const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'alltime'];
      const promises = periods.map(period => this.getPlayerDetails(period, userId));
      
      const results = await Promise.all(promises);
      
      return {
        daily: results[0],
        weekly: results[1],
        monthly: results[2],
        alltime: results[3],
      };
    } catch (error) {
      console.error('Failed to get multi-period stats:', error);
      return {
        daily: null,
        weekly: null,
        monthly: null,
        alltime: null,
      };
    }
  }
}

export default LeaderboardService.getInstance();