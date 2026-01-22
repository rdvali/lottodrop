/**
 * CSRF Token Manager
 *
 * SECURITY FIX (Week 4): Manages CSRF tokens for state-changing requests
 * - Fetches tokens from /auth/csrf-token endpoint
 * - Stores tokens in memory (not localStorage) for security
 * - Auto-refreshes before expiry (50 minutes = 3000 seconds)
 * - Provides token to request interceptor
 */

import { apiClient } from '../services/api/config'
import { logger } from './logger'

interface CsrfTokenResponse {
  csrfToken: string
  expiresIn: number // seconds
}

class CsrfTokenManager {
  private token: string | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private isRefreshing = false
  private refreshPromise: Promise<string> | null = null

  /**
   * Initialize CSRF token on app load
   * Called after user authentication
   */
  async initialize(): Promise<void> {
    try {
      await this.fetchToken()
      this.scheduleRefresh()
    } catch (error) {
      logger.error('Failed to initialize CSRF token:', error)
      // Non-fatal - will retry on first state-changing request
    }
  }

  /**
   * Get current CSRF token
   * If no token exists or refresh is needed, fetches new one
   */
  async getToken(): Promise<string | null> {
    // If token exists and not expired, return it
    if (this.token) {
      return this.token
    }

    // If currently refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    // Otherwise fetch new token
    try {
      return await this.fetchToken()
    } catch (error) {
      logger.error('Failed to get CSRF token:', error)
      return null
    }
  }

  /**
   * Fetch new CSRF token from server
   */
  private async fetchToken(): Promise<string> {
    // Prevent concurrent refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performTokenFetch()

    try {
      const token = await this.refreshPromise
      return token
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * Actual token fetch implementation
   */
  private async performTokenFetch(): Promise<string> {
    try {
      const response = await apiClient.get<CsrfTokenResponse>('/auth/csrf-token')
      const { csrfToken, expiresIn } = response.data

      this.token = csrfToken

      // Schedule refresh at 50 minutes (before 1-hour expiry)
      const refreshIn = Math.max((expiresIn - 600) * 1000, 60000) // Refresh 10 min before expiry, min 1 min
      this.scheduleRefresh(refreshIn)

      logger.info('CSRF token fetched successfully')
      return csrfToken
    } catch (error) {
      logger.error('Failed to fetch CSRF token:', error)
      throw error
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleRefresh(delayMs: number = 3000000): void { // Default: 50 minutes
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.fetchToken()
      } catch (error) {
        logger.error('Automatic CSRF token refresh failed:', error)
        // Retry in 1 minute
        this.scheduleRefresh(60000)
      }
    }, delayMs)
  }

  /**
   * Clear token and stop refresh timer
   * Called on logout
   */
  clear(): void {
    this.token = null
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    this.isRefreshing = false
    this.refreshPromise = null
  }

  /**
   * Force refresh token
   * Called when CSRF validation fails (403 error)
   */
  async refresh(): Promise<string | null> {
    this.token = null // Invalidate current token
    try {
      return await this.fetchToken()
    } catch (error) {
      logger.error('Failed to refresh CSRF token:', error)
      return null
    }
  }
}

// Singleton instance
export const csrfManager = new CsrfTokenManager()
