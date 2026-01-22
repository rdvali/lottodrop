/**
 * Login Error Handler Utility
 *
 * Handles backend login error responses and formats them for display
 */

export interface LoginErrorResponse {
  error: string
  code?: string
  remainingAttempts?: number
}

export interface ParsedLoginError {
  message: string
  warningMessage?: string
  shouldShowAttempts: boolean
}

/**
 * Parses backend login error and returns formatted messages
 * @param error - Error object from backend
 * @returns Parsed error with message and optional warning
 */
export const parseLoginError = (error: unknown): ParsedLoginError => {
  // Default error
  const defaultError: ParsedLoginError = {
    message: 'Login failed. Please try again.',
    shouldShowAttempts: false,
  }

  // Handle axios errors (check for response.data first)
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: unknown } }
    if (axiosError.response?.data) {
      const responseData = axiosError.response.data

      // Check if response data is our LoginErrorResponse format
      if (
        responseData &&
        typeof responseData === 'object' &&
        'error' in responseData
      ) {
        const errorData = responseData as LoginErrorResponse

        // Handle INVALID_CREDENTIALS specifically
        if (errorData.code === 'INVALID_CREDENTIALS') {
          const result: ParsedLoginError = {
            message: errorData.error || 'Invalid email or password',
            shouldShowAttempts: typeof errorData.remainingAttempts === 'number',
          }

          // Add warning if remaining attempts are low
          if (
            typeof errorData.remainingAttempts === 'number' &&
            errorData.remainingAttempts < 3 &&
            errorData.remainingAttempts > 0
          ) {
            const attemptsText =
              errorData.remainingAttempts === 1
                ? '1 attempt'
                : `${errorData.remainingAttempts} attempts`
            result.warningMessage = `You have ${attemptsText} left before temporary lock.`
          } else if (errorData.remainingAttempts === 0) {
            result.warningMessage = 'Account temporarily locked. Please try again later.'
          }

          return result
        }

        // Handle other backend errors
        return {
          message: errorData.error || defaultError.message,
          shouldShowAttempts: false,
        }
      }
    }
  }

  // Handle non-Error objects
  if (!(error instanceof Error)) {
    return defaultError
  }

  // Fallback: Try to extract from error message (for non-axios errors)
  try {
    // Check if error message is JSON
    const errorMessage = error.message
    let errorData: LoginErrorResponse | null = null

    // Try to parse as JSON if it looks like JSON
    if (errorMessage.includes('{') && errorMessage.includes('}')) {
      const jsonMatch = errorMessage.match(/\{[^}]+\}/)
      if (jsonMatch) {
        errorData = JSON.parse(jsonMatch[0]) as LoginErrorResponse
      }
    } else {
      // Create error data from plain string
      errorData = {
        error: errorMessage,
      }
    }

    if (!errorData) {
      return defaultError
    }

    // Handle INVALID_CREDENTIALS specifically
    if (errorData.code === 'INVALID_CREDENTIALS') {
      const result: ParsedLoginError = {
        message: errorData.error || 'Invalid email or password',
        shouldShowAttempts: typeof errorData.remainingAttempts === 'number',
      }

      // Add warning if remaining attempts are low
      if (
        typeof errorData.remainingAttempts === 'number' &&
        errorData.remainingAttempts < 3 &&
        errorData.remainingAttempts > 0
      ) {
        const attemptsText =
          errorData.remainingAttempts === 1
            ? '1 attempt'
            : `${errorData.remainingAttempts} attempts`
        result.warningMessage = `You have ${attemptsText} left before temporary lock.`
      } else if (errorData.remainingAttempts === 0) {
        result.warningMessage = 'Account temporarily locked. Please try again later.'
      }

      return result
    }

    // Handle other backend errors
    return {
      message: errorData.error || defaultError.message,
      shouldShowAttempts: false,
    }
  } catch {
    // If parsing fails, return the plain error message
    return {
      message: error.message || defaultError.message,
      shouldShowAttempts: false,
    }
  }
}

/**
 * Checks if an error is a credentials error
 * @param error - Error object
 * @returns True if error is about invalid credentials
 */
export const isCredentialsError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('invalid') ||
    message.includes('incorrect') ||
    message.includes('wrong') ||
    message.includes('credentials')
  )
}

/**
 * Checks if an error is a network/server error
 * @param error - Error object
 * @returns True if error is network-related
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('server') ||
    message.includes('connection')
  )
}
