/**
 * SEO Layout Component
 *
 * Wrapper component for all SEO pages providing consistent layout and styling.
 * ISOLATED: No dependencies on game logic or existing page components.
 */

import React from 'react'
import styles from './SEOLayout.module.css'

interface SEOLayoutProps {
  children: React.ReactNode
  className?: string
}

export const SEOLayout: React.FC<SEOLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`${styles.seoLayout} ${className}`}>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}

export default SEOLayout
