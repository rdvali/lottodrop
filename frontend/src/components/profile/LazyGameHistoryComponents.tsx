import { lazy } from 'react';
import { Spinner } from '@components/atoms';

// Lazy load heavy components for better initial bundle size
export const LazyVirtualizedGameHistory = lazy(() => 
  import('./VirtualizedGameHistory').then(module => ({
    default: module.VirtualizedGameHistory
  }))
);

export const LazyGameHistoryStats = lazy(() => 
  import('./GameHistoryStats').then(module => ({
    default: module.GameHistoryStats
  }))
);

export const LazyGameHistoryFilters = lazy(() => 
  import('./GameHistoryFilters').then(module => ({
    default: module.GameHistoryFiltersComponent
  }))
);

export const LazyGameHistoryExport = lazy(() => 
  import('./GameHistoryExport').then(module => ({
    default: module.default
  }))
);

// Loading fallback component
const ComponentLoader = ({ height = '200px' }: { height?: string }) => (
  <div 
    className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
    style={{ height }}
  >
    <div className="flex flex-col items-center gap-2">
      <Spinner size="lg" />
      <span className="text-sm text-gray-500">Loading component...</span>
    </div>
  </div>
);

// Utility functions moved to utils/lazyLoadingUtils.ts to fix fast refresh

import { withLazyLoading, useProgressiveLoading } from '../../utils/lazyLoadingUtils';

// Preload function for better performance
export const preloadGameHistoryComponents = () => {
  // Preload lazy components
  // Note: preload is not available on LazyExoticComponent in React 18
  // Components will load when needed
};

// Pre-configured lazy components with appropriate loading states
export const GameHistoryStatsLazy = withLazyLoading(LazyGameHistoryStats, '150px');
export const GameHistoryFiltersLazy = withLazyLoading(LazyGameHistoryFilters, '120px');
export const VirtualizedGameHistoryLazy = withLazyLoading(LazyVirtualizedGameHistory, '400px');
export const GameHistoryExportLazy = withLazyLoading(LazyGameHistoryExport, '60px');

// Progressive loading wrapper component
interface ProgressiveLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  height?: string;
}

export const ProgressiveLoad: React.FC<ProgressiveLoadProps> = ({
  children,
  fallback,
  threshold = 0.1,
  height = '200px'
}) => {
  const { ref, shouldLoad } = useProgressiveLoading(threshold);

  return (
    <div ref={ref}>
      {shouldLoad ? (
        children
      ) : (
        fallback || <ComponentLoader height={height} />
      )}
    </div>
  );
};