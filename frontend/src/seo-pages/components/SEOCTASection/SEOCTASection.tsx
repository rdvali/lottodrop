/**
 * SEO CTA Section Component
 *
 * Call-to-action section for SEO pages.
 * ISOLATED: No dependencies on game logic.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import styles from './SEOCTASection.module.css'

interface SEOCTASectionProps {
  title: string
  description?: string
  primaryCTA: {
    text: string
    href: string
    external?: boolean
  }
  secondaryCTA?: {
    text: string
    href: string
    external?: boolean
  }
  variant?: 'default' | 'highlight'
}

export const SEOCTASection: React.FC<SEOCTASectionProps> = ({
  title,
  description,
  primaryCTA,
  secondaryCTA,
  variant = 'default'
}) => {
  const renderButton = (
    cta: { text: string; href: string; external?: boolean },
    isPrimary: boolean
  ) => {
    const className = isPrimary ? styles.primaryButton : styles.secondaryButton

    if (cta.external) {
      return (
        <a
          href={cta.href}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cta.text}
        </a>
      )
    }

    return (
      <Link to={cta.href} className={className}>
        {cta.text}
      </Link>
    )
  }

  return (
    <section className={`${styles.section} ${styles[variant]}`}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}

        <div className={styles.buttons}>
          {renderButton(primaryCTA, true)}
          {secondaryCTA && renderButton(secondaryCTA, false)}
        </div>
      </div>

      <div className={styles.decoration}>
        <div className={styles.glow} />
      </div>
    </section>
  )
}

export default SEOCTASection
