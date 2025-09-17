/**
 * SkipNavigation Component
 * Provides skip links for keyboard navigation accessibility
 */

import React from 'react';
import { useSkipNavigation } from '../../../hooks/useAccessibility';

export interface SkipNavigationProps {
  links?: Array<{
    href: string;
    label: string;
  }>;
}

const defaultLinks = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#game-area', label: 'Skip to game area' },
  { href: '#footer', label: 'Skip to footer' }
];

export const SkipNavigation: React.FC<SkipNavigationProps> = ({
  links = defaultLinks
}) => {
  useSkipNavigation();

  return (
    <div className="absolute -top-[9999px] -left-[9999px] z-[9999]">
      {links.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="absolute -top-[9999px] -left-[9999px] px-4 py-2 bg-black text-white no-underline rounded text-sm font-semibold border-2 border-white shadow-md transition-all duration-200 focus:fixed focus:top-4 focus:left-4 focus:outline-none hover:bg-gray-800 hover:underline"
        >
          {label}
        </a>
      ))}
    </div>
  );
};