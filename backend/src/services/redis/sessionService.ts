import RedisClient from './redisClient';
import { REDIS_KEYS, REDIS_KEY_TTL } from '../../config/redis.config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface SessionData {
  userId: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionToken {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

class SessionService {
  private static instance: SessionService;

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  public async createSession(data: Omit<SessionData, 'createdAt' | 'lastActivity'>): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const sessionData: SessionData = {
        ...data,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      const redis = RedisClient.getMaster();
      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      
      await redis.setex(
        sessionKey,
        REDIS_KEY_TTL.SESSION,
        JSON.stringify(sessionData)
      );

      await this.addUserSession(data.userId, sessionId);

      console.log(`Session created for user ${data.userId}: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Session creation failed');
    }
  }

  public async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const redis = RedisClient.getReplica();
      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      
      const data = await redis.get(sessionKey);
      
      if (!data) {
        return null;
      }

      const sessionData = JSON.parse(data) as SessionData;
      
      await this.updateLastActivity(sessionId);

      return sessionData;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  public async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    try {
      const existingSession = await this.getSession(sessionId);
      
      if (!existingSession) {
        return false;
      }

      const updatedSession: SessionData = {
        ...existingSession,
        ...updates,
        lastActivity: new Date(),
      };

      const redis = RedisClient.getMaster();
      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      
      await redis.setex(
        sessionKey,
        REDIS_KEY_TTL.SESSION,
        JSON.stringify(updatedSession)
      );

      return true;
    } catch (error) {
      console.error('Failed to update session:', error);
      return false;
    }
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return false;
      }

      const redis = RedisClient.getMaster();
      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      
      await redis.del(sessionKey);
      
      await this.removeUserSession(session.userId, sessionId);

      console.log(`Session deleted: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  public async extendSession(sessionId: string): Promise<boolean> {
    try {
      const redis = RedisClient.getMaster();
      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      
      const result = await redis.expire(sessionKey, REDIS_KEY_TTL.SESSION);
      
      if (result === 1) {
        await this.updateLastActivity(sessionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to extend session:', error);
      return false;
    }
  }

  public async getUserSessions(userId: string): Promise<string[]> {
    try {
      const redis = RedisClient.getReplica();
      const userSessionsKey = REDIS_KEYS.USER_SESSIONS(userId);
      
      const sessions = await redis.smembers(userSessionsKey);
      return sessions;
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  public async deleteAllUserSessions(userId: string): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      if (sessions.length === 0) {
        return 0;
      }

      const redis = RedisClient.getMaster();
      const deletePromises = sessions.map(sessionId => 
        redis.del(REDIS_KEYS.SESSION(sessionId))
      );
      
      await Promise.all(deletePromises);
      
      await redis.del(REDIS_KEYS.USER_SESSIONS(userId));

      console.log(`Deleted ${sessions.length} sessions for user ${userId}`);
      return sessions.length;
    } catch (error) {
      console.error('Failed to delete user sessions:', error);
      return 0;
    }
  }

  public async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return false;
      }

      const now = new Date();
      const lastActivity = new Date(session.lastActivity);
      const timeSinceActivity = now.getTime() - lastActivity.getTime();
      const maxInactivity = 30 * 60 * 1000; // 30 minutes

      if (timeSinceActivity > maxInactivity) {
        await this.deleteSession(sessionId);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return false;
    }
  }

  public generateToken(sessionId: string, userId: string): string {
    const payload: SessionToken = {
      sessionId,
      userId,
      expiresAt: new Date(Date.now() + REDIS_KEY_TTL.SESSION * 1000),
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.sign(payload, secret, { expiresIn: '24h' });
  }

  public async verifyToken(token: string): Promise<SessionToken | null> {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as SessionToken;
      
      const isValid = await this.validateSession(decoded.sessionId);
      
      if (!isValid) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Failed to verify token:', error);
      return null;
    }
  }

  public async getActiveSessions(): Promise<number> {
    try {
      const redis = RedisClient.getReplica();
      const pattern = `${REDIS_KEYS.SESSION('*')}`;
      
      const keys = await redis.keys(pattern);
      return keys.length;
    } catch (error) {
      console.error('Failed to count active sessions:', error);
      return 0;
    }
  }

  public async cleanupExpiredSessions(): Promise<number> {
    try {
      const redis = RedisClient.getMaster();
      const pattern = `${REDIS_KEYS.SESSION('*')}`;
      
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        
        if (ttl === -1) {
          await redis.del(key);
          cleaned++;
        }
      }

      console.log(`Cleaned up ${cleaned} expired sessions`);
      return cleaned;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async updateLastActivity(sessionId: string): Promise<void> {
    try {
      const redis = RedisClient.getMaster();
      const sessionKey = REDIS_KEYS.SESSION(sessionId);
      
      const data = await redis.get(sessionKey);
      
      if (data) {
        const sessionData = JSON.parse(data);
        sessionData.lastActivity = new Date();
        
        await redis.setex(
          sessionKey,
          REDIS_KEY_TTL.SESSION,
          JSON.stringify(sessionData)
        );
      }
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    try {
      const redis = RedisClient.getMaster();
      const userSessionsKey = REDIS_KEYS.USER_SESSIONS(userId);
      
      await redis.sadd(userSessionsKey, sessionId);
      await redis.expire(userSessionsKey, REDIS_KEY_TTL.SESSION);
    } catch (error) {
      console.error('Failed to add user session:', error);
    }
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    try {
      const redis = RedisClient.getMaster();
      const userSessionsKey = REDIS_KEYS.USER_SESSIONS(userId);
      
      await redis.srem(userSessionsKey, sessionId);
    } catch (error) {
      console.error('Failed to remove user session:', error);
    }
  }
}

export default SessionService.getInstance();