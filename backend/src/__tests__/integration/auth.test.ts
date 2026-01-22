// Integration tests for authentication endpoints
// Tests logout with token blacklist (CRIT-003) and account lockout (HIGH-002)

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../../types';

// Mock dependencies
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

jest.mock('../../services/redis/redisClient', () => ({
  __esModule: true,
  default: {
    getMaster: jest.fn(() => ({
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn()
    })),
    initialize: jest.fn()
  }
}));

import pool from '../../config/database';
import redisClient from '../../services/redis/redisClient';
import app from '../../index';

describe('Authentication Integration Tests', () => {
  let mockRedis: any;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = redisClient.getMaster();
    mockPool = pool;
  });

  describe('POST /api/auth/logout (CRIT-003)', () => {
    it('should blacklist token and return success', async () => {
      const payload: AuthPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        isAdmin: false
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '7d'
      });

      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out successfully',
        success: true
      });

      // Verify token was blacklisted in Redis
      expect(mockRedis.setex).toHaveBeenCalled();
      const blacklistCall = mockRedis.setex.mock.calls[0];
      expect(blacklistCall[0]).toContain('blacklist:');
      expect(blacklistCall[2]).toBe('1');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(400);

      expect(response.body.error).toContain('No token provided');
    });

    it('should handle invalid token format', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(400);

      expect(response.body.error).toContain('Invalid token format');
    });

    it('should calculate correct TTL for token blacklist', async () => {
      const payload: AuthPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        isAdmin: false
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '1h' // 3600 seconds
      });

      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // TTL should be approximately 1 hour (3600 seconds)
      const ttl = mockRedis.setex.mock.calls[0][1];
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });
  });

  describe('POST /api/auth/login - Account Lockout (HIGH-002)', () => {
    it('should lock account after 5 failed login attempts', async () => {
      mockPool.query.mockResolvedValue({ rows: [] }); // User not found
      mockRedis.get.mockResolvedValue(null); // Not locked yet
      mockRedis.incr.mockResolvedValue(5); // 5th attempt
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(429);

      expect(response.body.error).toContain('Account locked');
      expect(response.body.lockoutDuration).toBe(1800);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'account_locked:test@example.com',
        1800,
        '1'
      );
    });

    it('should return remaining attempts after failed login', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      mockRedis.get.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(2); // 2nd attempt

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.remainingAttempts).toBe(3);
    });

    it('should reject login if account is locked', async () => {
      mockRedis.get.mockResolvedValue('1'); // Account locked
      mockRedis.ttl.mockResolvedValue(900); // 15 minutes remaining

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        })
        .expect(429);

      expect(response.body.error).toContain('temporarily locked');
      expect(response.body.lockoutDuration).toBe(900);
    });

    it('should clear failed attempts after successful login', async () => {
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz'; // Mock bcrypt hash

      mockRedis.get.mockResolvedValue(null); // Not locked
      mockPool.query.mockResolvedValue({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          password_hash: hashedPassword,
          balance: '100.00',
          currency: 'USD',
          is_admin: false,
          is_active: true
        }]
      });

      // Mock bcrypt.compare to return true
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }));

      mockRedis.del.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correctpassword'
        });

      // Should clear attempts after successful login
      expect(mockRedis.del).toHaveBeenCalledWith('login_attempts:test@example.com');
    });
  });

  describe('Token Blacklist Enforcement', () => {
    it('should reject requests with blacklisted tokens', async () => {
      const payload: AuthPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        isAdmin: false
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '7d'
      });

      // Mock token as blacklisted
      mockRedis.get.mockResolvedValue('1');

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toContain('Token has been revoked');
      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining('blacklist:'));
    });

    it('should allow requests with valid non-blacklisted tokens', async () => {
      const payload: AuthPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        isAdmin: false
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '7d'
      });

      // Token not blacklisted
      mockRedis.get.mockResolvedValue(null);

      mockPool.query.mockResolvedValue({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          first_name: 'John',
          last_name: 'Doe',
          email: 'test@example.com',
          balance: '100.00',
          currency: 'USD',
          is_admin: false,
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
    });
  });
});
