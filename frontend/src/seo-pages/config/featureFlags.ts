/**
 * SEO Feature Flags
 *
 * Controls which SEO pages are enabled in the application.
 * All flags default to FALSE for production safety.
 *
 * ISOLATION: This file has no dependencies on game logic.
 * SAFETY: All flags must be explicitly set to 'true' to enable features.
 */

// Environment variable helpers
const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = import.meta.env[key]
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  return value === 'true' || value === true
}

/**
 * SEO Feature Flags Configuration
 *
 * Set these in your .env file:
 * VITE_SEO_PAGES_ENABLED=true
 * VITE_SEO_LANDING_PAGES_ENABLED=true
 * etc.
 */
export const SEO_FLAGS = {
  /** Master switch for all SEO pages */
  PAGES_ENABLED: getEnvBoolean('VITE_SEO_PAGES_ENABLED', false),

  /** Landing pages: /crypto-lottery, /bitcoin-lottery, etc. */
  LANDING_PAGES_ENABLED: getEnvBoolean('VITE_SEO_LANDING_PAGES_ENABLED', false),

  /** Trust pages: /about, /is-crypto-lottery-legal, etc. */
  TRUST_PAGES_ENABLED: getEnvBoolean('VITE_SEO_TRUST_PAGES_ENABLED', false),

  /** Guide pages: /guides/* */
  GUIDES_ENABLED: getEnvBoolean('VITE_SEO_GUIDES_ENABLED', false),

  /** Blog pages: /blog/* */
  BLOG_ENABLED: getEnvBoolean('VITE_SEO_BLOG_ENABLED', false),
} as const

/**
 * Check if a specific SEO feature is enabled
 * Requires both master switch AND specific feature to be enabled
 */
export const isSEOFeatureEnabled = (feature: keyof Omit<typeof SEO_FLAGS, 'PAGES_ENABLED'>): boolean => {
  // Master switch must be enabled
  if (!SEO_FLAGS.PAGES_ENABLED) {
    return false
  }

  return SEO_FLAGS[feature]
}

/**
 * Check if any SEO pages are enabled
 */
export const isAnySEOEnabled = (): boolean => {
  return SEO_FLAGS.PAGES_ENABLED && (
    SEO_FLAGS.LANDING_PAGES_ENABLED ||
    SEO_FLAGS.TRUST_PAGES_ENABLED ||
    SEO_FLAGS.GUIDES_ENABLED ||
    SEO_FLAGS.BLOG_ENABLED
  )
}

/**
 * Get all enabled SEO features (for debugging)
 */
export const getEnabledFeatures = (): string[] => {
  const enabled: string[] = []

  if (!SEO_FLAGS.PAGES_ENABLED) {
    return enabled
  }

  if (SEO_FLAGS.LANDING_PAGES_ENABLED) enabled.push('landing-pages')
  if (SEO_FLAGS.TRUST_PAGES_ENABLED) enabled.push('trust-pages')
  if (SEO_FLAGS.GUIDES_ENABLED) enabled.push('guides')
  if (SEO_FLAGS.BLOG_ENABLED) enabled.push('blog')

  return enabled
}

export default SEO_FLAGS
