/**
 * SEO Hero Component
 *
 * Hero section for SEO landing pages with H1, subheadline, and CTAs.
 * ISOLATED: No dependencies on game logic.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import styles from './SEOHero.module.css'

interface CTAButton {
  text: string
  href: string
  variant?: 'primary' | 'secondary'
  external?: boolean
}

interface SEOHeroProps {
  title: string
  subtitle: string
  description?: string
  ctaButtons?: CTAButton[]
  backgroundImage?: string
}

export const SEOHero: React.FC<SEOHeroProps> = ({
  title,
  subtitle,
  description,
  ctaButtons = [],
  backgroundImage
}) => {
  const renderCTA = (cta: CTAButton, index: number) => {
    const buttonClass = cta.variant === 'secondary' ? styles.ctaSecondary : styles.ctaPrimary

    if (cta.external) {
      return (
        <a
          key={index}
          href={cta.href}
          className={buttonClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cta.text}
        </a>
      )
    }

    return (
      <Link key={index} to={cta.href} className={buttonClass}>
        {cta.text}
      </Link>
    )
  }

  return (
    <section
      className={styles.hero}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {description && <p className={styles.description}>{description}</p>}

        {ctaButtons.length > 0 && (
          <div className={styles.ctaContainer}>
            {ctaButtons.map(renderCTA)}
          </div>
        )}
      </div>

      <div className={styles.decoration}>
        <div className={styles.glowOrb} />
      </div>
    </section>
  )
}

export default SEOHero
