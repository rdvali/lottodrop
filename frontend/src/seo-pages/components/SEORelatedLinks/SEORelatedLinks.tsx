/**
 * SEO Related Links Component
 *
 * Internal linking section for SEO pages.
 * ISOLATED: No dependencies on game logic.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import styles from './SEORelatedLinks.module.css'

interface RelatedLink {
  title: string
  description: string
  href: string
  icon?: string
}

interface SEORelatedLinksProps {
  title?: string
  links: RelatedLink[]
}

export const SEORelatedLinks: React.FC<SEORelatedLinksProps> = ({
  title = 'Related Topics',
  links
}) => {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.grid}>
        {links.map((link, index) => (
          <Link key={index} to={link.href} className={styles.card}>
            {link.icon && <span className={styles.icon}>{link.icon}</span>}
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{link.title}</h3>
              <p className={styles.cardDescription}>{link.description}</p>
            </div>
            <span className={styles.arrow}>→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default SEORelatedLinks
