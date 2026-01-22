import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  getPasswordErrorMessages,
  validatePasswordMatch,
  mapBackendPasswordError,
  PASSWORD_HELPER_TEXT,
} from '../passwordValidator'

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('should validate password with 12+ chars, uppercase, and symbol', () => {
      const result = validatePassword('Abcdefghij!k')
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should validate password with exactly 12 characters', () => {
      const result = validatePassword('Password123!')
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should validate password with multiple uppercase and symbols', () => {
      const result = validatePassword('ABC@def#GHI$jkl')
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should validate password with various allowed symbols', () => {
      const symbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/', '\\', '|', '~']

      symbols.forEach(symbol => {
        const password = `Abcdefghijk${symbol}`
        const result = validatePassword(password)
        expect(result.valid).toBe(true, `Password with symbol "${symbol}" should be valid`)
      })
    })

    it('should validate long passwords', () => {
      const result = validatePassword('ThisIsAVeryLongPassword123!@#$%')
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })
  })

  describe('invalid passwords - length', () => {
    it('should reject password with 11 characters', () => {
      const result = validatePassword('Abc!defGhij') // 11 chars
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBe(true)
    })

    it('should reject password with 8 characters', () => {
      const result = validatePassword('Abcd!123') // 8 chars
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBe(true)
    })

    it('should reject empty password', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBe(true)
    })

    it('should reject very short password', () => {
      const result = validatePassword('A!')
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBe(true)
    })
  })

  describe('invalid passwords - no uppercase', () => {
    it('should reject password without uppercase letter', () => {
      const result = validatePassword('abcdefghijkl!') // no uppercase
      expect(result.valid).toBe(false)
      expect(result.errors.uppercase).toBe(true)
    })

    it('should reject password with only lowercase and symbol', () => {
      const result = validatePassword('lowercase@password')
      expect(result.valid).toBe(false)
      expect(result.errors.uppercase).toBe(true)
    })

    it('should reject password with numbers and symbol but no uppercase', () => {
      const result = validatePassword('password123!')
      expect(result.valid).toBe(false)
      expect(result.errors.uppercase).toBe(true)
    })
  })

  describe('invalid passwords - no symbol', () => {
    it('should reject password without symbol', () => {
      const result = validatePassword('Abcdefghijkl') // no symbol
      expect(result.valid).toBe(false)
      expect(result.errors.symbol).toBe(true)
    })

    it('should reject password with only letters and numbers', () => {
      const result = validatePassword('Password1234')
      expect(result.valid).toBe(false)
      expect(result.errors.symbol).toBe(true)
    })

    it('should reject password with uppercase but no symbol', () => {
      const result = validatePassword('UPPERCASEPASSWORD')
      expect(result.valid).toBe(false)
      expect(result.errors.symbol).toBe(true)
    })
  })

  describe('invalid passwords - multiple violations', () => {
    it('should detect all three errors', () => {
      const result = validatePassword('abc') // short, no uppercase, no symbol
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBe(true)
      expect(result.errors.uppercase).toBe(true)
      expect(result.errors.symbol).toBe(true)
    })

    it('should detect length and uppercase errors', () => {
      const result = validatePassword('abcdefg!') // short, no uppercase
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBe(true)
      expect(result.errors.uppercase).toBe(true)
      expect(result.errors.symbol).toBeUndefined()
    })

    it('should detect length and symbol errors', () => {
      const result = validatePassword('Abcdefgh') // short, no symbol
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBe(true)
      expect(result.errors.uppercase).toBeUndefined()
      expect(result.errors.symbol).toBe(true)
    })

    it('should detect uppercase and symbol errors', () => {
      const result = validatePassword('abcdefghijklmno') // no uppercase, no symbol
      expect(result.valid).toBe(false)
      expect(result.errors.minLength).toBeUndefined()
      expect(result.errors.uppercase).toBe(true)
      expect(result.errors.symbol).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle password with spaces', () => {
      const result = validatePassword('My Password 123!')
      expect(result.valid).toBe(true)
    })

    it('should handle password with unicode characters', () => {
      const result = validatePassword('Pässwörd123!')
      expect(result.valid).toBe(true)
    })

    it('should handle password with emojis (treated as regular chars)', () => {
      const result = validatePassword('Password123!😀')
      expect(result.valid).toBe(true)
    })
  })
})

