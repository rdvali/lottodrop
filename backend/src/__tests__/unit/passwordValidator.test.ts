// Unit tests for password strength validation (HIGH-001)
// Tests the zxcvbn-based password validation utility

import { validatePassword, isValidPasswordLength } from '../../utils/passwordValidator';

describe('Password Validation (HIGH-001 Security Fix)', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than 12 characters', () => {
      const result = validatePassword('Short1!');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 12 characters');
      expect(result.score).toBe(0);
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'a'.repeat(129);
      const result = validatePassword(longPassword);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('not exceed 128 characters');
    });

    it('should reject weak passwords (score < 3)', () => {
      const weakPasswords = [
        'password123456',
        '123456789012',
        'qwertyuiop12',
        'abcdefghijkl'
      ];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.score).toBeLessThan(3);
        expect(result.feedback).toBeDefined();
      });
    });

    it('should accept strong passwords (score >= 3)', () => {
      const strongPasswords = [
        'Tr0ub4dor&3MyStr0ng!Pass',
        'C0rrect-H0rse-Battery-Staple',
        'MyP@ssw0rd!s$ecure2024'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(3);
      });
    });

    it('should reject passwords containing user-specific data', () => {
      const userInputs = ['john', 'doe', 'johndoe'];
      const result = validatePassword('johndoe123456', userInputs);

      expect(result.valid).toBe(false);
      expect(result.score).toBeLessThan(3);
    });

    it('should accept passwords when user inputs provided but not used', () => {
      const userInputs = ['john', 'doe'];
      const result = validatePassword('C0rrect-H0rse-Battery-Staple', userInputs);

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should handle empty password gracefully', () => {
      const result = validatePassword('');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 12 characters');
    });

    it('should provide feedback for weak passwords', () => {
      const result = validatePassword('password1234');

      expect(result.valid).toBe(false);
      expect(result.feedback).toBeDefined();
      expect(result.feedback?.suggestions).toBeDefined();
    });
  });

  describe('isValidPasswordLength', () => {
    it('should return true for valid password lengths', () => {
      expect(isValidPasswordLength('12characters')).toBe(true);
      expect(isValidPasswordLength('a'.repeat(12))).toBe(true);
      expect(isValidPasswordLength('a'.repeat(128))).toBe(true);
    });

    it('should return false for invalid password lengths', () => {
      expect(isValidPasswordLength('short')).toBe(false);
      expect(isValidPasswordLength('a'.repeat(11))).toBe(false);
      expect(isValidPasswordLength('a'.repeat(129))).toBe(false);
      expect(isValidPasswordLength('')).toBe(false);
    });
  });
});
