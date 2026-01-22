import { apiClient } from './config'
import type {
  NetworkConfig,
  CreateDepositRequest,
  CreateDepositResponse,
  CryptoDeposit,
  DepositHistoryResponse,
  DepositStatus
} from '../../types/deposit'

// Simple rate limiter for deposit requests
let lastDepositRequest = 0
const DEPOSIT_COOLDOWN_MS = 2000 // 2 second cooldown between deposit requests

export const depositAPI = {
  /**
   * Get supported cryptocurrency networks
   */
  async getNetworks(): Promise<NetworkConfig[]> {
    const { data } = await apiClient.get<{ success: boolean; data: NetworkConfig[] }>('/crypto/networks')
    if (!data.success || !data.data) {
      throw new Error('Failed to get supported networks')
    }
    return data.data
  },

  /**
   * Create a new crypto deposit request
   * Returns deposit address and QR code data
   */
  async createDeposit(request: CreateDepositRequest): Promise<CreateDepositResponse> {
    // Simple rate limiting
    const now = Date.now()
    if (now - lastDepositRequest < DEPOSIT_COOLDOWN_MS) {
      throw new Error('Please wait before creating another deposit request')
    }
    lastDepositRequest = now

    const { data } = await apiClient.post<{ success: boolean; data: CreateDepositResponse; error?: string }>(
      '/crypto/deposit',
      request
    )

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to create deposit')
    }

    return data.data
  },

  /**
   * Get user's deposit history with pagination and filters
   */
  async getDeposits(options?: {
    page?: number
    limit?: number
    status?: DepositStatus
    network?: string
  }): Promise<DepositHistoryResponse> {
    const params = new URLSearchParams()

    if (options) {
      if (options.page) params.append('page', options.page.toString())
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.status) params.append('status', options.status)
      if (options.network) params.append('network', options.network)
    }

    const queryString = params.toString()
    const url = `/crypto/deposits${queryString ? `?${queryString}` : ''}`

    const { data } = await apiClient.get<DepositHistoryResponse>(url)

    if (!data.success) {
      throw new Error('Failed to get deposit history')
    }

    return data
  },

  /**
   * Get single deposit status by ID
   */
  async getDepositById(depositId: string): Promise<CryptoDeposit> {
    const { data } = await apiClient.get<{ success: boolean; data: CryptoDeposit; error?: string }>(
      `/crypto/deposits/${depositId}`
    )

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to get deposit status')
    }

    return data.data
  },

  /**
   * Cancel a pending deposit (if supported by payment provider)
   * Note: Most deposits cannot be canceled once created
   */
  async cancelDeposit(depositId: string): Promise<boolean> {
    const { data } = await apiClient.post<{ success: boolean; error?: string }>(
      `/crypto/deposits/${depositId}/cancel`
    )

    if (!data.success) {
      throw new Error(data.error || 'Failed to cancel deposit')
    }

    return true
  }
}
