import { apiClient } from './config'
import type { Transaction, GameHistoryFilters, GameHistoryResponse, ApiResponse } from '../../types'
import { balanceRateLimiter, gameHistoryRateLimiter } from '../../utils/rateLimiter'

export const balanceAPI = {
  async getBalance(): Promise<{ balance: number }> {
    return balanceRateLimiter.execute(async () => {
      const { data } = await apiClient.get<ApiResponse<{ balance: number }>>('/balance')
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to get balance')
      }
      return data.data
    })
  },

  async getTransactions(): Promise<Transaction[]> {
    return balanceRateLimiter.execute(async () => {
      const { data } = await apiClient.get<ApiResponse<Transaction[]>>('/transactions')
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to get transactions')
      }
      return data.data
    })
  },

  async getGameHistory(filters?: GameHistoryFilters): Promise<GameHistoryResponse> {
    return gameHistoryRateLimiter.execute(async () => {
      const params = new URLSearchParams()

    if (filters) {
      // Add pagination params
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      // Add date range
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      // Add result filter
      if (filters.result && filters.result !== 'all') {
        params.append('result', filters.result)
      }

      // Add sorting
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      // Add entry fee range
      if (filters.minEntryFee !== undefined) {
        params.append('minEntryFee', filters.minEntryFee.toString())
      }
      if (filters.maxEntryFee !== undefined) {
        params.append('maxEntryFee', filters.maxEntryFee.toString())
      }
    }

    const queryString = params.toString()
    const url = `/games${queryString ? `?${queryString}` : ''}`

    // Add performance optimizations
    const requestConfig = {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 second timeout for large datasets
    }

      try {
        const { data } = await apiClient.get<GameHistoryResponse>(url, requestConfig)

        if (!data.success) {
          throw new Error(data.error || 'Failed to get game history')
        }

        // Ensure backward compatibility
        const response = {
          success: data.success,
          data: data.data || [],
          games: data.games || data.data || [],
          pagination: data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
          },
          statistics: data.statistics || {
            totalGames: 0,
            totalWon: 0,
            totalLost: 0,
            totalPending: 0,
            totalWinnings: 0,
            totalSpent: 0,
            winRate: 0,
            averageEntryFee: 0,
            biggestWin: 0
          }
        }

        return response
      } catch (error) {
        // Enhanced error logging
        console.group('[Game History API] Error')
        console.error('Error Type:', error instanceof Error ? error.name : typeof error)
        console.error('Error Message:', error instanceof Error ? error.message : String(error))
        if ((error as any).response) {
          console.error('Response Status:', (error as any).response.status)
          console.error('Response Data:', (error as any).response.data)
          console.error('Response Headers:', (error as any).response.headers)
        }
        if ((error as any).request) {
          console.error('Request Made:', true)
          console.error('No Response Received')
        }
        console.error('Full Error:', error)
        console.groupEnd()

        throw error
      }
    })
  },

  async deposit(amount: number): Promise<void> {
    const { data } = await apiClient.post<ApiResponse<void>>('/balance/deposit', { amount })
    if (!data.success) {
      throw new Error(data.error || 'Failed to deposit')
    }
  },

  async withdraw(amount: number): Promise<void> {
    const { data } = await apiClient.post<ApiResponse<void>>('/balance/withdraw', { amount })
    if (!data.success) {
      throw new Error(data.error || 'Failed to withdraw')
    }
  },
}