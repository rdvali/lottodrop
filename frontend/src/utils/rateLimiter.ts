/**
 * Rate limiter utility for API requests
 * Implements request throttling, retry logic, and exponential backoff
 */

interface RateLimitConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  requestsPerSecond?: number
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: any) => void
  fn: () => Promise<any>
  retries: number
}

class RateLimiter {
  private queue: PendingRequest[] = []
  private processing = false
  private lastRequestTime = 0
  private windowStart = Date.now()

  private config: Required<RateLimitConfig> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    requestsPerSecond: 10
  }

  constructor(config?: RateLimitConfig) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        resolve,
        reject,
        fn,
        retries: 0
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const request = this.queue.shift()!

    // Check rate limit
    await this.enforceRateLimit()

    try {
      const result = await request.fn()
      request.resolve(result)
    } catch (error: any) {
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        if (request.retries < this.config.maxRetries) {
          // Calculate backoff delay
          const delay = this.calculateBackoff(request.retries)
          request.retries++

          console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${request.retries}/${this.config.maxRetries})`)

          // Re-queue with delay
          setTimeout(() => {
            this.queue.unshift(request)
            this.processQueue()
          }, delay)

          return
        }
      }

      // Max retries reached or different error
      request.reject(error)
    }

    // Process next request
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100)
    } else {
      this.processing = false
    }
  }

  private async enforceRateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const minInterval = 1000 / this.config.requestsPerSecond

    // Reset window if needed
    if (now - this.windowStart >= 1000) {
      this.windowStart = now
    }

    // Check if we need to wait
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  private calculateBackoff(retryCount: number): number {
    const delay = Math.min(
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, retryCount),
      this.config.maxDelay
    )

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay
    return Math.floor(delay + jitter)
  }

  private isRateLimitError(error: any): boolean {
    // Check for common rate limit error patterns
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      // HTTP 429 Too Many Requests
      if (status === 429) return true

      // Check error message
      if (data?.error?.toLowerCase().includes('rate limit')) return true
      if (data?.message?.toLowerCase().includes('rate limit')) return true
      if (data?.error?.toLowerCase().includes('too many requests')) return true
    }

    return false
  }

  /**
   * Clear the queue and reset state
   */
  clear() {
    this.queue.forEach(request => {
      request.reject(new Error('Rate limiter cleared'))
    })
    this.queue = []
    this.processing = false
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length
  }
}

// Create singleton instances for different API endpoints
export const apiRateLimiter = new RateLimiter({
  requestsPerSecond: 5,
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000
})

export const gameHistoryRateLimiter = new RateLimiter({
  requestsPerSecond: 2,
  maxRetries: 2,
  initialDelay: 2000,
  maxDelay: 10000
})

export const balanceRateLimiter = new RateLimiter({
  requestsPerSecond: 3,
  maxRetries: 3,
  initialDelay: 1500,
  maxDelay: 15000
})

// Export the class for custom instances
export default RateLimiter