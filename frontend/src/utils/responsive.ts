/**
 * Responsive Design Utilities for LottoDrop
 * Mobile-first responsive breakpoints and utilities
 */

// Breakpoint definitions (mobile-first)
export const breakpoints = {
  xs: '320px',    // Extra small devices (phones)
  sm: '480px',    // Small devices (phones)
  md: '768px',    // Medium devices (tablets)
  lg: '1024px',   // Large devices (laptops)
  xl: '1280px',   // Extra large devices (desktops)
  '2xl': '1536px' // 2X large devices (large desktops)
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,
  
  // Max width queries for specific ranges
  'max-sm': `(max-width: ${parseInt(breakpoints.md) - 1}px)`,
  'max-md': `(max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  'max-lg': `(max-width: ${parseInt(breakpoints.xl) - 1}px)`,
  
  // Device-specific queries
  mobile: `(max-width: ${parseInt(breakpoints.md) - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}) and (max-width: ${parseInt(breakpoints.xl) - 1}px)`,
  desktop: `(min-width: ${breakpoints.xl})`
} as const;

// Hook for responsive values
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint | 'base', T>>): T {
  const getCurrentBreakpoint = (): Breakpoint | 'base' => {
    if (typeof window === 'undefined') return 'base';
    
    const width = window.innerWidth;
    
    if (width >= parseInt(breakpoints['2xl'])) return '2xl';
    if (width >= parseInt(breakpoints.xl)) return 'xl';
    if (width >= parseInt(breakpoints.lg)) return 'lg';
    if (width >= parseInt(breakpoints.md)) return 'md';
    if (width >= parseInt(breakpoints.sm)) return 'sm';
    if (width >= parseInt(breakpoints.xs)) return 'xs';
    
    return 'base';
  };

  const currentBreakpoint = getCurrentBreakpoint();
  
  // Find the most appropriate value for current breakpoint
  const breakpointOrder: (Breakpoint | 'base')[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs', 'base'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  // Fallback to first available value
  return values[Object.keys(values)[0] as keyof typeof values]!;
}

// Media query matcher hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);
  
  return matches;
}

// Responsive grid utilities
export const gridConfig = {
  columns: {
    base: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6,
    '2xl': 8
  },
  gap: {
    base: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem'
  }
};

// Container max widths
export const containerSizes = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Touch-friendly sizing
export const touchTargets = {
  minSize: '44px',      // Minimum touch target size
  comfortableSize: '48px', // Comfortable touch target size
  spacing: '8px'        // Minimum spacing between touch targets
};

// Viewport detection utilities
export const getViewportType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  
  if (width < parseInt(breakpoints.md)) return 'mobile';
  if (width < parseInt(breakpoints.xl)) return 'tablet';
  return 'desktop';
};

export const isMobileViewport = (): boolean => getViewportType() === 'mobile';
export const isTabletViewport = (): boolean => getViewportType() === 'tablet';
export const isDesktopViewport = (): boolean => getViewportType() === 'desktop';

// Responsive spacing scale
export const spacing = {
  xs: {
    base: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem'
  },
  sm: {
    base: '0.5rem',
    sm: '0.75rem',
    md: '1rem'
  },
  md: {
    base: '1rem',
    sm: '1.5rem',
    md: '2rem'
  },
  lg: {
    base: '1.5rem',
    sm: '2rem',
    md: '3rem'
  },
  xl: {
    base: '2rem',
    sm: '3rem',
    md: '4rem'
  }
};

// Responsive font sizes
export const fontSizes = {
  xs: {
    base: '0.75rem',
    sm: '0.75rem',
    md: '0.875rem'
  },
  sm: {
    base: '0.875rem',
    sm: '0.875rem',
    md: '1rem'
  },
  base: {
    base: '1rem',
    sm: '1rem',
    md: '1.125rem'
  },
  lg: {
    base: '1.125rem',
    sm: '1.25rem',
    md: '1.5rem'
  },
  xl: {
    base: '1.25rem',
    sm: '1.5rem',
    md: '2rem'
  },
  '2xl': {
    base: '1.5rem',
    sm: '2rem',
    md: '3rem'
  }
};

// Import React for hooks
import React from 'react';