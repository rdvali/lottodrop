import RedisClient from './redisClient';
import { REDIS_KEYS } from '../../config/redis.config';
import { EventEmitter } from 'events';

export enum EventType {
  // Room events
  ROOM_CREATED = 'room:created',
  ROOM_UPDATED = 'room:updated',
  ROOM_DELETED = 'room:deleted',
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  
  // Game events
  GAME_STARTED = 'game:started',
  GAME_ENDED = 'game:ended',
  ROUND_STARTED = 'round:started',
  ROUND_ENDED = 'round:ended',
  NUMBERS_DRAWN = 'numbers:drawn',
  
  // Transaction events
  TICKET_PURCHASED = 'ticket:purchased',
  PRIZE_WON = 'prize:won',
  JACKPOT_WON = 'jackpot:won',
  BALANCE_UPDATED = 'balance:updated',
  
  // Leaderboard events
  LEADERBOARD_UPDATED = 'leaderboard:updated',
  NEW_HIGH_SCORE = 'new:highscore',
  
  // System events
  MAINTENANCE_START = 'maintenance:start',
  MAINTENANCE_END = 'maintenance:end',
  ANNOUNCEMENT = 'announcement',
  
  // User events
  USER_NOTIFICATION = 'user:notification',
  USER_ACHIEVEMENT = 'user:achievement',
  USER_LEVEL_UP = 'user:levelup',
}

export interface PubSubMessage {
  type: EventType;
  channel: string;
  data: any;
  timestamp: Date;
  sender?: string;
}

export type MessageHandler = (message: PubSubMessage) => void;

