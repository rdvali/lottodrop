/**
 * SEO Content Section Component
 *
 * Displays long-form content with proper heading hierarchy.
 * ISOLATED: No dependencies on game logic.
 */

import React from 'react'
import styles from './SEOContentSection.module.css'

interface SEOContentSectionProps {
  title: string
  children: React.ReactNode
  id?: string
  className?: string
}

export const SEOContentSection: React.FC<SEOContentSectionProps> = ({
  title,
  children,
  id,
  className = ''
}) => {
  return (
    <section id={id} className={`${styles.section} ${className}`}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.content}>
        {children}
      </div>
    </section>
  )
}

export default SEOContentSection
