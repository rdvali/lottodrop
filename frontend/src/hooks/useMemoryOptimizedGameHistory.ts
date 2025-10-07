import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameHistoryCache } from './useGameHistoryCache';
import type { GameHistory, GameHistoryFilters, GameStatistics, PaginationData } from '../types';

// Memory optimization constants
const MAX_CACHED_GAMES = 1000; // Maximum games to keep in memory
const CLEANUP_THRESHOLD = 1200; // Trigger cleanup when this many items

// Memory API types
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemoryMeasurement {
  bytes: number;
  breakdown: Array<{
    bytes: number;
    attribution: Array<{
      url: string;
      scope: string;
    }>;
  }>;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
  measureUserAgentSpecificMemory?: () => Promise<MemoryMeasurement>;
}

interface FormattedMemoryInfo {
  usedJSHeapSize: string;
  totalJSHeapSize: string;
  jsHeapSizeLimit: string;
  timestamp: string;
}

interface MemoryOptimizedState {
  games: GameHistory[];
  statistics: GameStatistics | null;
  pagination: PaginationData;
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  memoryUsage: {
    gamesCount: number;
    estimatedSize: string;
    lastCleanup: Date | null;
  };
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clearCache: () => void;
  forceCleanup: () => void;
}

// Memory usage calculation utility
const calculateMemoryUsage = (games: GameHistory[]) => {
  // Estimate memory usage based on typical game object size
  const avgGameSize = 400; // bytes per game object (estimated)
  const totalBytes = games.length * avgGameSize;
  
  if (totalBytes < 1024) return `${totalBytes}B`;
  if (totalBytes < 1024 * 1024) return `${Math.round(totalBytes / 1024)}KB`;
  return `${Math.round(totalBytes / (1024 * 1024))}MB`;
};

// Memory cleanup utility
const cleanupOldGames = (games: GameHistory[], maxCount: number): GameHistory[] => {
  if (games.length <= maxCount) return games;
  
  // Sort by playedAt date (keep most recent)
  const sortedGames = [...games].sort((a, b) => 
    new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );
  
  return sortedGames.slice(0, maxCount);
};

// WeakMap for managing component cleanup
const componentCleanupMap = new WeakMap<object, () => void>();

