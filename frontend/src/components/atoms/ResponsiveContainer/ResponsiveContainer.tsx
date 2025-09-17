/**
 * ResponsiveContainer Component
 * Provides responsive container with breakpoint-aware sizing
 */

import React from 'react';
import { clsx } from 'clsx';
import { useResponsiveValue } from '../../../hooks/useResponsive';
import { containerSizes } from '../../../utils/responsive';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: keyof typeof containerSizes | 'none' | 'full';
  padding?: {
    base?: string;
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  };
  margin?: {
    base?: string;
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  };
  className?: string;
  centered?: boolean;
  fluid?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'xl',
  padding = { base: '1rem', md: '1.5rem', lg: '2rem' },
  margin = { base: '0 auto' },
  className,
  centered = true,
  fluid = false
}) => {
  const responsivePadding = useResponsiveValue(padding);
  const responsiveMargin = useResponsiveValue(margin);

  const containerClasses = clsx(
    'responsive-container',
    {
      'w-full': fluid,
      'mx-auto': centered
    },
    className
  );

  const getMaxWidth = (): string => {
    if (maxWidth === 'none') return 'none';
    if (maxWidth === 'full') return '100%';
    return containerSizes[maxWidth];
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: fluid ? '100%' : getMaxWidth(),
    padding: responsivePadding,
    margin: responsiveMargin,
    width: '100%'
  };

  return (
    <div className={containerClasses} style={containerStyle}>
      {children}
    </div>
  );
};