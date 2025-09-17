import { useState, useEffect, useCallback, useRef } from 'react'
import type { GameHistoryResponse, GameHistoryFilters } from '../types'
import { balanceAPI } from '../services/api'

interface CacheEntry {
  data: GameHistoryResponse
  timestamp: number
  key: string
}

interface UseGameHistoryCacheOptions {
  cacheTimeout?: number // in milliseconds
  maxCacheSize?: number // maximum number of cached queries
}

const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const DEFAULT_MAX_CACHE_SIZE = 20

/**
 * Custom hook for caching game history data
 * Implements intelligent caching with TTL and size limits
 */
export const useGameHistoryCache = (
  options: UseGameHistoryCacheOptions = {}
) => {
  const {
    cacheTimeout = DEFAULT_CACHE_TIMEOUT,
    maxCacheSize = DEFAULT_MAX_CACHE_SIZE
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const cache = useRef<Map<string, CacheEntry>>(new Map())
  const requestQueue = useRef<Map<string, Promise<GameHistoryResponse>>>(new Map())

  /**
   * Generate cache key from filters
   */
  const getCacheKey = useCallback((filters: GameHistoryFilters): string => {
    return JSON.stringify({
      page: filters.page || 1,
      limit: filters.limit || 10,
      startDate: filters.startDate,
      endDate: filters.endDate,
      result: filters.result,
      sortBy: filters.sortBy || 'playedAt',
      sortOrder: filters.sortOrder || 'desc',
      minEntryFee: filters.minEntryFee,
      maxEntryFee: filters.maxEntryFee
    })
  }, [])

  /**
   * Check if cache entry is valid
   */
  const isCacheValid = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < cacheTimeout
  }, [cacheTimeout])

  /**
   * Clean expired cache entries
   */
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now()
    const entries = Array.from(cache.current.entries())
    
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp >= cacheTimeout) {
        cache.current.delete(key)
      }
    })
  }, [cacheTimeout])

  /**
   * Manage cache size - remove oldest entries if exceeding limit
   */
  const manageCacheSize = useCallback(() => {
    if (cache.current.size > maxCacheSize) {
      const entries = Array.from(cache.current.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toRemove = entries.slice(0, cache.current.size - maxCacheSize)
      toRemove.forEach(([key]) => cache.current.delete(key))
    }
  }, [maxCacheSize])

  /**
   * Fetch game history with caching
   */
  const fetchGameHistory = useCallback(async (
    filters: GameHistoryFilters
  ): Promise<GameHistoryResponse> => {
    const cacheKey = getCacheKey(filters)
    
    // Check cache first
    const cachedEntry = cache.current.get(cacheKey)
    if (cachedEntry && isCacheValid(cachedEntry)) {
      return cachedEntry.data
    }

    // Check if request is already in progress
    const existingRequest = requestQueue.current.get(cacheKey)
    if (existingRequest) {
      return existingRequest
    }

    // Create new request
    const request = (async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await balanceAPI.getGameHistory(filters)
        
        // Cache the response
        cache.current.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
          key: cacheKey
        })
        
        // Clean up cache
        cleanExpiredCache()
        manageCacheSize()
        
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch game history')
        setError(error)
        throw error
      } finally {
        setLoading(false)
        requestQueue.current.delete(cacheKey)
      }
    })()

    // Store request in queue to prevent duplicates
    requestQueue.current.set(cacheKey, request)
    return request
  }, [getCacheKey, isCacheValid, cleanExpiredCache, manageCacheSize])

  /**
   * Prefetch next page for smoother pagination
   */
  const prefetchNextPage = useCallback(async (
    currentFilters: GameHistoryFilters
  ): Promise<void> => {
    const nextPageFilters = {
      ...currentFilters,
      page: (currentFilters.page || 1) + 1
    }
    
    const cacheKey = getCacheKey(nextPageFilters)
    const cachedEntry = cache.current.get(cacheKey)
    
    // Only prefetch if not already cached
    if (!cachedEntry || !isCacheValid(cachedEntry)) {
      try {
        const response = await balanceAPI.getGameHistory(nextPageFilters)
        
        cache.current.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
          key: cacheKey
        })
        
        manageCacheSize()
      } catch {
        // Silently fail prefetch
      }
    }
  }, [getCacheKey, isCacheValid, manageCacheSize])

  /**
   * Clear all cache
   */
  const clearCache = useCallback(() => {
    cache.current.clear()
    requestQueue.current.clear()
  }, [])

  /**
   * Clear specific cache entry
   */
  const clearCacheEntry = useCallback((filters: GameHistoryFilters) => {
    const cacheKey = getCacheKey(filters)
    cache.current.delete(cacheKey)
  }, [getCacheKey])

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const entries = Array.from(cache.current.values())
    const now = Date.now()
    
    return {
      size: cache.current.size,
      validEntries: entries.filter(entry => isCacheValid(entry)).length,
      expiredEntries: entries.filter(entry => !isCacheValid(entry)).length,
      oldestEntry: entries.reduce((oldest, entry) => 
        !oldest || entry.timestamp < oldest.timestamp ? entry : oldest, 
        null as CacheEntry | null
      ),
      newestEntry: entries.reduce((newest, entry) => 
        !newest || entry.timestamp > newest.timestamp ? entry : newest, 
        null as CacheEntry | null
      ),
      averageAge: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length 
        : 0
    }
  }, [isCacheValid])

  /**
   * Clean up expired entries periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      cleanExpiredCache()
    }, 60000) // Clean every minute

    return () => clearInterval(interval)
  }, [cleanExpiredCache])

  return {
    fetchGameHistory,
    prefetchNextPage,
    clearCache,
    clearCacheEntry,
    getCacheStats,
    loading,
    error
  }
}

export default useGameHistoryCache