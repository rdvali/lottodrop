import RedisClient from './redisClient';
import { REDIS_KEYS, REDIS_KEY_TTL } from '../../config/redis.config';
import crypto from 'crypto';

export interface LotteryPool {
  id: string;
  roomId: string;
  name: string;
  currentPrize: number;
  minContribution: number;
  maxContribution: number;
  totalTickets: number;
  maxTickets: number;
  startTime: Date;
  endTime: Date;
  drawTime?: Date;
  status: 'pending' | 'active' | 'drawing' | 'completed' | 'cancelled';
  winningNumbers?: number[];
  seed?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LotteryTicket {
  id: string;
  poolId: string;
  userId: string;
  numbers: number[];
  purchaseTime: Date;
  price: number;
  status: 'active' | 'winner' | 'loser';
  prizeWon?: number;
}

export interface PoolStatistics {
  totalPlayers: number;
  totalTickets: number;
  totalPrize: number;
  averageTicketPrice: number;
  topContributor: { userId: string; amount: number } | null;
}

class LotteryPoolService {
  private static instance: LotteryPoolService;

  private constructor() {}

  public static getInstance(): LotteryPoolService {
    if (!LotteryPoolService.instance) {
      LotteryPoolService.instance = new LotteryPoolService();
    }
    return LotteryPoolService.instance;
  }

  public async initialize(): Promise<void> {
    // Lock functionality removed - using Redis native operations instead
  }

  // Pool Management
  public async createPool(poolData: Omit<LotteryPool, 'id' | 'createdAt' | 'updatedAt'>): Promise<LotteryPool> {
    try {
      const poolId = this.generatePoolId();
      const pool: LotteryPool = {
        ...poolData,
        id: poolId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const redis = RedisClient.getMaster();
      const poolKey = REDIS_KEYS.LOTTERY_POOL(poolId);
      
      await redis.setex(
        poolKey,
        REDIS_KEY_TTL.LOTTERY_POOL,
        JSON.stringify(pool)
      );

      // Add to active pools set if active
      if (pool.status === 'active') {
        await redis.sadd(REDIS_KEYS.ACTIVE_POOLS(), poolId);
      }

      console.log(`Created lottery pool: ${poolId}`);
      return pool;
    } catch (error) {
      console.error('Failed to create lottery pool:', error);
      throw new Error('Pool creation failed');
    }
  }

  public async getPool(poolId: string): Promise<LotteryPool | null> {
    try {
      const redis = RedisClient.getReplica();
      const poolKey = REDIS_KEYS.LOTTERY_POOL(poolId);
      
      const data = await redis.get(poolKey);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to get pool ${poolId}:`, error);
      return null;
    }
  }

  public async updatePool(poolId: string, updates: Partial<LotteryPool>): Promise<boolean> {
    try {
      const pool = await this.getPool(poolId);
      
      if (!pool) {
        return false;
      }

      const updatedPool: LotteryPool = {
        ...pool,
        ...updates,
        updatedAt: new Date(),
      };

      const redis = RedisClient.getMaster();
      const poolKey = REDIS_KEYS.LOTTERY_POOL(poolId);
      
      await redis.setex(
        poolKey,
        REDIS_KEY_TTL.LOTTERY_POOL,
        JSON.stringify(updatedPool)
      );

      // Update active pools set
      if (updates.status) {
        if (updates.status === 'active') {
          await redis.sadd(REDIS_KEYS.ACTIVE_POOLS(), poolId);
        } else {
          await redis.srem(REDIS_KEYS.ACTIVE_POOLS(), poolId);
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to update pool ${poolId}:`, error);
      return false;
    }
  }

  public async deletePool(poolId: string): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      
      // Remove from active pools
      await redis.srem(REDIS_KEYS.ACTIVE_POOLS(), poolId);
      
      // Delete pool data
      const poolKey = REDIS_KEYS.LOTTERY_POOL(poolId);
      const ticketsKey = REDIS_KEYS.LOTTERY_TICKETS(poolId);
      
      const result = await redis.del(poolKey, ticketsKey);
      
