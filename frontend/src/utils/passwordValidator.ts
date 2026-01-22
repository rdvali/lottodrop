/**
 * Password Validation Utility
 *
 * Enforces password policy:
 * - Minimum 12 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 symbol from: ! @ # $ % ^ & * ( ) _ + - = { } [ ] : ; " ' < > , . ? / \ | ~
 */

export interface PasswordValidationResult {
  valid: boolean
  errors: {
    minLength?: boolean
    uppercase?: boolean
    symbol?: boolean
  }
}

// Individual validation patterns for password validation
// Note: We validate each requirement separately for detailed error messages
// Combined regex: /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{}:;"'<>,.?/\\|~]).{12,}$/
const MIN_LENGTH = 12
const UPPERCASE_REGEX = /[A-Z]/
const SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{}:;"'<>,.?/\\|~]/

/**
 * Validates a password against the defined policy
 * @param password - The password to validate
 * @returns Validation result with detailed error flags
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: PasswordValidationResult['errors'] = {}

  // Check minimum length
  if (password.length < MIN_LENGTH) {
    errors.minLength = true
  }

  // Check for uppercase letter
  if (!UPPERCASE_REGEX.test(password)) {
    errors.uppercase = true
  }

  // Check for symbol
  if (!SYMBOL_REGEX.test(password)) {
    errors.symbol = true
  }

  const valid = Object.keys(errors).length === 0

  return { valid, errors }
}

/**
 * Gets user-friendly error messages for password validation errors
 * @param errors - The validation errors object
 * @returns Array of error message strings
 */
export const getPasswordErrorMessages = (errors: PasswordValidationResult['errors']): string[] => {
  const messages: string[] = []

  if (errors.minLength) {
    messages.push('At least 12 characters')
  }

  if (errors.uppercase) {
    messages.push('At least 1 uppercase letter (A-Z)')
  }

  if (errors.symbol) {
    messages.push('At least 1 symbol (!, @, #, etc.)')
  }

  return messages
}

/**
 * Helper text shown when password field is not in error state
 */
export const PASSWORD_HELPER_TEXT = 'At least 12 characters • 1 uppercase letter • 1 symbol (!@#$%...)'

/**
 * Validates that two passwords match
 * @param password - The password
 * @param confirmPassword - The confirmation password
 * @returns True if passwords match
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword
}

/**
 * Maps backend error messages to frontend validation format
 * @param backendError - Error message from backend API
 * @returns Normalized error message or null if not password-related
 */
export const mapBackendPasswordError = (backendError: string): string | null => {
  const lowerError = backendError.toLowerCase()

  // Password length errors
  if (lowerError.includes('at least 12 characters') ||
      lowerError.includes('minimum 12 characters') ||
      lowerError.includes('12 characters long')) {
    return 'Password must be at least 12 characters long'
  }

  // Uppercase requirement
  if (lowerError.includes('uppercase') || lowerError.includes('capital letter')) {
    return 'Password must contain at least one uppercase letter'
  }

  // Symbol requirement
  if (lowerError.includes('symbol') || lowerError.includes('special character')) {
    return 'Password must contain at least one symbol (!, @, #, etc.)'
  }

  // Generic password validation error
  if (lowerError.includes('password') &&
      (lowerError.includes('invalid') || lowerError.includes('requirements'))) {
    return backendError // Return original if it's a generic password error
  }

  return null // Not a password validation error
}
