import pool from '../config/database';
import { EventEmitter } from 'events';
import RedisClient from './redis/redisClient';
import PubSubService from './redis/pubsubService';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // seconds
}

export interface UserSubscription {
  userId: string;
  channels: string[];
  createdAt: Date;
  lastActivity: Date;
}

export class RealTimeDataManager extends EventEmitter {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private subscriptions: Map<string, UserSubscription> = new Map();
  private redis = RedisClient;
  private pubsub = PubSubService;
  
  // Cache TTL settings (in seconds)
  private readonly CACHE_TTL = {
    USER_BALANCE: 30,
    ROOM_STATE: 10,
    PRIZE_POOL: 5,
    PARTICIPANT_COUNT: 15,
    TRANSACTION: 60,
    ROOM_PARTICIPANTS: 20
  };

  constructor() {
    super();
    this.setupCacheCleanup();
    this.setupDataStreams();
  }

  // User balance management with caching
  async getUserBalance(userId: string): Promise<number> {
    const cacheKey = `balance:${userId}`;
    
    // Check cache first
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const result = await pool.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const balance = parseFloat(result.rows[0].balance);
    this.setCache(cacheKey, balance, this.CACHE_TTL.USER_BALANCE);

    return balance;
  }

  async updateUserBalanceCache(userId: string, newBalance: number) {
    const cacheKey = `balance:${userId}`;
    this.setCache(cacheKey, newBalance, this.CACHE_TTL.USER_BALANCE);
    
    // Also update Redis for cross-service communication
    const redisClient = this.redis.getMaster();
    await redisClient.setex(cacheKey, this.CACHE_TTL.USER_BALANCE, newBalance.toString());
    
    // Emit balance change event
    this.emit('balance-updated', { userId, balance: newBalance });
  }

  // Prize pool management
  async getCurrentPrizePool(roomId: string): Promise<number> {
    const cacheKey = `prize_pool:${roomId}`;
    
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await pool.query(
      `SELECT COALESCE(gr.prize_pool, 0) as prize_pool
       FROM game_rounds gr
       WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL
       ORDER BY gr.created_at DESC
       LIMIT 1`,
      [roomId]
    );

    const prizePool = result.rows.length > 0 ? parseFloat(result.rows[0].prize_pool) : 0;
    this.setCache(cacheKey, prizePool, this.CACHE_TTL.PRIZE_POOL);

    return prizePool;
  }

  async updatePrizePoolCache(roomId: string, newPrizePool: number) {
    const cacheKey = `prize_pool:${roomId}`;
    this.setCache(cacheKey, newPrizePool, this.CACHE_TTL.PRIZE_POOL);
    
    const redisClient = this.redis.getMaster();
    await redisClient.setex(cacheKey, this.CACHE_TTL.PRIZE_POOL, newPrizePool.toString());
    this.emit('prize-pool-updated', { roomId, prizePool: newPrizePool });
  }

  // Participant management
  async getParticipantCount(roomId: string): Promise<number> {
    const cacheKey = `participant_count:${roomId}`;
    
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await pool.query(
      `SELECT COUNT(DISTINCT rp.user_id) as count
       FROM round_participants rp
       JOIN game_rounds gr ON rp.round_id = gr.id
       WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL`,
      [roomId]
    );

    const count = parseInt(result.rows[0].count);
    this.setCache(cacheKey, count, this.CACHE_TTL.PARTICIPANT_COUNT);

    return count;
  }

