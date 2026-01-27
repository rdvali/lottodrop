import { Helmet } from 'react-helmet-async'

interface BreadcrumbItem {
  name: string
  url: string
}

interface FAQItem {
  question: string
  answer: string
}

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
  breadcrumbs?: BreadcrumbItem[]
  faqItems?: FAQItem[]
  noIndex?: boolean
  isHomePage?: boolean
}

const DEFAULT_TITLE = 'LottoDrop - Real-Time Lottery Gaming Platform'
const DEFAULT_DESCRIPTION = 'Join exciting lottery games with instant payouts and provably fair results. Experience the thrill of real-time gaming with LottoDrop.'
const DEFAULT_KEYWORDS = 'lottery, gaming, real-time, crypto, blockchain, instant payout, provably fair, online gaming, lotto'
const DEFAULT_IMAGE = '/og-image.svg'
const SITE_URL = import.meta.env.VITE_APP_URL || 'https://lottodrop.net'

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
  tags = [],
  breadcrumbs,
  faqItems,
  noIndex = false,
  isHomePage = false
}: SEOProps) => {
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | LottoDrop`
  const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`

  // WebApplication structured data (always included)
  const webApplicationSchema = {
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

  // Organization schema (for homepage)
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LottoDrop',
    url: SITE_URL,
    logo: `${SITE_URL}/drop-icon.svg`,
    sameAs: [
      'https://twitter.com/lottodrop'
    ]
  }

  // WebSite schema (for homepage)
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LottoDrop',
    url: SITE_URL
  }

  // BreadcrumbList schema (if breadcrumbs provided)
  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  } : null

  // FAQPage schema (if FAQ items provided)
  const faqSchema = faqItems && faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  } : null

  const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow'

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

      {/* Robots Meta Tags */}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />

      {/* Additional SEO Tags */}
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

      {/* Structured Data - WebApplication (always) */}
      <script type="application/ld+json">
        {JSON.stringify(webApplicationSchema)}
      </script>

      {/* Structured Data - Organization (homepage only) */}
      {isHomePage && (
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      )}

      {/* Structured Data - WebSite (homepage only) */}
      {isHomePage && (
        <script type="application/ld+json">
          {JSON.stringify(websiteSchema)}
        </script>
      )}

      {/* Structured Data - BreadcrumbList (if provided) */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}

      {/* Structured Data - FAQPage (if provided) */}
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  )
}

export default SEO