      return result > 0;
    } catch (error) {
      console.error(`Failed to delete pool ${poolId}:`, error);
      return false;
    }
  }

  // Ticket Management
  public async purchaseTicket(
    poolId: string,
    userId: string,
    numbers: number[],
    price: number
  ): Promise<LotteryTicket | null> {
    try {
      const pool = await this.getPool(poolId);
      
      if (!pool || pool.status !== 'active') {
        return null;
      }

      if (pool.totalTickets >= pool.maxTickets) {
        return null;
      }

      const ticket: LotteryTicket = {
        id: this.generateTicketId(),
        poolId,
        userId,
        numbers,
        purchaseTime: new Date(),
        price,
        status: 'active',
      };

      const redis = RedisClient.getMaster();
      const ticketsKey = REDIS_KEYS.LOTTERY_TICKETS(poolId);
      
      // Store ticket
      await redis.hset(ticketsKey, ticket.id, JSON.stringify(ticket));
      await redis.expire(ticketsKey, REDIS_KEY_TTL.LOTTERY_POOL);
      
      // Update pool statistics
      await this.updatePool(poolId, {
        currentPrize: pool.currentPrize + price,
        totalTickets: pool.totalTickets + 1,
      });

      console.log(`Ticket ${ticket.id} purchased for pool ${poolId}`);
      return ticket;
    } catch (error) {
      console.error('Failed to purchase ticket:', error);
      return null;
    }
  }

  public async getTicket(poolId: string, ticketId: string): Promise<LotteryTicket | null> {
    try {
      const redis = RedisClient.getReplica();
      const ticketsKey = REDIS_KEYS.LOTTERY_TICKETS(poolId);
      
      const data = await redis.hget(ticketsKey, ticketId);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to get ticket ${ticketId}:`, error);
      return null;
    }
  }

  public async getPoolTickets(poolId: string): Promise<LotteryTicket[]> {
    try {
      const redis = RedisClient.getReplica();
      const ticketsKey = REDIS_KEYS.LOTTERY_TICKETS(poolId);
      
      const ticketData = await redis.hgetall(ticketsKey);
      
      return Object.values(ticketData).map(data => JSON.parse(data));
    } catch (error) {
      console.error(`Failed to get tickets for pool ${poolId}:`, error);
      return [];
    }
  }

  public async getUserTickets(userId: string, poolId?: string): Promise<LotteryTicket[]> {
    try {
      if (poolId) {
        const tickets = await this.getPoolTickets(poolId);
        return tickets.filter(ticket => ticket.userId === userId);
      }

      // Get tickets from all active pools
      const activePools = await this.getActivePools();
      const allTickets: LotteryTicket[] = [];
      
      for (const pool of activePools) {
        const tickets = await this.getPoolTickets(pool.id);
        const userTickets = tickets.filter(ticket => ticket.userId === userId);
        allTickets.push(...userTickets);
      }
      
      return allTickets;
    } catch (error) {
      console.error(`Failed to get tickets for user ${userId}:`, error);
      return [];
    }
  }

  // Pool Operations
  public async getActivePools(): Promise<LotteryPool[]> {
    try {
      const redis = RedisClient.getReplica();
      const poolIds = await redis.smembers(REDIS_KEYS.ACTIVE_POOLS());
      
      if (poolIds.length === 0) {
        return [];
      }

      const pools: LotteryPool[] = [];
      
      for (const poolId of poolIds) {
        const pool = await this.getPool(poolId);
        if (pool && pool.status === 'active') {
          pools.push(pool);
        }
      }
      
      return pools;
    } catch (error) {
      console.error('Failed to get active pools:', error);
      return [];
    }
  }

  public async drawNumbers(poolId: string): Promise<number[] | null> {
    try {
      const pool = await this.getPool(poolId);
      
      if (!pool || pool.status !== 'active') {
        return null;
      }

      // Generate winning numbers using seed
      const seed = pool.seed || crypto.randomBytes(32).toString('hex');
      const winningNumbers = this.generateWinningNumbers(seed, 6, 1, 49);
      
      await this.updatePool(poolId, {
        status: 'drawing',
        winningNumbers,
        drawTime: new Date(),
        seed,
      });

      console.log(`Drew winning numbers for pool ${poolId}: ${winningNumbers}`);
      return winningNumbers;
    } catch (error) {
      console.error(`Failed to draw numbers for pool ${poolId}:`, error);
      return null;
    }
  }

  public async processWinners(poolId: string): Promise<{
    winners: LotteryTicket[];
    totalPrizeDistributed: number;
  } | null> {
    try {
      const pool = await this.getPool(poolId);
      
      if (!pool || !pool.winningNumbers || pool.status !== 'drawing') {
        return null;
      }

      const tickets = await this.getPoolTickets(poolId);
      const winners: LotteryTicket[] = [];
      let totalPrizeDistributed = 0;
      
      const redis = RedisClient.getMaster();
      const ticketsKey = REDIS_KEYS.LOTTERY_TICKETS(poolId);
      
      for (const ticket of tickets) {
        const matchedNumbers = this.countMatchedNumbers(
          ticket.numbers,
          pool.winningNumbers
        );
        
        if (matchedNumbers >= 3) {
          const prize = this.calculatePrize(matchedNumbers, pool.currentPrize);
          
          ticket.status = 'winner';
          ticket.prizeWon = prize;
          
          winners.push(ticket);
          totalPrizeDistributed += prize;
          
          // Update ticket
          await redis.hset(ticketsKey, ticket.id, JSON.stringify(ticket));
        } else {
          ticket.status = 'loser';
          await redis.hset(ticketsKey, ticket.id, JSON.stringify(ticket));
        }
      }
      
      await this.updatePool(poolId, {
        status: 'completed',
      });

      console.log(`Processed ${winners.length} winners for pool ${poolId}`);
      return { winners, totalPrizeDistributed };
    } catch (error) {
      console.error(`Failed to process winners for pool ${poolId}:`, error);
      return null;
    }
  }

  // Statistics
  public async getPoolStatistics(poolId: string): Promise<PoolStatistics | null> {
    try {
      const pool = await this.getPool(poolId);
      
      if (!pool) {
        return null;
      }

      const tickets = await this.getPoolTickets(poolId);
      
      // Calculate statistics
      const userContributions = new Map<string, number>();
      let totalPrice = 0;
      
      tickets.forEach(ticket => {
        totalPrice += ticket.price;
        const current = userContributions.get(ticket.userId) || 0;
        userContributions.set(ticket.userId, current + ticket.price);
      });
      
      let topContributor: { userId: string; amount: number } | null = null;
      let maxContribution = 0;
      
      userContributions.forEach((amount, userId) => {
        if (amount > maxContribution) {
          maxContribution = amount;
          topContributor = { userId, amount };
        }
      });
      
      return {
        totalPlayers: userContributions.size,
        totalTickets: tickets.length,
        totalPrize: pool.currentPrize,
        averageTicketPrice: tickets.length > 0 ? totalPrice / tickets.length : 0,
        topContributor,
      };
    } catch (error) {
      console.error(`Failed to get statistics for pool ${poolId}:`, error);
      return null;
    }
  }

  // Utility methods
  private generatePoolId(): string {
    return `pool_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateTicketId(): string {
    return `ticket_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateWinningNumbers(
    seed: string,
    count: number,
    min: number,
    max: number
  ): number[] {
    const hash = crypto.createHash('sha256').update(seed).digest();
    const numbers: number[] = [];
    const range = max - min + 1;
    
    for (let i = 0; i < count; i++) {
      const byte = hash[i % hash.length];
      const number = (byte % range) + min;
      
      if (!numbers.includes(number)) {
        numbers.push(number);
      } else {
        // Find next available number
        for (let j = min; j <= max; j++) {
          if (!numbers.includes(j)) {
            numbers.push(j);
            break;
          }
        }
      }
    }
    
    return numbers.sort((a, b) => a - b);
  }

  private countMatchedNumbers(userNumbers: number[], winningNumbers: number[]): number {
    return userNumbers.filter(num => winningNumbers.includes(num)).length;
  }

  private calculatePrize(matchedNumbers: number, totalPrize: number): number {
    const prizePercentages: { [key: number]: number } = {
      3: 0.05,  // 5% of prize pool
      4: 0.10,  // 10% of prize pool
      5: 0.25,  // 25% of prize pool
      6: 0.60,  // 60% of prize pool (jackpot)
    };
    
    return Math.floor(totalPrize * (prizePercentages[matchedNumbers] || 0));
  }

  public async cleanupExpiredPools(): Promise<number> {
    try {
      const activePools = await this.getActivePools();
      let cleaned = 0;
      
      for (const pool of activePools) {
        if (new Date() > new Date(pool.endTime)) {
          await this.updatePool(pool.id, { status: 'completed' });
          cleaned++;
        }
      }
      
      console.log(`Cleaned up ${cleaned} expired pools`);
      return cleaned;
    } catch (error) {
      console.error('Failed to cleanup expired pools:', error);
      return 0;
    }
  }
}

export default LotteryPoolService.getInstance();