describe('getPasswordErrorMessages', () => {
  it('should return empty array for no errors', () => {
    const messages = getPasswordErrorMessages({})
    expect(messages).toEqual([])
  })

  it('should return message for minLength error', () => {
    const messages = getPasswordErrorMessages({ minLength: true })
    expect(messages).toEqual(['At least 12 characters'])
  })

  it('should return message for uppercase error', () => {
    const messages = getPasswordErrorMessages({ uppercase: true })
    expect(messages).toEqual(['At least 1 uppercase letter (A-Z)'])
  })

  it('should return message for symbol error', () => {
    const messages = getPasswordErrorMessages({ symbol: true })
    expect(messages).toEqual(['At least 1 symbol (!, @, #, etc.)'])
  })

  it('should return all messages for multiple errors', () => {
    const messages = getPasswordErrorMessages({
      minLength: true,
      uppercase: true,
      symbol: true,
    })
    expect(messages).toEqual([
      'At least 12 characters',
      'At least 1 uppercase letter (A-Z)',
      'At least 1 symbol (!, @, #, etc.)',
    ])
  })

  it('should return messages in correct order', () => {
    const messages = getPasswordErrorMessages({
      symbol: true,
      minLength: true,
    })
    expect(messages).toEqual([
      'At least 12 characters',
      'At least 1 symbol (!, @, #, etc.)',
    ])
  })
})

describe('validatePasswordMatch', () => {
  it('should return true when passwords match', () => {
    expect(validatePasswordMatch('Password123!', 'Password123!')).toBe(true)
  })

  it('should return false when passwords do not match', () => {
    expect(validatePasswordMatch('Password123!', 'Password456!')).toBe(false)
  })

  it('should return true for empty strings', () => {
    expect(validatePasswordMatch('', '')).toBe(true)
  })

  it('should be case-sensitive', () => {
    expect(validatePasswordMatch('Password123!', 'password123!')).toBe(false)
  })

  it('should be whitespace-sensitive', () => {
    expect(validatePasswordMatch('Password123!', 'Password123! ')).toBe(false)
  })
})

describe('mapBackendPasswordError', () => {
  describe('length errors', () => {
    it('should map "at least 12 characters" error', () => {
      const result = mapBackendPasswordError('Password must be at least 12 characters long')
      expect(result).toBe('Password must be at least 12 characters long')
    })

    it('should map "minimum 12 characters" error', () => {
      const result = mapBackendPasswordError('Password must be minimum 12 characters')
      expect(result).toBe('Password must be at least 12 characters long')
    })

    it('should map "12 characters long" error (case insensitive)', () => {
      const result = mapBackendPasswordError('PASSWORD MUST BE 12 CHARACTERS LONG')
      expect(result).toBe('Password must be at least 12 characters long')
    })
  })

  describe('uppercase errors', () => {
    it('should map "uppercase" error', () => {
      const result = mapBackendPasswordError('Password must contain an uppercase letter')
      expect(result).toBe('Password must contain at least one uppercase letter')
    })

    it('should map "capital letter" error', () => {
      const result = mapBackendPasswordError('Password must contain a capital letter')
      expect(result).toBe('Password must contain at least one uppercase letter')
    })
  })

  describe('symbol errors', () => {
    it('should map "symbol" error', () => {
      const result = mapBackendPasswordError('Password must contain a symbol')
      expect(result).toBe('Password must contain at least one symbol (!, @, #, etc.)')
    })

    it('should map "special character" error', () => {
      const result = mapBackendPasswordError('Password must contain a special character')
      expect(result).toBe('Password must contain at least one symbol (!, @, #, etc.)')
    })
  })

  describe('generic password errors', () => {
    it('should return original for generic invalid password error', () => {
      const error = 'Password is invalid'
      const result = mapBackendPasswordError(error)
      expect(result).toBe(error)
    })

    it('should return original for password requirements error', () => {
      const error = 'Password does not meet requirements'
      const result = mapBackendPasswordError(error)
      expect(result).toBe(error)
    })
  })

  describe('non-password errors', () => {
    it('should return null for email error', () => {
      const result = mapBackendPasswordError('Email already exists')
      expect(result).toBeNull()
    })

    it('should return null for generic error', () => {
      const result = mapBackendPasswordError('Registration failed')
      expect(result).toBeNull()
    })

    it('should return null for network error', () => {
      const result = mapBackendPasswordError('Network request failed')
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = mapBackendPasswordError('')
      expect(result).toBeNull()
    })
  })
})

describe('PASSWORD_HELPER_TEXT', () => {
  it('should export the correct helper text', () => {
    expect(PASSWORD_HELPER_TEXT).toBe('At least 12 characters • 1 uppercase letter • 1 symbol (!@#$%...)')
  })
})

describe('Test case scenarios from requirements', () => {
  it('should reject: Abc!defGhij (11 chars)', () => {
    const result = validatePassword('Abc!defGhij')
    expect(result.valid).toBe(false)
    expect(result.errors.minLength).toBe(true)
  })

  it('should reject: Abcdefghijkl (no symbol)', () => {
    const result = validatePassword('Abcdefghijkl')
    expect(result.valid).toBe(false)
    expect(result.errors.symbol).toBe(true)
  })

  it('should reject: abcdefghijkl! (no uppercase)', () => {
    const result = validatePassword('abcdefghijkl!')
    expect(result.valid).toBe(false)
    expect(result.errors.uppercase).toBe(true)
  })

  it('should accept: Abcdefghij!k', () => {
    const result = validatePassword('Abcdefghij!k')
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
})