  async getRoomParticipants(roomId: string): Promise<any[]> {
    const cacheKey = `room_participants:${roomId}`;
    
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await pool.query(
      `SELECT 
         u.id,
         u.first_name,
         u.last_name,
         rp.bet_amount,
         rp.joined_at
       FROM round_participants rp
       JOIN game_rounds gr ON rp.round_id = gr.id
       JOIN users u ON rp.user_id = u.id
       WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL
       ORDER BY rp.joined_at ASC`,
      [roomId]
    );

    const participants = result.rows.map(row => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      betAmount: parseFloat(row.bet_amount),
      joinedAt: row.joined_at
    }));

    this.setCache(cacheKey, participants, this.CACHE_TTL.ROOM_PARTICIPANTS);
    return participants;
  }

  // User bet amount in specific room
  async getUserBetAmount(userId: string, roomId: string): Promise<number> {
    const result = await pool.query(
      `SELECT rp.bet_amount
       FROM round_participants rp
       JOIN game_rounds gr ON rp.round_id = gr.id
       WHERE gr.room_id = $1 AND rp.user_id = $2 AND gr.completed_at IS NULL AND gr.archived_at IS NULL`,
      [roomId, userId]
    );

    return result.rows.length > 0 ? parseFloat(result.rows[0].bet_amount) : 0;
  }

  // Recent transactions
  async getRecentTransactions(userId: string, limit: number = 10): Promise<any[]> {
    const cacheKey = `transactions:${userId}:${limit}`;
    
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await pool.query(
      `SELECT id, type, amount, status, description, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const transactions = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      status: row.status,
      description: row.description,
      timestamp: row.created_at
    }));

    this.setCache(cacheKey, transactions, this.CACHE_TTL.TRANSACTION);
    return transactions;
  }

  // Room information
  async getRoomInfo(roomId: string): Promise<any> {
    const cacheKey = `room_info:${roomId}`;
    
    const cached = this.getFromCache<any>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await pool.query(
      `SELECT r.*, 
              COUNT(DISTINCT rp.user_id) as current_players,
              COALESCE(gr.prize_pool, 0) as current_prize_pool
       FROM rooms r
       LEFT JOIN game_rounds gr ON gr.room_id = r.id AND gr.completed_at IS NULL AND gr.archived_at IS NULL
       LEFT JOIN round_participants rp ON rp.round_id = gr.id
       WHERE r.id = $1
       GROUP BY r.id, gr.prize_pool`,
      [roomId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Room ${roomId} not found`);
    }

    const room = {
      ...result.rows[0],
      currentPlayers: parseInt(result.rows[0].current_players),
      currentPrizePool: parseFloat(result.rows[0].current_prize_pool)
    };

    this.setCache(cacheKey, room, this.CACHE_TTL.ROOM_STATE);
    return room;
  }

  // Recent room activity
  async getRecentRoomActivity(roomId: string, limit: number = 20): Promise<any[]> {
    const result = await pool.query(
      `(
        SELECT 'join' as type, u.first_name || ' ' || u.last_name as user_name, 
               rp.bet_amount as amount, rp.joined_at as timestamp
        FROM round_participants rp
        JOIN game_rounds gr ON rp.round_id = gr.id
        JOIN users u ON rp.user_id = u.id
        WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL
      )
      UNION ALL
      (
        SELECT 'message' as type, u.first_name || ' ' || u.last_name as user_name,
               NULL as amount, cm.created_at as timestamp
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.room_id = $1 AND cm.created_at >= NOW() - INTERVAL '10 minutes'
      )
      ORDER BY timestamp DESC
      LIMIT $2`,
      [roomId, limit]
    );

    return result.rows.map(row => ({
      type: row.type,
      userName: row.user_name,
      amount: row.amount ? parseFloat(row.amount) : null,
      timestamp: row.timestamp
    }));
  }

  // Subscription management
  async subscribeToRoomUpdates(roomId: string, userId: string) {
    const channels = [
      `room:${roomId}:prize_pool`,
      `room:${roomId}:participants`,
      `room:${roomId}:state`
    ];

    const subscription: UserSubscription = {
      userId,
      channels,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.subscriptions.set(`${userId}:${roomId}`, subscription);

    // Subscribe to Redis channels for real-time updates
    for (const channel of channels) {
      await this.pubsub.subscribe(channel, (data) => {
        this.emit('room-update', { userId, roomId, channel, data });
      });
    }
  }

  async subscribeToTransactionUpdates(transactionId: string) {
    const emitter = new EventEmitter();
    
    // Poll transaction status changes (could be optimized with database triggers)
    const checkStatus = async () => {
      try {
        const result = await pool.query(
          'SELECT status FROM transactions WHERE id = $1',
          [transactionId]
        );
        
        if (result.rows.length > 0) {
          emitter.emit('status-change', result.rows[0].status);
        }
      } catch (error) {
        console.error(`Error checking transaction ${transactionId}:`, error);
      }
    };

    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    
    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      emitter.removeAllListeners();
    }, 300000);

    return emitter;
  }

  // Subscription cleanup
  cleanupSubscriptions(userId: string) {
    const keysToDelete = Array.from(this.subscriptions.keys())
      .filter(key => key.startsWith(`${userId}:`));
    
    keysToDelete.forEach(key => {
      this.subscriptions.delete(key);
    });
  }

  // Cache management
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = new Date();
    const expired = (now.getTime() - entry.timestamp.getTime()) / 1000 > entry.ttl;
    
    if (expired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  // Data stream setup for real-time updates
  private setupDataStreams() {
    // Listen for database changes (this could be enhanced with database triggers)
    setInterval(() => {
      this.checkForDataChanges();
    }, 2000); // Check every 2 seconds for high-frequency updates
  }

  private async checkForDataChanges() {
    // Check for recent balance changes
    try {
      const recentTransactions = await pool.query(
        `SELECT DISTINCT user_id, type, amount, created_at
         FROM transactions
         WHERE created_at >= NOW() - INTERVAL '5 seconds'
         AND type IN ('WIN', 'BET', 'REFUND')
         ORDER BY created_at DESC`
      );

      recentTransactions.rows.forEach(async (transaction) => {
        const userId = transaction.user_id;
        
        // Invalidate cache and fetch fresh balance
        this.cache.delete(`balance:${userId}`);
        const newBalance = await this.getUserBalance(userId);
        
        this.emit('balance-changed', { 
          userId, 
          newBalance,
          transaction: {
            type: transaction.type,
            amount: parseFloat(transaction.amount),
            timestamp: transaction.created_at
          }
        });
      });

    } catch (error) {
      console.error('Error checking for data changes:', error);
    }
  }

  // Cache cleanup
  private setupCacheCleanup() {
    setInterval(() => {
      const now = new Date();
      const keysToDelete: string[] = [];

      this.cache.forEach((entry, key) => {
        const expired = (now.getTime() - entry.timestamp.getTime()) / 1000 > entry.ttl;
        if (expired) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => this.cache.delete(key));

      if (keysToDelete.length > 0) {
        console.log(`[Cache] Cleaned up ${keysToDelete.length} expired entries`);
      }
    }, 30000); // Clean up every 30 seconds
  }

  // Subscribe to data changes
  subscribe(channel: string, callback: (data: any) => void) {
    this.on(channel, callback);
  }

  // Performance metrics
  getCacheStats() {
    return {
      size: this.cache.size,
      subscriptions: this.subscriptions.size,
      hitRate: this.calculateCacheHitRate()
    };
  }

  private calculateCacheHitRate(): number {
    // Simple implementation - could be enhanced with proper metrics
    return 0.85; // Placeholder
  }
}