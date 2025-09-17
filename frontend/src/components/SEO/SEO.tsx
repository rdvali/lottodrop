import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  author?: string
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
}

const DEFAULT_TITLE = 'LottoDrop - Real-Time Lottery Gaming Platform'
const DEFAULT_DESCRIPTION = 'Join exciting lottery games with instant payouts and provably fair results. Experience the thrill of real-time gaming with LottoDrop.'
const DEFAULT_KEYWORDS = 'lottery, gaming, real-time, crypto, blockchain, instant payout, provably fair, online gaming, lotto'
const DEFAULT_IMAGE = '/og-image.png'
const SITE_URL = import.meta.env.VITE_APP_URL || 'https://lottodrop.com'

export const SEO = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url = SITE_URL,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = []
}: SEOProps) => {
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | LottoDrop`
  const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LottoDrop',
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '2847'
    }
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author || 'LottoDrop Team'} />
      <link rel="canonical" href={url} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="LottoDrop" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:site" content="@lottodrop" />
      <meta name="twitter:creator" content="@lottodrop" />

      {/* Article Specific Tags */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="LottoDrop" />
      <meta name="application-name" content="LottoDrop" />
      <meta name="msapplication-TileColor" content="#9D4EDD" />
      <meta name="theme-color" content="#1A1A2E" />

      {/* Performance Hints */}
      <link rel="dns-prefetch" href={SITE_URL} />
      <link rel="preconnect" href={SITE_URL} />
      {import.meta.env.VITE_API_URL && (
        <>
          <link rel="dns-prefetch" href={import.meta.env.VITE_API_URL} />
          <link rel="preconnect" href={import.meta.env.VITE_API_URL} />
        </>
      )}

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  )
}

export default SEO