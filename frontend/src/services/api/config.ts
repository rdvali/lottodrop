import axios from 'axios'
import { csrfManager } from '../../utils/csrfManager'
import { logoutManager } from '../../utils/logoutManager'

// Use relative URL for API to work with nginx proxy
const API_URL = import.meta.env.VITE_API_URL || '/api'

// SECURITY FIX (Week 4): HttpOnly cookie authentication
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true, // SECURITY: Send HttpOnly cookies with requests
})

// SECURITY FIX (Week 4): Add CSRF token to state-changing requests
apiClient.interceptors.request.use(
  async (config) => {
    // Token is now sent via HttpOnly cookie automatically
    // No need to manually add Authorization header

    // SECURITY FIX (Week 4): Add CSRF token for state-changing operations
    const method = config.method?.toLowerCase()
    const isStateChanging = method && ['post', 'put', 'patch', 'delete'].includes(method)

    // Skip CSRF token for the CSRF endpoint itself to avoid circular dependency
    const isCsrfEndpoint = config.url?.includes('/auth/csrf-token')

    if (isStateChanging && !isCsrfEndpoint) {
      try {
        const csrfToken = await csrfManager.getToken()
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken
        }
      } catch (error) {
        // Log error but don't block request
        // Server will reject if CSRF token is required
        console.error('Failed to get CSRF token:', error)
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // SECURITY FIX (Week 4): Handle CSRF token failures
    if (error.response?.status === 403 && error.response?.data?.error?.includes('CSRF')) {
      // Don't retry if already retried once
      if (!originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true

        try {
          // Refresh CSRF token
          const newToken = await csrfManager.refresh()
          if (newToken) {
            // Update request header with new token
            originalRequest.headers['X-CSRF-Token'] = newToken
            // Retry the request
            return apiClient(originalRequest)
          }
        } catch (refreshError) {
          console.error('Failed to refresh CSRF token:', refreshError)
        }
      }
    }

    // SECURITY FIX (Week 4): Handle unauthorized errors (token expired/invalid)
    if (error.response?.status === 401) {
      // Skip session expiry handling for auth endpoints
      // (these are expected to return 401 if not authenticated)
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                            originalRequest.url?.includes('/auth/register') ||
                            originalRequest.url?.includes('/auth/csrf-token') ||
                            originalRequest.url?.includes('/auth/logout') // Don't show modal during logout

      // Check if this is a manual/intentional logout
      const isManualLogout = logoutManager.isManual()

      if (!isAuthEndpoint && !isManualLogout) {
        // SECURITY FIX (Week 4): Session has ACTUALLY expired (not manual logout)
        console.log('[API Interceptor] Session expired - opening login modal')

        // Try to get userId from localStorage before clearing
        const userData = localStorage.getItem('user')
        let userId: string | undefined
        try {
          if (userData) {
            const user = JSON.parse(userData)
            userId = user?.id
          }
        } catch (err) {
          console.warn('[API Interceptor] Could not parse user data:', err)
        }

        // Log session expiry to backend (best effort - don't wait for response)
        try {
          apiClient.post('/auth/log-session-expiry', {
            userId,
            lastActivity: new Date().toISOString()
          }).catch(err => {
            console.warn('[API Interceptor] Failed to log session expiry:', err)
          })
        } catch (err) {
          // Silently fail - logging is not critical
          console.warn('[API Interceptor] Failed to initiate session expiry log:', err)
        }

        // Clear user data from localStorage (non-sensitive)
        localStorage.removeItem('user')

        // Clear CSRF token as well
        csrfManager.clear()

        // Dispatch session expired event for AuthContext to handle
        // AuthContext will open the regular login modal
        window.dispatchEvent(new CustomEvent('auth:session-expired', {
          detail: {
            reason: 'token-expired',
            timestamp: Date.now()
          }
        }))
      } else if (isManualLogout) {
        // Manual logout - just clear the flag, don't show session expired modal
        console.log('[API Interceptor] Manual logout detected - clearing flag')
        logoutManager.clear()

        // Dispatch regular logout event instead
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'manual' } }))
      } else {
        // For auth endpoints, just dispatch regular logout event
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'unauthorized' } }))
      }
    }

    return Promise.reject(error)
  }
)