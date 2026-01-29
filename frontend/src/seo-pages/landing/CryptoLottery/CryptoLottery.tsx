/**
 * Crypto Lottery Landing Page
 *
 * Target Keyword: "crypto lottery" (12,100 searches/month)
 * ISOLATED: No dependencies on game logic, WebSockets, or payments.
 */

import React from 'react'
import { Helmet } from 'react-helmet-async'
import {
  SEOLayout,
  SEOHero,
  SEOFeatureGrid,
  SEOContentSection,
  SEOFAQSection,
  SEOCTASection,
  SEORelatedLinks
} from '../../components'
import type { FAQItem } from '../../components'

// Page SEO Configuration
const PAGE_SEO = {
  title: 'Crypto Lottery - Play & Win USDT at LottoDrop',
  description: 'Play crypto lottery games with instant USDT payouts and provably fair results. Join thousands of players winning at LottoDrop - the most trusted crypto lottery platform.',
  keywords: 'crypto lottery, cryptocurrency lottery, bitcoin lottery, USDT lottery, blockchain lottery, provably fair lottery, instant payout lottery, online crypto lottery',
  url: 'https://lottodrop.net/crypto-lottery'
}

// Features Data
const FEATURES = [
  {
    icon: '⚡',
    title: 'Instant Payouts',
    description: 'Win and withdraw your crypto instantly. No waiting periods, no delays. Your winnings are sent directly to your wallet within minutes.'
  },
  {
    icon: '🔒',
    title: 'Provably Fair',
    description: 'Every draw is verifiable on the blockchain using VRF technology. You can independently verify that all results are truly random and fair.'
  },
  {
    icon: '💰',
    title: 'USDT Stablecoin Gaming',
    description: 'Deposit and win using USDT across supported blockchain networks. Stable value means no price volatility — your balance stays consistent.'
  },
  {
    icon: '🎮',
    title: 'Real-Time Gaming',
    description: 'Experience the thrill of live lottery draws with real-time updates. Watch as winners are selected in front of your eyes.'
  },
  {
    icon: '🌍',
    title: 'Global Access',
    description: 'Play from anywhere in the world. Crypto lottery removes traditional barriers, making gaming accessible to everyone.'
  },
  {
    icon: '📱',
    title: 'Mobile Optimized',
    description: 'Play on any device with our fully responsive platform. Desktop, tablet, or mobile - the experience is always seamless.'
  }
]

// FAQ Data
const FAQS: FAQItem[] = [
  {
    question: 'What is crypto lottery?',
    answer: 'Crypto lottery is an online lottery game where you can buy tickets and win prizes using cryptocurrency. Unlike traditional lotteries, crypto lotteries offer instant payouts, provably fair results, and global accessibility. At LottoDrop, you play using USDT for stable-value gaming.'
  },
  {
    question: 'Is crypto lottery legal?',
    answer: 'The legality of crypto lottery varies by jurisdiction. In most countries, crypto lottery operates in a legal gray area as cryptocurrency gambling regulations are still evolving. Always check your local laws before playing. LottoDrop is committed to responsible gaming practices.'
  },
  {
    question: 'How does provably fair work?',
    answer: 'Provably fair technology uses cryptographic algorithms to ensure lottery results are truly random and cannot be manipulated. At LottoDrop, we use Verifiable Random Functions (VRF) that allow anyone to verify that each draw was fair by checking the blockchain.'
  },
  {
    question: 'What cryptocurrency does LottoDrop use?',
    answer: 'LottoDrop operates with USDT across multiple supported blockchain networks such as TRC-20, ERC-20, and Solana. USDT is a stablecoin pegged 1:1 to the US dollar, providing price stability, low transaction fees, and fast confirmations.'
  },
  {
    question: 'How fast are crypto lottery payouts?',
    answer: 'Unlike traditional lotteries that can take weeks to pay out, crypto lottery winnings at LottoDrop are instant. Once you win, your prizes are automatically credited to your account and can be withdrawn immediately.'
  },
  {
    question: 'What is the minimum deposit?',
    answer: 'The minimum deposit at LottoDrop is just $10 USDT equivalent. This low barrier to entry makes crypto lottery accessible to players of all budgets.'
  },
  {
    question: 'How do I withdraw my winnings?',
    answer: 'Withdrawing is simple. Go to your profile, click withdraw, enter the amount and your crypto wallet address. Withdrawals are processed instantly and you\'ll receive your funds within minutes depending on blockchain confirmation times.'
  },
  {
    question: 'Is crypto lottery safe?',
    answer: 'Yes, when playing on reputable platforms like LottoDrop. We use industry-standard security including SSL encryption, secure wallets, and provably fair algorithms. Your funds and personal information are protected at all times.'
  },
  {
    question: 'What are the odds of winning?',
    answer: 'Odds vary by game type at LottoDrop. Our real-time lottery games typically have better odds than traditional lotteries since they\'re based on smaller player pools. Check each room for specific odds and prize information.'
  },
  {
    question: 'Can I play crypto lottery on mobile?',
    answer: 'Absolutely! LottoDrop is fully optimized for mobile devices. You can play, deposit, and withdraw from your smartphone or tablet with the same great experience as desktop.'
  }
]

