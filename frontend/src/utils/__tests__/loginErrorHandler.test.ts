import { describe, it, expect } from 'vitest'
import {
  parseLoginError,
  isCredentialsError,
  isNetworkError,
} from '../loginErrorHandler'

describe('parseLoginError', () => {
  describe('INVALID_CREDENTIALS errors', () => {
    it('should parse axios error with code INVALID_CREDENTIALS', () => {
      const error = {
        response: {
          data: {
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            remainingAttempts: 4,
          }
        }
      }

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.shouldShowAttempts).toBe(true)
      expect(result.warningMessage).toBeUndefined()
    })

    it('should parse error with code INVALID_CREDENTIALS (legacy)', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 4,
        })
      )

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.shouldShowAttempts).toBe(true)
      expect(result.warningMessage).toBeUndefined()
    })

    it('should show warning when remaining attempts < 3 (axios error)', () => {
      const error = {
        response: {
          data: {
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            remainingAttempts: 2,
          }
        }
      }

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.warningMessage).toBe('You have 2 attempts left before temporary lock.')
      expect(result.shouldShowAttempts).toBe(true)
    })

    it('should show warning when remaining attempts < 3 (legacy)', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 2,
        })
      )

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.warningMessage).toBe('You have 2 attempts left before temporary lock.')
      expect(result.shouldShowAttempts).toBe(true)
    })

    it('should show singular "attempt" for remainingAttempts = 1', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 1,
        })
      )

      const result = parseLoginError(error)

      expect(result.warningMessage).toBe('You have 1 attempt left before temporary lock.')
    })

    it('should show lock message when remainingAttempts = 0', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 0,
        })
      )

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.warningMessage).toBe('Account temporarily locked. Please try again later.')
    })

    it('should not show warning when remainingAttempts >= 3', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 3,
        })
      )

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.warningMessage).toBeUndefined()
      expect(result.shouldShowAttempts).toBe(true)
    })

    it('should handle missing remainingAttempts', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        })
      )

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.shouldShowAttempts).toBe(false)
      expect(result.warningMessage).toBeUndefined()
    })
  })

  describe('Other backend errors', () => {
    it('should parse generic backend error', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Email not found',
        })
      )

      const result = parseLoginError(error)

      expect(result.message).toBe('Email not found')
      expect(result.shouldShowAttempts).toBe(false)
      expect(result.warningMessage).toBeUndefined()
    })

    it('should handle plain string error messages', () => {
      const error = new Error('Invalid credentials')

      const result = parseLoginError(error)

      expect(result.message).toBe('Invalid credentials')
      expect(result.shouldShowAttempts).toBe(false)
    })

    it('should handle server errors', () => {
      const error = new Error('Internal server error')

      const result = parseLoginError(error)

      expect(result.message).toBe('Internal server error')
    })

    it('should handle network errors', () => {
      const error = new Error('Network request failed')

      const result = parseLoginError(error)

      expect(result.message).toBe('Network request failed')
    })
  })

  describe('Edge cases', () => {
    it('should handle non-Error objects', () => {
      const result = parseLoginError('not an error object')

      expect(result.message).toBe('Login failed. Please try again.')
      expect(result.shouldShowAttempts).toBe(false)
    })

    it('should handle null', () => {
      const result = parseLoginError(null)

      expect(result.message).toBe('Login failed. Please try again.')
    })

    it('should handle undefined', () => {
      const result = parseLoginError(undefined)

      expect(result.message).toBe('Login failed. Please try again.')
    })

    it('should handle Error with empty message', () => {
      const error = new Error('')

      const result = parseLoginError(error)

      expect(result.message).toBe('Login failed. Please try again.')
    })

    it('should handle malformed JSON in error message', () => {
      const error = new Error('{invalid json}')

      const result = parseLoginError(error)

      // Should fall back to error message or default
      expect(result.message).toBeTruthy()
    })

    it('should handle JSON with missing error field', () => {
      const error = new Error(
        JSON.stringify({
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 5,
        })
      )

      const result = parseLoginError(error)

      // Should use fallback message
      expect(result.message).toBe('Invalid email or password')
    })
  })
})

describe('isCredentialsError', () => {
  it('should return true for "invalid" errors', () => {
    const error = new Error('Invalid email or password')
    expect(isCredentialsError(error)).toBe(true)
  })

  it('should return true for "incorrect" errors', () => {
    const error = new Error('Incorrect credentials')
    expect(isCredentialsError(error)).toBe(true)
  })

  it('should return true for "wrong" errors', () => {
    const error = new Error('Wrong password')
    expect(isCredentialsError(error)).toBe(true)
  })

  it('should return true for "credentials" errors', () => {
    const error = new Error('Bad credentials')
    expect(isCredentialsError(error)).toBe(true)
  })

  it('should be case-insensitive', () => {
    const error = new Error('INVALID CREDENTIALS')
    expect(isCredentialsError(error)).toBe(true)
  })

  it('should return false for network errors', () => {
    const error = new Error('Network request failed')
    expect(isCredentialsError(error)).toBe(false)
  })

  it('should return false for non-Error objects', () => {
    expect(isCredentialsError('not an error')).toBe(false)
    expect(isCredentialsError(null)).toBe(false)
    expect(isCredentialsError(undefined)).toBe(false)
  })
})

describe('isNetworkError', () => {
  it('should return true for "network" errors', () => {
    const error = new Error('Network request failed')
    expect(isNetworkError(error)).toBe(true)
  })

  it('should return true for "timeout" errors', () => {
    const error = new Error('Request timeout')
    expect(isNetworkError(error)).toBe(true)
  })

  it('should return true for "server" errors', () => {
    const error = new Error('Server unavailable')
    expect(isNetworkError(error)).toBe(true)
  })

  it('should return true for "connection" errors', () => {
    const error = new Error('Connection refused')
    expect(isNetworkError(error)).toBe(true)
  })

  it('should be case-insensitive', () => {
    const error = new Error('NETWORK ERROR')
    expect(isNetworkError(error)).toBe(true)
  })

  it('should return false for credentials errors', () => {
    const error = new Error('Invalid credentials')
    expect(isNetworkError(error)).toBe(false)
  })

  it('should return false for non-Error objects', () => {
    expect(isNetworkError('not an error')).toBe(false)
    expect(isNetworkError(null)).toBe(false)
    expect(isNetworkError(undefined)).toBe(false)
  })
})

describe('Real-world scenarios', () => {
  it('should handle axios 401 error with backend response', () => {
    const error = {
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: {
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 4,
        }
      }
    }

    const result = parseLoginError(error)

    expect(result).toEqual({
      message: 'Invalid email or password',
      shouldShowAttempts: true,
    })
  })

  it('should handle typical backend INVALID_CREDENTIALS response (legacy)', () => {
    const error = new Error(
      JSON.stringify({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: 4,
      })
    )

    const result = parseLoginError(error)

    expect(result).toEqual({
      message: 'Invalid email or password',
      shouldShowAttempts: true,
    })
  })

  it('should handle low attempts warning scenario', () => {
    const error = new Error(
      JSON.stringify({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: 2,
      })
    )

    const result = parseLoginError(error)

    expect(result.message).toBe('Invalid email or password')
    expect(result.warningMessage).toContain('2 attempts left')
    expect(result.shouldShowAttempts).toBe(true)
  })

  it('should handle account locked scenario', () => {
    const error = new Error(
      JSON.stringify({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: 0,
      })
    )

    const result = parseLoginError(error)

    expect(result.warningMessage).toContain('temporarily locked')
  })
})
