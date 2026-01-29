/**
 * SEO Pages Module
 *
 * Entry point for all SEO-related pages and components.
 * ISOLATED: This module has no dependencies on game logic, WebSockets, or payments.
 *
 * All SEO pages are feature-flagged and disabled by default.
 * Enable in .env:
 *   VITE_SEO_PAGES_ENABLED=true
 *   VITE_SEO_LANDING_PAGES_ENABLED=true
 *   etc.
 */

// Feature Flags
export {
  SEO_FLAGS,
  isSEOFeatureEnabled,
  isAnySEOEnabled,
  getEnabledFeatures
} from './config/featureFlags'

// Components
export * from './components'

// Routes
export { SEORoutes } from './routes'

// Landing Pages
export * from './landing'

// Re-export for convenience
export { default as SEOFlags } from './config/featureFlags'
