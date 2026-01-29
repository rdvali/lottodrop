/**
 * SEO Routes Component
 *
 * Conditionally renders SEO page routes based on feature flags.
 * ISOLATED: Only imports from seo-pages module.
 *
 * CONNECTED to App.tsx — Approved for integration at Stage 5.1.
 * Feature flags control visibility. All defaults are OFF.
 *
 * ROLLOUT STATUS:
 *   Phase 1 (Pilot): /crypto-lottery ONLY
 *   Phase 2 (Pending): /bitcoin-lottery, /usdt-lottery, /blockchain-lottery, /provably-fair
 */

import React, { lazy, Suspense } from 'react'
import { Route } from 'react-router-dom'
import { SEO_FLAGS, isSEOFeatureEnabled } from '../config/featureFlags'

// Lazy load SEO pages for code splitting — Pilot: CryptoLottery only
const CryptoLottery = lazy(() => import('../landing/CryptoLottery/CryptoLottery'))

// Phase 2 rollout — uncomment when approved:
// const BitcoinLottery = lazy(() => import('../landing/BitcoinLottery/BitcoinLottery'))
// const USDTLottery = lazy(() => import('../landing/USDTLottery/USDTLottery'))
// const BlockchainLottery = lazy(() => import('../landing/BlockchainLottery/BlockchainLottery'))
// const ProvablyFair = lazy(() => import('../landing/ProvablyFair/ProvablyFair'))

// Loading fallback for lazy-loaded pages
const SEOPageLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    color: '#a0aec0'
  }}>
    Loading...
  </div>
)

/**
 * SEO Routes Component
 *
 * Returns Route elements for all enabled SEO pages.
 * Must be used inside a <Routes> component.
 *
 * STATUS: ISOLATED - Not connected to main router.
 */
export const SEORoutes: React.FC = () => {
  // If master switch is off, return nothing
  if (!SEO_FLAGS.PAGES_ENABLED) {
    return null
  }

  return (
    <>
      {/* Landing Pages — Pilot: /crypto-lottery only */}
      {isSEOFeatureEnabled('LANDING_PAGES_ENABLED') && (
        <>
          <Route
            path="/crypto-lottery"
            element={
              <Suspense fallback={<SEOPageLoader />}>
                <CryptoLottery />
              </Suspense>
            }
          />
          {/* Phase 2 rollout — uncomment when approved:
          <Route
            path="/bitcoin-lottery"
            element={
              <Suspense fallback={<SEOPageLoader />}>
                <BitcoinLottery />
              </Suspense>
            }
          />
          <Route
            path="/usdt-lottery"
            element={
              <Suspense fallback={<SEOPageLoader />}>
                <USDTLottery />
              </Suspense>
            }
          />
          <Route
            path="/blockchain-lottery"
            element={
              <Suspense fallback={<SEOPageLoader />}>
                <BlockchainLottery />
              </Suspense>
            }
          />
          <Route
            path="/provably-fair"
            element={
              <Suspense fallback={<SEOPageLoader />}>
                <ProvablyFair />
              </Suspense>
            }
          />
          */}
        </>
      )}

      {/* Trust Pages */}
      {isSEOFeatureEnabled('TRUST_PAGES_ENABLED') && (
        <>
          {/* Future trust pages:
          <Route path="/about" element={...} />
          <Route path="/is-crypto-lottery-legal" element={...} />
          <Route path="/is-crypto-lottery-safe" element={...} />
          <Route path="/licensing" element={...} />
          */}
        </>
      )}

      {/* Guide Pages */}
      {isSEOFeatureEnabled('GUIDES_ENABLED') && (
        <>
          {/* Future guide pages:
          <Route path="/guides/crypto-lottery-beginners" element={...} />
          <Route path="/guides/provably-fair-explained" element={...} />
          <Route path="/guides/usdt-deposit-guide" element={...} />
          */}
        </>
      )}

      {/* Blog Pages */}
      {isSEOFeatureEnabled('BLOG_ENABLED') && (
        <>
          {/* Future blog pages:
          <Route path="/blog" element={...} />
          <Route path="/blog/:slug" element={...} />
          */}
        </>
      )}
    </>
  )
}

export default SEORoutes