// Related Links
const RELATED_LINKS = [
  {
    title: 'Bitcoin Lottery',
    description: 'Learn about Bitcoin lottery',
    href: '/bitcoin-lottery',
    icon: '₿'
  },
  {
    title: 'USDT Lottery',
    description: 'Stable coin lottery gaming',
    href: '/usdt-lottery',
    icon: '💵'
  },
  {
    title: 'Provably Fair',
    description: 'Learn how we ensure fairness',
    href: '/provably-fair',
    icon: '🔒'
  },
  {
    title: 'How to Play',
    description: 'Step-by-step beginner guide',
    href: '/how-to-play',
    icon: '📖'
  }
]

// Structured Data
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: PAGE_SEO.title,
  description: PAGE_SEO.description,
  url: PAGE_SEO.url,
  mainEntity: {
    '@type': 'WebApplication',
    name: 'LottoDrop Crypto Lottery',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  }
}

const breadcrumbData = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://lottodrop.net/'
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Crypto Lottery',
      item: PAGE_SEO.url
    }
  ]
}

export const CryptoLottery: React.FC = () => {
  return (
    <SEOLayout>
      <Helmet>
        <title>{PAGE_SEO.title}</title>
        <meta name="description" content={PAGE_SEO.description} />
        <meta name="keywords" content={PAGE_SEO.keywords} />
        <link rel="canonical" href={PAGE_SEO.url} />

        {/* Open Graph */}
        <meta property="og:title" content={PAGE_SEO.title} />
        <meta property="og:description" content={PAGE_SEO.description} />
        <meta property="og:url" content={PAGE_SEO.url} />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_SEO.title} />
        <meta name="twitter:description" content={PAGE_SEO.description} />
        <meta name="twitter:image" content="https://lottodrop.net/twitter-card.svg" />

        {/* Social Image */}
        <meta property="og:image" content="https://lottodrop.net/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      </Helmet>

      {/* Hero Section */}
      <SEOHero
        title="Crypto Lottery - Play & Win USDT at LottoDrop"
        subtitle="Join thousands of players winning USDT with instant payouts and provably fair results."
        description="Experience the future of lottery gaming with blockchain technology. Fair, fast, and secure crypto lottery at your fingertips."
        ctaButtons={[
          { text: 'Start Playing Now', href: '/', variant: 'primary' },
          { text: 'How It Works', href: '/how-to-play', variant: 'secondary' }
        ]}
      />

      {/* What is Crypto Lottery Section */}
      <SEOContentSection title="What is Crypto Lottery?">
        <p>
          <strong>Crypto lottery</strong> is a revolutionary form of online lottery that uses
          cryptocurrency for buying tickets and receiving prizes. Unlike traditional lotteries
          that rely on fiat currencies and centralized systems, crypto lottery leverages
          blockchain technology to provide transparent, provably fair, and instant gaming experiences.
        </p>
        <p>
          At LottoDrop, we've built one of the most trusted crypto lottery platforms in the
          industry. Our real-time lottery games allow you to participate in exciting draws
          using <strong>USDT</strong>, the most popular stablecoin for crypto gaming,
          across multiple supported blockchain networks.
        </p>
        <h3>How Crypto Lottery Works</h3>
        <p>
          Playing crypto lottery is simple. First, you deposit cryptocurrency into your
          LottoDrop account. Then, you join a lottery room and purchase your ticket.
          When the countdown ends, our provably fair system selects a winner using
          Verifiable Random Functions (VRF) that can be verified on the blockchain.
        </p>
        <p>
          Winners receive their prizes instantly - no waiting weeks like traditional
          lotteries. Your winnings are credited to your account immediately and can
          be withdrawn to your personal wallet within minutes.
        </p>
        <h3>Why Choose Crypto Lottery Over Traditional Lottery?</h3>
        <ul>
          <li><strong>Instant Payouts:</strong> Traditional lotteries can take weeks to pay. Crypto lottery pays in minutes.</li>
          <li><strong>Better Odds:</strong> Smaller player pools mean better chances of winning.</li>
          <li><strong>Provably Fair:</strong> Every result can be verified on the blockchain.</li>
          <li><strong>Global Access:</strong> Play from anywhere without geographic restrictions.</li>
          <li><strong>Lower Fees:</strong> Cryptocurrency transactions have minimal fees compared to banks.</li>
          <li><strong>Privacy:</strong> Play with enhanced privacy that traditional lotteries can't offer.</li>
        </ul>
      </SEOContentSection>

      {/* Crypto Lottery vs Traditional Lottery */}
      <SEOContentSection title="Crypto Lottery vs Traditional Lottery: A Comparison">
        <p>
          The differences between crypto lottery and traditional lottery go far beyond the
          currency used. They represent two fundamentally different approaches to lottery
          gaming, built on different technologies and operating under different principles.
        </p>
        <h3>Trust Model</h3>
        <p>
          Traditional lotteries require you to trust a centralized operator. You buy a ticket,
          a draw happens behind closed doors, and a winner is announced. You have no way to
          independently verify that the draw was conducted fairly. Crypto lottery replaces
          this trust with mathematics. Using Verifiable Random Functions (VRF), every draw
          at LottoDrop produces a cryptographic proof that anyone can check. The result is
          verifiable, not just claimed.
        </p>
        <h3>Payout Speed</h3>
        <p>
          Traditional lottery winners often wait days, weeks, or even months to receive their
          prizes, especially for larger amounts. Crypto lottery eliminates this entirely. At
          LottoDrop, winnings are credited to your account the moment the draw completes.
          Withdrawals to your personal wallet take just minutes on the blockchain.
        </p>
        <h3>Accessibility</h3>
        <p>
          National lotteries are restricted by geography. You must be in a specific country
          or state to participate, and you typically need a bank account or physical ticket
          purchase point. Crypto lottery is borderless. Anyone with a crypto wallet and an
          internet connection can play at LottoDrop, regardless of where they are in the world.
        </p>
        <h3>Odds and Prize Pools</h3>
        <p>
          National lotteries like Powerball or EuroMillions attract millions of entries per draw,
          making the odds of winning extremely low. Crypto lottery platforms like LottoDrop
          operate with smaller player pools per room. This means your odds of winning are
          substantially better. Each room clearly displays the number of players and prize pool,
          so you always know your chances before entering.
        </p>
        <h3>Fee Structure</h3>
        <p>
          Traditional lotteries take a significant cut from ticket sales for administration,
          taxes, and profit. Crypto lottery platforms have lower overhead since there are no
          banking intermediaries, physical infrastructure, or government taxation layers between
          you and your winnings. This typically means a higher percentage of ticket sales goes
          directly into the prize pool.
        </p>
      </SEOContentSection>

      {/* Features Section */}
      <SEOFeatureGrid
        title="Why Play Crypto Lottery at LottoDrop?"
        subtitle="Discover what makes LottoDrop the preferred choice for crypto lottery enthusiasts worldwide."
        features={FEATURES}
        columns={3}
      />

      {/* How to Play Section */}
      <SEOContentSection title="How to Play Crypto Lottery at LottoDrop">
        <p>
          Getting started with crypto lottery at LottoDrop is straightforward.
          Follow these simple steps to begin your winning journey:
        </p>
        <h3>Step 1: Create Your Account</h3>
        <p>
          Sign up for a free LottoDrop account. The registration process takes
          less than a minute and requires only basic information to get started.
        </p>
        <h3>Step 2: Deposit Cryptocurrency</h3>
        <p>
          Fund your account using USDT on a supported network such as TRC-20,
          ERC-20, or Solana. The minimum deposit is just $10, making it
          accessible for everyone.
        </p>
        <h3>Step 3: Join a Lottery Room</h3>
        <p>
          Browse our available lottery rooms and choose one that matches your
          budget and preferred prize pool. Each room shows the entry fee,
          number of players, and countdown timer.
        </p>
        <h3>Step 4: Win & Withdraw</h3>
        <p>
          If you win, your prize is instantly credited to your account.
          Withdraw your winnings anytime to your personal crypto wallet
          with no minimum withdrawal requirements.
        </p>
      </SEOContentSection>

      {/* FAQ Section */}
      <SEOFAQSection
        title="Crypto Lottery FAQ"
        subtitle="Find answers to common questions about crypto lottery and playing at LottoDrop."
        faqs={FAQS}
      />

      {/* CTA Section */}
      <SEOCTASection
        title="Ready to Play Crypto Lottery?"
        description="Join thousands of winners at LottoDrop. Start playing with as little as $10 and experience the thrill of instant crypto lottery."
        primaryCTA={{ text: 'Start Playing Now', href: '/' }}
        secondaryCTA={{ text: 'Learn More', href: '/how-to-play' }}
        variant="highlight"
      />

      {/* Related Links */}
      <SEORelatedLinks
        title="Explore More"
        links={RELATED_LINKS}
      />
    </SEOLayout>
  )
}

export default CryptoLottery