class PubSubService extends EventEmitter {
  private static instance: PubSubService;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for multiple subscriptions
  }

  public static getInstance(): PubSubService {
    if (!PubSubService.instance) {
      PubSubService.instance = new PubSubService();
    }
    return PubSubService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('PubSub service already initialized');
      return;
    }

    try {
      const subscriber = RedisClient.getSubscriber();
      
      // Set up message handler
      subscriber.on('message', (channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      this.isInitialized = true;
      console.log('✅ PubSub service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PubSub service:', error);
      throw error;
    }
  }

  private handleMessage(channel: string, message: string): void {
    try {
      const parsedMessage: PubSubMessage = JSON.parse(message);
      parsedMessage.channel = channel;
      
      // Emit to local event emitter
      this.emit(channel, parsedMessage);
      this.emit(parsedMessage.type, parsedMessage);
      
      // Call registered handlers
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(parsedMessage);
          } catch (error) {
            console.error(`Handler error for channel ${channel}:`, error);
          }
        });
      }
      
      console.log(`📨 Message received on ${channel}:`, parsedMessage.type);
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  // Publishing methods
  public async publish(
    channel: string,
    type: EventType,
    data: any,
    sender?: string
  ): Promise<number> {
    try {
      const publisher = RedisClient.getPublisher();
      
      const message: PubSubMessage = {
        type,
        channel,
        data,
        timestamp: new Date(),
        sender,
      };
      
      const messageStr = JSON.stringify(message);
      const subscriberCount = await publisher.publish(channel, messageStr);
      
      console.log(`📤 Published ${type} to ${channel} (${subscriberCount} subscribers)`);
      return subscriberCount;
    } catch (error) {
      console.error(`Failed to publish to ${channel}:`, error);
      return 0;
    }
  }

  public async publishRoomEvent(
    roomId: string,
    type: EventType,
    data: any
  ): Promise<number> {
    const channel = REDIS_KEYS.CHANNEL_ROOM_EVENTS(roomId);
    return this.publish(channel, type, data);
  }

  public async publishGlobalEvent(
    type: EventType,
    data: any
  ): Promise<number> {
    const channel = REDIS_KEYS.CHANNEL_GLOBAL_EVENTS();
    return this.publish(channel, type, data);
  }

  public async publishUserEvent(
    userId: string,
    type: EventType,
    data: any
  ): Promise<number> {
    const channel = REDIS_KEYS.CHANNEL_USER_EVENTS(userId);
    return this.publish(channel, type, data);
  }

  // Subscription methods
  public async subscribe(
    channel: string,
    handler: MessageHandler
  ): Promise<void> {
    try {
      const subscriber = RedisClient.getSubscriber();
      
      // Subscribe to Redis channel
      await subscriber.subscribe(channel);
      
      // Store handler
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }
      this.subscriptions.get(channel)!.add(handler);
      
      console.log(`📥 Subscribed to ${channel}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${channel}:`, error);
      throw error;
    }
  }

  public async subscribePattern(
    pattern: string,
    handler: MessageHandler
  ): Promise<void> {
    try {
      const subscriber = RedisClient.getSubscriber();
      
      // Subscribe to Redis pattern
      await subscriber.psubscribe(pattern);
      
      // Store handler with pattern as key
      if (!this.subscriptions.has(pattern)) {
        this.subscriptions.set(pattern, new Set());
      }
      this.subscriptions.get(pattern)!.add(handler);
      
      console.log(`📥 Subscribed to pattern ${pattern}`);
    } catch (error) {
      console.error(`Failed to subscribe to pattern ${pattern}:`, error);
      throw error;
    }
  }

  public async subscribeToRoom(
    roomId: string,
    handler: MessageHandler
  ): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_ROOM_EVENTS(roomId);
    return this.subscribe(channel, handler);
  }

  public async subscribeToGlobal(handler: MessageHandler): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_GLOBAL_EVENTS();
    return this.subscribe(channel, handler);
  }

  public async subscribeToUser(
    userId: string,
    handler: MessageHandler
  ): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_USER_EVENTS(userId);
    return this.subscribe(channel, handler);
  }

  // Unsubscription methods
  public async unsubscribe(
    channel: string,
    handler?: MessageHandler
  ): Promise<void> {
    try {
      const handlers = this.subscriptions.get(channel);
      
      if (handlers) {
        if (handler) {
          handlers.delete(handler);
        } else {
          handlers.clear();
        }
        
        if (handlers.size === 0) {
          this.subscriptions.delete(channel);
          
          const subscriber = RedisClient.getSubscriber();
          await subscriber.unsubscribe(channel);
          
          console.log(`📤 Unsubscribed from ${channel}`);
        }
      }
    } catch (error) {
      console.error(`Failed to unsubscribe from ${channel}:`, error);
    }
  }

  public async unsubscribePattern(pattern: string): Promise<void> {
    try {
      this.subscriptions.delete(pattern);
      
      const subscriber = RedisClient.getSubscriber();
      await subscriber.punsubscribe(pattern);
      
      console.log(`📤 Unsubscribed from pattern ${pattern}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from pattern ${pattern}:`, error);
    }
  }

  public async unsubscribeFromRoom(
    roomId: string,
    handler?: MessageHandler
  ): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_ROOM_EVENTS(roomId);
    return this.unsubscribe(channel, handler);
  }

  public async unsubscribeFromGlobal(handler?: MessageHandler): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_GLOBAL_EVENTS();
    return this.unsubscribe(channel, handler);
  }

  public async unsubscribeFromUser(
    userId: string,
    handler?: MessageHandler
  ): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_USER_EVENTS(userId);
    return this.unsubscribe(channel, handler);
  }

  // Utility methods
  public async getSubscriptionCount(): Promise<number> {
    return this.subscriptions.size;
  }

  public async getActiveChannels(): Promise<string[]> {
    return Array.from(this.subscriptions.keys());
  }

  public async broadcastMaintenance(
    message: string,
    duration?: number
  ): Promise<void> {
    await this.publishGlobalEvent(EventType.MAINTENANCE_START, {
      message,
      duration,
      startTime: new Date(),
    });
  }

  public async broadcastAnnouncement(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    await this.publishGlobalEvent(EventType.ANNOUNCEMENT, {
      title,
      message,
      priority,
      timestamp: new Date(),
    });
  }

  // Event-specific publishing helpers
  public async notifyGameStart(roomId: string, gameData: any): Promise<void> {
    await this.publishRoomEvent(roomId, EventType.GAME_STARTED, gameData);
  }

  public async notifyGameEnd(roomId: string, results: any): Promise<void> {
    await this.publishRoomEvent(roomId, EventType.GAME_ENDED, results);
  }

  public async notifyNumbersDrawn(
    roomId: string,
    numbers: number[]
  ): Promise<void> {
    await this.publishRoomEvent(roomId, EventType.NUMBERS_DRAWN, { numbers });
  }

  public async notifyPrizeWon(
    userId: string,
    roomId: string,
    prize: number
  ): Promise<void> {
    await Promise.all([
      this.publishUserEvent(userId, EventType.PRIZE_WON, { prize, roomId }),
      this.publishRoomEvent(roomId, EventType.PRIZE_WON, { userId, prize }),
    ]);
  }

  public async notifyJackpotWon(
    userId: string,
    roomId: string,
    jackpot: number
  ): Promise<void> {
    await Promise.all([
      this.publishGlobalEvent(EventType.JACKPOT_WON, { userId, roomId, jackpot }),
      this.publishUserEvent(userId, EventType.JACKPOT_WON, { jackpot, roomId }),
      this.publishRoomEvent(roomId, EventType.JACKPOT_WON, { userId, jackpot }),
    ]);
  }

  public async notifyLeaderboardUpdate(
    period: 'daily' | 'weekly' | 'monthly' | 'alltime',
    topPlayers: any[]
  ): Promise<void> {
    await this.publishGlobalEvent(EventType.LEADERBOARD_UPDATED, {
      period,
      topPlayers,
      timestamp: new Date(),
    });
  }

  public async notifyUserAchievement(
    userId: string,
    achievement: any
  ): Promise<void> {
    await this.publishUserEvent(userId, EventType.USER_ACHIEVEMENT, achievement);
  }

  // Cleanup
  public async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all channels
      const channels = Array.from(this.subscriptions.keys());
      for (const channel of channels) {
        await this.unsubscribe(channel);
      }
      
      this.subscriptions.clear();
      this.removeAllListeners();
      this.isInitialized = false;
      
      console.log('✅ PubSub service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup PubSub service:', error);
    }
  }
}

export default PubSubService.getInstance();