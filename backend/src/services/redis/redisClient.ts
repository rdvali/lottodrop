import Redis from 'ioredis';
import { 
  redisConfig, 
  redisSentinelConfig, 
  isRedisSentinelEnabled,
  getRedisKeyPrefix 
} from '../../config/redis.config';

class RedisClient {
  private static instance: RedisClient;
  private masterClient: Redis | null = null;
  private replicaClient: Redis | null = null;
  private subscriberClient: Redis | null = null;
  private publisherClient: Redis | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async initialize(): Promise<void> {
    try {
      if (this.isConnected) {
        console.log('Redis clients already initialized');
        return;
      }

      await this.createConnections();
      await this.setupEventHandlers();
      await this.verifyConnections();
      
      this.isConnected = true;
      console.log('✅ Redis clients initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Redis clients:', error);
      throw error;
    }
  }

  private async createConnections(): Promise<void> {
    if (isRedisSentinelEnabled()) {
      console.log('Initializing Redis with Sentinel configuration');
      
      this.masterClient = new Redis({
        ...redisSentinelConfig,
        role: 'master',
      });

      this.replicaClient = new Redis({
        ...redisSentinelConfig,
        role: 'slave',
      });

      this.subscriberClient = new Redis({
        ...redisSentinelConfig,
        role: 'slave',
      });

      this.publisherClient = new Redis({
        ...redisSentinelConfig,
        role: 'master',
      });
    } else {
      console.log('Initializing Redis with standalone configuration');
      
      this.masterClient = new Redis(redisConfig);
      this.replicaClient = new Redis(redisConfig);
      this.subscriberClient = new Redis(redisConfig);
      this.publisherClient = new Redis(redisConfig);
    }
  }

  private async setupEventHandlers(): Promise<void> {
    const clients = [
      { name: 'Master', client: this.masterClient },
      { name: 'Replica', client: this.replicaClient },
      { name: 'Subscriber', client: this.subscriberClient },
      { name: 'Publisher', client: this.publisherClient },
    ];

    clients.forEach(({ name, client }) => {
      if (!client) return;

      client.on('connect', () => {
        console.log(`📡 Redis ${name} client connected`);
      });

      client.on('ready', () => {
        console.log(`✅ Redis ${name} client ready`);
      });

      client.on('error', (error) => {
        console.error(`❌ Redis ${name} client error:`, error);
      });

      client.on('close', () => {
        console.log(`🔌 Redis ${name} client connection closed`);
      });

      client.on('reconnecting', (delay: number) => {
        console.log(`🔄 Redis ${name} client reconnecting in ${delay}ms`);
      });

      client.on('end', () => {
        console.log(`⛔ Redis ${name} client connection ended`);
      });
    });
  }

  private async verifyConnections(): Promise<void> {
    const pingPromises = [
      this.masterClient?.ping(),
      this.replicaClient?.ping(),
      this.subscriberClient?.ping(),
      this.publisherClient?.ping(),
    ];

    const results = await Promise.allSettled(pingPromises);
    
    results.forEach((result, index) => {
      const clientNames = ['Master', 'Replica', 'Subscriber', 'Publisher'];
      if (result.status === 'fulfilled' && result.value === 'PONG') {
        console.log(`✅ ${clientNames[index]} client verified`);
      } else {
        console.warn(`⚠️ ${clientNames[index]} client verification failed`);
      }
    });
  }

  public getMaster(): Redis {
    if (!this.masterClient) {
      throw new Error('Redis master client not initialized');
    }
    return this.masterClient;
  }

  public getReplica(): Redis {
    if (!this.replicaClient) {
      throw new Error('Redis replica client not initialized');
    }
    return this.replicaClient;
  }

  public getSubscriber(): Redis {
    if (!this.subscriberClient) {
      throw new Error('Redis subscriber client not initialized');
    }
    return this.subscriberClient;
  }

  public getPublisher(): Redis {
    if (!this.publisherClient) {
      throw new Error('Redis publisher client not initialized');
    }
    return this.publisherClient;
  }

  public async disconnect(): Promise<void> {
    console.log('Disconnecting Redis clients...');
    
    const disconnectPromises = [
      this.masterClient?.quit(),
      this.replicaClient?.quit(),
      this.subscriberClient?.quit(),
      this.publisherClient?.quit(),
    ];

    await Promise.allSettled(disconnectPromises);
    
    this.masterClient = null;
    this.replicaClient = null;
    this.subscriberClient = null;
    this.publisherClient = null;
    this.isConnected = false;
    
    console.log('✅ Redis clients disconnected');
  }

  public async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      master: boolean;
      replica: boolean;
      subscriber: boolean;
      publisher: boolean;
    };
  }> {
    const checks = {
      master: false,
      replica: false,
      subscriber: false,
      publisher: false,
    };

    try {
      if (this.masterClient) {
        const result = await this.masterClient.ping();
        checks.master = result === 'PONG';
      }

      if (this.replicaClient) {
        const result = await this.replicaClient.ping();
        checks.replica = result === 'PONG';
      }

      if (this.subscriberClient) {
        const result = await this.subscriberClient.ping();
        checks.subscriber = result === 'PONG';
      }

      if (this.publisherClient) {
        const result = await this.publisherClient.ping();
        checks.publisher = result === 'PONG';
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    const healthy = Object.values(checks).every(status => status);

    return {
      healthy,
      details: checks,
    };
  }

  public async getInfo(): Promise<any> {
    try {
      const info = await this.masterClient?.info();
      return this.parseRedisInfo(info || '');
    } catch (error) {
      console.error('Failed to get Redis info:', error);
      return null;
    }
  }

  private parseRedisInfo(info: string): any {
    const sections: any = {};
    const lines = info.split('\r\n');
    let currentSection = 'default';

    lines.forEach(line => {
      if (line.startsWith('#')) {
        currentSection = line.substring(2).toLowerCase();
        sections[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (!sections[currentSection]) {
          sections[currentSection] = {};
        }
        sections[currentSection][key] = value;
      }
    });

    return sections;
  }

  public async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush Redis in production environment');
    }
    
    await this.masterClient?.flushall();
    console.log('⚠️ Redis flushed (all data cleared)');
  }

  public async getMemoryUsage(): Promise<{
    used: number;
    peak: number;
    percentage: number;
  }> {
    const info = await this.getInfo();
    
    if (!info || !info.memory) {
      return { used: 0, peak: 0, percentage: 0 };
    }

    const used = parseInt(info.memory.used_memory || '0');
    const peak = parseInt(info.memory.used_memory_peak || '0');
    const percentage = peak > 0 ? (used / peak) * 100 : 0;

    return {
      used,
      peak,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  public getConnectionStatus(): {
    isConnected: boolean;
    clients: {
      master: string;
      replica: string;
      subscriber: string;
      publisher: string;
    };
  } {
    return {
      isConnected: this.isConnected,
      clients: {
        master: this.masterClient?.status || 'disconnected',
        replica: this.replicaClient?.status || 'disconnected',
        subscriber: this.subscriberClient?.status || 'disconnected',
        publisher: this.publisherClient?.status || 'disconnected',
      },
    };
  }
}

export default RedisClient.getInstance();