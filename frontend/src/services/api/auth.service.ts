import { apiClient } from './config'
import type { User, LoginForm, RegisterForm, ApiResponse, UserLogFilters, UserLogResponse } from '../../types'
import { apiRateLimiter } from '../../utils/rateLimiter'

// Backend response interfaces
// SECURITY FIX (Week 4): Backend now returns accessToken and refreshToken
interface BackendAuthResponse {
  message: string
  accessToken: string // Week 4: Changed from 'token' to 'accessToken'
  refreshToken: string // Week 4: Added refresh token
  expiresIn: number // Week 4: Token expiry in seconds
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    balance: number
    currency: string
    isAdmin: boolean
  }
}

// Transform backend user to frontend User type
const transformUser = (backendUser: BackendAuthResponse['user']): User => ({
  id: backendUser.id,
  username: `${backendUser.firstName} ${backendUser.lastName}`.trim(),
  email: backendUser.email,
  balance: backendUser.balance,
  currency: backendUser.currency || 'USD',
  avatar: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

export const authAPI = {
  async login(credentials: LoginForm): Promise<{ user: User; token: string }> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.post<BackendAuthResponse>(
        '/auth/login',
        credentials
      )
      // SECURITY FIX (Week 4): Check for accessToken instead of token
      if (!data.accessToken || !data.user) {
        throw new Error('Login failed - invalid response')
      }
      return {
        user: transformUser(data.user),
        token: data.accessToken // Week 4: Return accessToken (also stored in HttpOnly cookie)
      }
    })
  },

  async register(userData: RegisterForm): Promise<{ user: User; token: string }> {
    return apiRateLimiter.execute(async () => {
      // Transform frontend RegisterForm to backend format
      const backendData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password
      }

      const { data } = await apiClient.post<BackendAuthResponse>(
        '/auth/register',
        backendData
      )
      // SECURITY FIX (Week 4): Check for accessToken instead of token
      if (!data.accessToken || !data.user) {
        throw new Error('Registration failed - invalid response')
      }
      return {
        user: transformUser(data.user),
        token: data.accessToken // Week 4: Return accessToken (also stored in HttpOnly cookie)
      }
    })
  },

  async getProfile(): Promise<User> {
    return apiRateLimiter.execute(async () => {
      // Backend returns user directly, not wrapped in success/data
      const { data } = await apiClient.get<BackendAuthResponse['user'] & { createdAt: string }>('/auth/profile')
      if (!data || !data.id) {
        throw new Error('Failed to get profile')
      }
      return transformUser(data)
    })
  },

  async changePassword(passwords: {
    currentPassword: string
    newPassword: string
  }): Promise<{ message: string }> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.post<ApiResponse<void>>(
        '/auth/change-password',
        passwords
      )
      if (!data.success) {
        throw new Error(data.error || 'Failed to change password')
      }
      return { message: data.message || 'Password changed successfully' }
    })
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore logout errors
    }
    // SECURITY FIX (Week 4): Token is now in HttpOnly cookie, cleared by server
    // Only remove user data from localStorage (non-sensitive)
    localStorage.removeItem('user')
  },

  async getUserLogs(filters?: UserLogFilters): Promise<UserLogResponse> {
    return apiRateLimiter.execute(async () => {
      const params = new URLSearchParams()

      if (filters) {
        if (filters.page) params.append('page', filters.page.toString())
        if (filters.limit) params.append('limit', filters.limit.toString())
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)
        if (filters.action && filters.action !== 'all') {
          params.append('action', filters.action)
        }
      }

      const queryString = params.toString()
      const url = `/auth/me/logs${queryString ? `?${queryString}` : ''}`

      const { data } = await apiClient.get<UserLogResponse>(url)

      if (!data.success) {
        throw new Error(data.error || 'Failed to get user logs')
      }

      return {
        success: data.success,
        data: data.data || [],
        logs: data.logs || data.data || [],
        pagination: data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      }
    })
  },
}