export const useMemoryOptimizedGameHistory = (filters: GameHistoryFilters): MemoryOptimizedState => {
  const cacheHook = useGameHistoryCache({});
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [statistics, setStatistics] = useState<GameStatistics | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [hasNextPage, setHasNextPage] = useState(false);
  const cleanupTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const componentRef = useRef<object>({});
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await cacheHook.fetchGameHistory(filters);
        setGameHistory(response.games || []);
        setStatistics(response.statistics || null);
        setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
        setHasNextPage(response.pagination ? response.pagination.page < response.pagination.totalPages : false);
      } catch (error) {
        console.error('Error fetching game history:', error);
      }
    };
    
    fetchData();
  }, [cacheHook, filters]);
  
  // Memoized games with automatic cleanup
  const optimizedGames = useMemo(() => {
    const currentGames = gameHistory;
    
    // Trigger cleanup if threshold exceeded
    if (currentGames.length > CLEANUP_THRESHOLD) {
      return cleanupOldGames(currentGames, MAX_CACHED_GAMES);
    }
    
    return currentGames;
  }, [gameHistory]);

  // Memory usage statistics
  const memoryUsage = useMemo(() => ({
    gamesCount: optimizedGames.length,
    estimatedSize: calculateMemoryUsage(optimizedGames),
    lastCleanup
  }), [optimizedGames, lastCleanup]);

  // Force cleanup function
  const forceCleanup = useCallback(() => {
    // Clear cache and trigger garbage collection hint
    cacheHook.clearCache();
    setLastCleanup(new Date());
    
    // Suggest garbage collection (hint only)
    const performanceWithMemory = window.performance as PerformanceWithMemory;
    if (performanceWithMemory && 'measureUserAgentSpecificMemory' in performanceWithMemory) {
      // Modern browsers with memory measurement support
      performanceWithMemory.measureUserAgentSpecificMemory?.()
        .then((_result: MemoryMeasurement) => {
          // Memory measurement completed
        })
        .catch(() => {
          // Silently ignore if not supported
        });
    }
  }, [cacheHook]);

  // Automatic cleanup on interval
  useEffect(() => {
    const setupCleanup = () => {
      cleanupTimerRef.current = setInterval(() => {
        if (optimizedGames.length > MAX_CACHED_GAMES) {
          setLastCleanup(new Date());
        }
      }, 2 * 60 * 1000); // Check every 2 minutes
    };

    setupCleanup();

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [optimizedGames.length]);

  // Component unmount cleanup
  useEffect(() => {
    const cleanup = () => {
      forceCleanup();
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };

    componentCleanupMap.set(componentRef.current, cleanup);

    return cleanup;
  }, [forceCleanup]);

  // Batched loading to prevent memory spikes
  const loadMore = useCallback(async () => {
    try {
      // Load next page of data
      const nextPageFilters = {
        ...filters,
        page: pagination.page + 1
      };
      
      const response = await cacheHook.fetchGameHistory(nextPageFilters);
      
      // Append new games to existing ones
      setGameHistory(prev => [...prev, ...(response.games || [])]);
      setPagination(response.pagination || pagination);
      setHasNextPage(response.pagination ? response.pagination.page < response.pagination.totalPages : false);
      
      // Check if cleanup is needed after loading
      if (gameHistory.length > CLEANUP_THRESHOLD) {
        // Delay cleanup slightly to avoid blocking UI
        setTimeout(() => {
          setLastCleanup(new Date());
        }, 100);
      }
    } catch (error) {
      console.error('Load more error:', error);
      throw error;
    }
  }, [cacheHook, filters, pagination, gameHistory.length]);

  // Memory-aware refresh
  const refresh = useCallback(async () => {
    try {
      // Clear memory before refresh
      forceCleanup();
      
      // Small delay to allow cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Fetch fresh data
      const response = await cacheHook.fetchGameHistory(filters);
      setGameHistory(response.games || []);
      setStatistics(response.statistics || null);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      setHasNextPage(response.pagination ? response.pagination.page < response.pagination.totalPages : false);
    } catch (error) {
      console.error('Refresh error:', error);
      throw error;
    }
  }, [cacheHook, forceCleanup, filters]);

  return {
    games: optimizedGames,
    statistics,
    pagination,
    loading: cacheHook.loading,
    error: cacheHook.error?.message || null,
    hasNextPage,
    memoryUsage,
    loadMore,
    refresh,
    clearCache: forceCleanup,
    forceCleanup
  };
};

// Memory monitoring hook for development
export const useMemoryMonitoring = () => {
  const [memoryInfo, setMemoryInfo] = useState<FormattedMemoryInfo | null>(null);
  
  useEffect(() => {
    const updateMemoryInfo = async () => {
      const performanceWithMemory = performance as PerformanceWithMemory;
      if ('memory' in performanceWithMemory && performanceWithMemory.memory) {
        const memory = performanceWithMemory.memory;
        setMemoryInfo({
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
          timestamp: new Date().toISOString()
        });
      }
    };
    
    // Update every 30 seconds
    const interval = setInterval(updateMemoryInfo, 30000);
    updateMemoryInfo(); // Initial update
    
    return () => clearInterval(interval);
  }, []);
  
  return memoryInfo;
};

// Higher-order component for automatic memory cleanup
export const withMemoryCleanup = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return (props: P) => {
    const componentRef = useRef<object>({});
    
    useEffect(() => {
      const cleanup = componentCleanupMap.get(componentRef.current);
      return cleanup;
    }, []);
    
    return React.createElement(WrappedComponent, props);
  };
};

export default useMemoryOptimizedGameHistory;