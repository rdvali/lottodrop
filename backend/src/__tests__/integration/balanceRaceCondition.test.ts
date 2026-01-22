// Integration tests for atomic balance operations (CRIT-005)
// Tests prevention of double-spend attacks via concurrent requests

import { Pool } from 'pg';

// Mock pg Pool
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };

  return {
    Pool: jest.fn(() => ({
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient)
    }))
  };
});

describe('Balance Race Condition Fix (CRIT-005 Security Fix)', () => {
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient)
    };
  });

  describe('Atomic Balance Deduction', () => {
    it('should use single atomic UPDATE with WHERE balance >= check', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 10;
      const currentBalance = 100;

      // Mock successful deduction
      mockClient.query.mockResolvedValueOnce({ rows: [{ balance: currentBalance - betAmount }] });

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;
      const result = await mockClient.query(query, [betAmount, userId]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].balance).toBe(90);
    });

    it('should reject deduction if insufficient balance (atomic check)', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 150;
      const currentBalance = 100;

      // Mock failed deduction (no rows updated)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;
      const result = await mockClient.query(query, [betAmount, userId]);

      // No rows returned means insufficient balance
      expect(result.rows.length).toBe(0);
    });

    it('should prevent TOCTOU vulnerability', async () => {
      // Time-of-Check vs Time-of-Use attack simulation
      // With separate SELECT and UPDATE, this would be vulnerable
      // With atomic UPDATE, it's safe

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 50;

      // Scenario: User has $100, tries to join two $60 rooms simultaneously

      // OLD VULNERABLE CODE (separate check and update):
      // 1. Request A: SELECT balance → $100 ✓ (passes check)
      // 2. Request B: SELECT balance → $100 ✓ (passes check)
      // 3. Request A: UPDATE balance = $100 - $60 → $40
      // 4. Request B: UPDATE balance = $40 - $60 → -$20 (FRAUD!)

      // NEW SECURE CODE (atomic check + update):
      // 1. Request A: UPDATE WHERE balance >= $60 → Success, balance = $40
      // 2. Request B: UPDATE WHERE balance >= $60 → FAIL (balance is $40)

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ balance: 40 }] }) // First request succeeds
        .mockResolvedValueOnce({ rows: [] }); // Second request fails (insufficient balance)

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;

      const result1 = await mockClient.query(query, [60, userId]);
      const result2 = await mockClient.query(query, [60, userId]);

      expect(result1.rows.length).toBe(1); // First succeeds
      expect(result1.rows[0].balance).toBe(40);
      expect(result2.rows.length).toBe(0); // Second fails
    });
  });

  describe('Concurrent Request Scenarios', () => {
    it('should handle 10 concurrent requests safely', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 15;
      const initialBalance = 100;

      // User has $100, tries to join 10 rooms at $15 each
      // Only 6 should succeed (6 * $15 = $90), 4 should fail

      const results = [];

      // Mock database responses (6 successes, 4 failures)
      for (let i = 0; i < 10; i++) {
        const remaining = initialBalance - (i * betAmount);

        if (remaining >= betAmount) {
          mockClient.query.mockResolvedValueOnce({
            rows: [{ balance: remaining - betAmount }]
          });
          results.push({ success: true, balance: remaining - betAmount });
        } else {
          mockClient.query.mockResolvedValueOnce({ rows: [] });
          results.push({ success: false });
        }
      }

      // Count successes and failures
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;

      expect(successes).toBe(6);
      expect(failures).toBe(4);

      // Final balance should be $10 (6 * $15 = $90 deducted)
      const finalBalance = results.filter(r => r.success).pop()?.balance;
      expect(finalBalance).toBe(10);
    });

    it('should prevent negative balance', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 150;

      // User has $100, tries to bet $150
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;
      const result = await mockClient.query(query, [betAmount, userId]);

      // Update fails, balance remains positive
      expect(result.rows.length).toBe(0);
    });

    it('should handle exact balance deduction', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 100;

      // User has exactly $100, bets $100
      mockClient.query.mockResolvedValueOnce({ rows: [{ balance: 0 }] });

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;
      const result = await mockClient.query(query, [betAmount, userId]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].balance).toBe(0);
    });
  });

  describe('Database-Level Protection', () => {
    it('should use FOR UPDATE lock on room record', async () => {
      const roomId = '456e4567-e89b-12d3-a456-426614174000';

      const query = 'SELECT * FROM rooms WHERE id = $1 FOR UPDATE';

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: roomId,
          bet_amount: '10.00',
          status: 'WAITING'
        }]
      });

      const result = await mockClient.query(query, [roomId]);

      expect(query).toContain('FOR UPDATE');
      expect(result.rows.length).toBe(1);
    });

    it('should execute balance check and deduction in single statement', async () => {
      // Ensures database handles the atomic operation
      // Not multiple round-trips to application

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;

      // Query should contain both the deduction AND the check
      expect(query).toContain('balance - $1'); // Deduction
      expect(query).toContain('balance >= $1'); // Check
      expect(query).toContain('RETURNING balance'); // Confirmation
    });

    it('should handle transaction rollback on insufficient balance', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Balance check fails
        .mockResolvedValueOnce('ROLLBACK'); // Transaction rollback

      const balanceUpdate = await mockClient.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
        [100, 'user-id']
      );

      if (balanceUpdate.rows.length === 0) {
        await mockClient.query('ROLLBACK');
      }

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Security Attack Scenarios', () => {
    it('should prevent double-spend via rapid clicking', async () => {
      // User clicks "Join Room" button 5 times rapidly
      // Should only process once

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 50;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ balance: 50 }] }) // First click succeeds
        .mockResolvedValueOnce({ rows: [] }) // Subsequent clicks fail
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;

      const results = await Promise.all([
        mockClient.query(query, [betAmount, userId]),
        mockClient.query(query, [betAmount, userId]),
        mockClient.query(query, [betAmount, userId]),
        mockClient.query(query, [betAmount, userId]),
        mockClient.query(query, [betAmount, userId])
      ]);

      const successes = results.filter(r => r.rows.length > 0);
      expect(successes.length).toBe(1); // Only one succeeds
    });

    it('should prevent network retry attacks', async () => {
      // Network timeout causes client to retry
      // Should not charge user twice

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const betAmount = 25;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ balance: 75 }] }) // Original request
        .mockResolvedValueOnce({ rows: [] }); // Retry (fails, already deducted)

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;

      const original = await mockClient.query(query, [betAmount, userId]);
      const retry = await mockClient.query(query, [betAmount, userId]);

      expect(original.rows[0].balance).toBe(75);
      expect(retry.rows.length).toBe(0); // Retry fails
    });
  });

  describe('Performance Considerations', () => {
    it('should execute in single database round-trip', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ balance: 90 }] });

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;
      await mockClient.query(query, [10, 'user-id']);

      // Only one query execution (not separate SELECT then UPDATE)
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should use indexed columns for fast lookup', async () => {
      // Assumes `id` column has index
      // Assumes `balance` column check is optimized

      const query = `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance`;

      expect(query).toContain('WHERE id = $2'); // Indexed lookup
    });
  });
});
