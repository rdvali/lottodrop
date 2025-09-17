import { type ComponentType, Suspense, useEffect, useRef, useState } from 'react';
import { ComponentLoader } from '../components/atoms/ComponentLoader';

// Higher-order component for lazy loading with error boundary
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  fallbackHeight?: string
) => {
  return (props: P) => (
    <Suspense fallback={<ComponentLoader height={fallbackHeight} />}>
      <Component {...props} />
    </Suspense>
  );
};

// Preload function to warm up components before they're needed
export const preloadGameHistoryComponents = () => {
  // Preload in order of likely usage
  const preloadPromises = [
    import('../components/profile/GameHistoryStats'),
    import('../components/profile/GameHistoryFilters'),
    import('../components/profile/VirtualizedGameHistory'),
    import('../components/profile/GameHistoryExport')
  ];
  
  return Promise.allSettled(preloadPromises);
};

// Hook for progressive loading based on intersection
export const useProgressiveLoading = (threshold = 0.1) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return { ref, shouldLoad };
};