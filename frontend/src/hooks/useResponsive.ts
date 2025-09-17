/**
 * Custom hooks for responsive design in LottoDrop
 */

import { useState, useEffect } from 'react';
import { 
  breakpoints, 
  mediaQueries, 
  getViewportType, 
  type Breakpoint 
} from '../utils/responsive';

// Hook to get current breakpoint
export function useBreakpoint(): Breakpoint | null {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint | null>(null);

  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth;
      
      if (width >= parseInt(breakpoints['2xl'])) return '2xl';
      if (width >= parseInt(breakpoints.xl)) return 'xl';
      if (width >= parseInt(breakpoints.lg)) return 'lg';
      if (width >= parseInt(breakpoints.md)) return 'md';
      if (width >= parseInt(breakpoints.sm)) return 'sm';
      return 'xs';
    };

    const updateBreakpoint = () => {
      setCurrentBreakpoint(getBreakpoint());
    };

    // Set initial breakpoint
    updateBreakpoint();

    // Listen for window resize
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return currentBreakpoint;
}

// Hook to check if current viewport matches a specific breakpoint
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const updateMatches = () => {
      setMatches(mediaQuery.matches);
    };

    // Set initial value
    updateMatches();

    // Listen for changes
    mediaQuery.addListener(updateMatches);
    return () => mediaQuery.removeListener(updateMatches);
  }, [query]);

  return matches;
}

// Convenience hooks for common viewport checks
export function useIsMobile(): boolean {
  return useMediaQuery(mediaQueries.mobile);
}

export function useIsTablet(): boolean {
  return useMediaQuery(mediaQueries.tablet);
}

export function useIsDesktop(): boolean {
  return useMediaQuery(mediaQueries.desktop);
}

// Hook for responsive values
export function useResponsiveValue<T>(values: {
  base?: T;
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): T {
  const breakpoint = useBreakpoint();
  
  // If no breakpoint yet (SSR), return base or first available value
  if (!breakpoint) {
    return values.base ?? values[Object.keys(values)[0] as keyof typeof values]!;
  }

  // Find the most appropriate value for current breakpoint
  const breakpointOrder: (keyof typeof values)[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs', 'base'];
  const currentIndex = breakpointOrder.findIndex(bp => bp === breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  // Fallback to base or first available value
  return values.base ?? values[Object.keys(values)[0] as keyof typeof values]!;
}

// Hook for viewport type
export function useViewportType(): 'mobile' | 'tablet' | 'desktop' {
  const [viewportType, setViewportType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateViewportType = () => {
      setViewportType(getViewportType());
    };

    // Set initial viewport type
    updateViewportType();

    // Listen for window resize
    window.addEventListener('resize', updateViewportType);
    return () => window.removeEventListener('resize', updateViewportType);
  }, []);

  return viewportType;
}

// Hook for container queries
export function useContainerQuery(containerRef: React.RefObject<HTMLElement>, query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      // Simple width-based container queries
      const width = element.offsetWidth;
      
      // Parse query (basic implementation)
      if (query.includes('min-width:')) {
        const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)?.[1] || '0');
        setMatches(width >= minWidth);
      } else if (query.includes('max-width:')) {
        const maxWidth = parseInt(query.match(/max-width:\s*(\d+)px/)?.[1] || '99999');
        setMatches(width <= maxWidth);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, query]);

  return matches;
}

// Hook for touch device detection
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        ('msMaxTouchPoints' in navigator && (navigator as Navigator & { msMaxTouchPoints: number }).msMaxTouchPoints > 0)
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
}

// Hook for orientation detection
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

// Hook for safe area insets (notch support)
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}