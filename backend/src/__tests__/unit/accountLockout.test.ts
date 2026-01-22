// Unit tests for account lockout mechanism (HIGH-002)
// Tests progressive lockout for brute force prevention

import {
  recordFailedAttempt,
  clearFailedAttempts,
  checkAccountLockout
} from '../../utils/accountLockout';
import redisClient from '../../services/redis/redisClient';

// Create a persistent mock Redis instance
const mockRedisInstance = {
  incr: jest.fn(),
  get: jest.fn(),
  ttl: jest.fn(),
  setex: jest.fn(),
  expire: jest.fn(),
  del: jest.fn()
};

// Mock Redis client to always return the same instance
jest.mock('../../services/redis/redisClient', () => ({
  __esModule: true,
  default: {
    getMaster: jest.fn(() => mockRedisInstance)
  }
}));

describe('Account Lockout Mechanism (HIGH-002 Security Fix)', () => {
  let mockRedis: any;

  beforeEach(() => {
    // Reset mocks completely between tests
    mockRedisInstance.incr.mockReset();
    mockRedisInstance.get.mockReset();
    mockRedisInstance.ttl.mockReset();
    mockRedisInstance.setex.mockReset();
    mockRedisInstance.expire.mockReset();
    mockRedisInstance.del.mockReset();

    mockRedis = mockRedisInstance;
  });

  describe('recordFailedAttempt', () => {
    it('should record first failed attempt and set expiration', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.get.mockResolvedValue(null);

      const result = await recordFailedAttempt('test@example.com');

      expect(mockRedis.incr).toHaveBeenCalledWith('login_attempts:test@example.com');
      expect(mockRedis.expire).toHaveBeenCalledWith('login_attempts:test@example.com', 900);
      expect(result.isLocked).toBe(false);
      expect(result.remainingAttempts).toBe(4);
      expect(result.attemptCount).toBe(1);
    });

    it('should lock account after 5 failed attempts', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.get.mockResolvedValue(null);

      const result = await recordFailedAttempt('test@example.com');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'account_locked:test@example.com',
        1800, // 30 minutes
        '1'
      );
      expect(result.isLocked).toBe(true);
      expect(result.lockoutDuration).toBe(1800);
      expect(result.attemptCount).toBe(5);
    });

    it('should return lockout status if already locked', async () => {
      mockRedis.get.mockResolvedValue('1'); // Account is locked
      mockRedis.ttl.mockResolvedValue(600); // 10 minutes remaining

      const result = await recordFailedAttempt('test@example.com');

      expect(mockRedis.incr).not.toHaveBeenCalled();
      expect(result.isLocked).toBe(true);
      expect(result.lockoutDuration).toBe(600);
    });

    it('should handle email case insensitivity', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.get.mockResolvedValue(null);

      await recordFailedAttempt('Test@Example.COM');

      expect(mockRedis.incr).toHaveBeenCalledWith('login_attempts:test@example.com');
    });
  });

  describe('clearFailedAttempts', () => {
    it('should delete failed attempt counter', async () => {
      await clearFailedAttempts('test@example.com');

      expect(mockRedis.del).toHaveBeenCalledWith('login_attempts:test@example.com');
    });

    it('should handle email case insensitivity', async () => {
      await clearFailedAttempts('Test@Example.COM');

      expect(mockRedis.del).toHaveBeenCalledWith('login_attempts:test@example.com');
    });
  });

  describe('checkAccountLockout', () => {
    it('should return not locked for accounts with no attempts', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await checkAccountLockout('test@example.com');

      expect(result.isLocked).toBe(false);
      expect(result.remainingAttempts).toBe(5);
      expect(result.attemptCount).toBe(0);
    });

    it('should return lockout status for locked accounts', async () => {
      mockRedis.get
        .mockResolvedValueOnce('1') // account_locked key exists
        .mockResolvedValueOnce(null); // Ignore attempts check
      mockRedis.ttl.mockResolvedValue(900);

      const result = await checkAccountLockout('test@example.com');

      expect(result.isLocked).toBe(true);
      expect(result.lockoutDuration).toBe(900);
    });

    it('should return attempt count for unlocked accounts', async () => {
      mockRedis.get
        .mockResolvedValueOnce(null) // Not locked
        .mockResolvedValueOnce('3'); // 3 failed attempts

      const result = await checkAccountLockout('test@example.com');

      expect(result.isLocked).toBe(false);
      expect(result.attemptCount).toBe(3);
      expect(result.remainingAttempts).toBe(2);
    });
  });

  describe('Security Features', () => {
    it('should prevent username enumeration by tracking non-existent users', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.get.mockResolvedValue(null);

      const result = await recordFailedAttempt('nonexistent@example.com');

      expect(mockRedis.incr).toHaveBeenCalled();
      expect(result.remainingAttempts).toBe(4);
    });

    it('should use consistent lockout duration (30 minutes)', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.get.mockResolvedValue(null);

      await recordFailedAttempt('test@example.com');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        1800, // Exactly 30 minutes
        '1'
      );
    });

    it('should use 15-minute attempt window', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.get.mockResolvedValue(null);

      await recordFailedAttempt('test@example.com');

      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.any(String),
        900 // Exactly 15 minutes
      );
    });
  });
});
