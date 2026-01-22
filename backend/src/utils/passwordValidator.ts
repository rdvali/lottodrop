// SECURITY FIX (HIGH-001): Password strength validation
// Uses zxcvbn library for entropy-based password strength analysis
// Prevents weak passwords from being used in the platform

import zxcvbn from 'zxcvbn';

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
  score?: number; // 0-4 (0=worst, 4=best)
  feedback?: {
    warning?: string;
    suggestions?: string[];
  };
}

/**
 * Validates password strength using zxcvbn algorithm
 * Requirements:
 * - Minimum 12 characters
 * - zxcvbn score >= 3 (out of 4)
 * - No common passwords or patterns
 *
 * @param password - The password to validate
 * @param userInputs - Optional array of user-specific words to check against (email, name, etc.)
 * @returns Validation result with feedback
 */
export const validatePassword = (
  password: string,
  userInputs?: string[]
): PasswordValidationResult => {
  // Check minimum length
  if (!password || password.length < 12) {
    return {
      valid: false,
      message: 'Password must be at least 12 characters long',
      score: 0
    };
  }

  // Check maximum length (prevent DoS via extremely long passwords)
  if (password.length > 128) {
    return {
      valid: false,
      message: 'Password must not exceed 128 characters',
      score: 0
    };
  }

  // Use zxcvbn to analyze password strength
  const result = zxcvbn(password, userInputs);

  // Require score of at least 3 (good) out of 4
  // Score meanings:
  // 0 - too guessable
  // 1 - very guessable
  // 2 - somewhat guessable
  // 3 - safely unguessable (minimum required)
  // 4 - very unguessable
  if (result.score < 3) {
    const suggestions = result.feedback.suggestions.length > 0
      ? result.feedback.suggestions.join(' ')
      : 'Use a mix of uppercase, lowercase, numbers, and special characters.';

    return {
      valid: false,
      message: result.feedback.warning || 'Password is too weak. ' + suggestions,
      score: result.score,
      feedback: {
        warning: result.feedback.warning,
        suggestions: result.feedback.suggestions
      }
    };
  }

  // Password meets all requirements
  return {
    valid: true,
    score: result.score,
    feedback: {
      suggestions: result.feedback.suggestions
    }
  };
};

/**
 * Simple validation for existing passwords (backward compatibility)
 * Only checks length, does not validate strength
 */
export const isValidPasswordLength = (password: string): boolean => {
  return !!(password && password.length >= 12 && password.length <= 128);
};
