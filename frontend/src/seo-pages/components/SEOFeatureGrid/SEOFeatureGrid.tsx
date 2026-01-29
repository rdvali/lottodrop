/**
 * SEO Feature Grid Component
 *
 * Displays feature cards in a responsive grid layout.
 * ISOLATED: No dependencies on game logic.
 */

import React from 'react'
import styles from './SEOFeatureGrid.module.css'

interface Feature {
  icon: string
  title: string
  description: string
}

interface SEOFeatureGridProps {
  title?: string
  subtitle?: string
  features: Feature[]
  columns?: 2 | 3 | 4
}

export const SEOFeatureGrid: React.FC<SEOFeatureGridProps> = ({
  title,
  subtitle,
  features,
  columns = 3
}) => {
  return (
    <section className={styles.section}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}

      <div className={`${styles.grid} ${styles[`columns${columns}`]}`}>
        {features.map((feature, index) => (
          <div key={index} className={styles.card}>
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>{feature.icon}</span>
            </div>
            <h3 className={styles.cardTitle}>{feature.title}</h3>
            <p className={styles.cardDescription}>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SEOFeatureGrid
