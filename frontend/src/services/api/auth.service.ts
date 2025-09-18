import { apiClient } from './config'
import type { User, LoginForm, RegisterForm, ApiResponse } from '../../types'
import { apiRateLimiter } from '../../utils/rateLimiter'

// Backend response interfaces
interface BackendAuthResponse {
  message: string
  token: string
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
      if (!data.token || !data.user) {
        throw new Error('Login failed - invalid response')
      }
      return {
        user: transformUser(data.user),
        token: data.token
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
      if (!data.token || !data.user) {
        throw new Error('Registration failed - invalid response')
      }
      return {
        user: transformUser(data.user),
        token: data.token
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
  }): Promise<void> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.post<ApiResponse<void>>(
        '/auth/change-password',
        passwords
      )
      if (!data.success) {
        throw new Error(data.error || 'Failed to change password')
      }
    })
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
}