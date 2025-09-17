/**
 * LiveRegion Component
 * Provides screen reader announcements for dynamic content
 */

import React from 'react';
import { useLiveRegion } from '../../../hooks/useAccessibility';

export interface LiveRegionProps {
  priority?: 'polite' | 'assertive';
  message?: string;
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  priority = 'polite',
  message,
  className = 'sr-only'
}) => {
  const { regionRef, liveRegionProps } = useLiveRegion(priority);

  return (
    <div
      ref={regionRef}
      {...liveRegionProps}
      className={className}
    >
      {message || liveRegionProps.children}
    </div>
  );
};

// Hook moved to utils/liveRegionUtils.ts to fix fast refresh