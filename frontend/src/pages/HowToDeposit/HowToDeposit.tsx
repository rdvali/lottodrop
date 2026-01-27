import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Button } from '@components/atoms'
import { SEO } from '@components/SEO'
import { useIsMobile } from '@hooks/useResponsive'
import { useModal } from '@hooks/useModal'
import { useNavigate } from 'react-router-dom'
import styles from './HowToDeposit.module.css'

// Simple SVG icons to avoid external dependencies
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const WalletIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const NetworkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
)

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const SearchCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LightBulbIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const DepositIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

interface Section {
  id: string
  title: string
  icon: React.ReactNode
  content: {
    overview: string
    steps: Array<{
      step: number
      title: string
      description: string
      tip?: string
    }>
  }
}

const HowToDeposit = () => {
  const [activeSection, setActiveSection] = useState<string>('getting-started')
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started')
  const isMobile = useIsMobile()
  const { openDepositModal } = useModal()
  const navigate = useNavigate()

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const sections: Section[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <WalletIcon className="w-6 h-6" />,
      content: {
        overview: 'Get started with crypto deposits in 4 simple steps. LottoDrop accepts USDT deposits across multiple blockchain networks.',
        steps: [
          {
            step: 1,
            title: 'Understand USDT',
            description: 'LottoDrop accepts USDT (Tether) stablecoin only. USDT is pegged to the US dollar, making it stable and predictable for gaming.',
            tip: '1 USDT = $1 USD, no price volatility'
          },
          {
            step: 2,
            title: 'Have a Crypto Wallet',
            description: 'You\'ll need a wallet with USDT on a supported network (TRC20, ERC20, or SPL). Make sure your wallet supports the network you want to use.',
            tip: 'Popular wallets: Trust Wallet, MetaMask, Phantom'
          },
          {
            step: 3,
            title: 'Check Network Fees',
            description: 'Each network has different transaction fees. TRC20 (TRON) and Solana SPL have the lowest fees, while Ethereum ERC20 has higher fees.',
            tip: 'See network comparison in the next section'
          },
          {
            step: 4,
            title: 'Access Deposit',
            description: 'Click the "Deposit" button in the header to open the deposit modal. You must be logged in to your LottoDrop account to deposit.',
            tip: 'You must be logged in to deposit'
          }
        ]
      }
    },
    {
      id: 'choose-network',
      title: 'Choose a Network',
      icon: <NetworkIcon className="w-6 h-6" />,
      content: {
        overview: 'Select the best network for your deposit based on fees, speed, and your wallet compatibility.',
        steps: [
          {
            step: 1,
            title: 'TRC20 (TRON)',
            description: 'Low fees (~$1), fast confirmations (1-3 minutes). TRC20 offers the best balance of cost and speed for most users.',
            tip: 'Recommended for most users'
          },
          {
            step: 2,
            title: 'ERC20 (Ethereum)',
            description: 'Higher fees ($5-20), reliable and widely supported (3-5 minutes). Use this if you already have USDT on Ethereum.',
            tip: 'Gas fees vary with network congestion'
          },
          {
            step: 3,
            title: 'SPL (Solana)',
            description: 'Extremely low fees (~$0.01), near-instant confirmations (<1 minute). Great for small deposits and fast transactions.',
            tip: 'Growing ecosystem, very efficient'
          }
        ]
      }
    },
    {
      id: 'make-deposit',
      title: 'Making a Deposit',
      icon: <SendIcon className="w-6 h-6" />,
      content: {
        overview: 'Follow these steps to complete your USDT deposit safely and securely.',
        steps: [
          {
            step: 1,
            title: 'Select Network & Amount',
            description: 'Choose your preferred network and enter the USDT amount you want to deposit. The minimum deposit amount varies by network.',
            tip: 'Minimum amounts vary by network'
          },
          {
            step: 2,
            title: 'Get Deposit Address',
            description: 'A unique deposit address and QR code will be displayed. This address is valid for 30 minutes. Copy it carefully or scan the QR code.',
            tip: 'Never share your deposit address publicly'
          },
          {
            step: 3,
            title: 'Send from Your Wallet',
            description: 'Copy the address or scan the QR code with your wallet. Send USDT on the CORRECT network matching your selected option.',
            tip: 'IMPORTANT: Sending on wrong network = lost funds'
          },
          {
            step: 4,
            title: 'Confirm Transaction',
            description: 'Approve the transaction in your wallet and pay the network fee. Double-check the address before confirming.',
            tip: 'Double-check the address before confirming'
          }
        ]
      }
    },
    {
      id: 'track-deposit',
      title: 'Track Your Deposit',
      icon: <SearchCheckIcon className="w-6 h-6" />,
      content: {
        overview: 'Monitor your deposit status and know when funds are credited to your account.',
        steps: [
          {
            step: 1,
            title: 'Watch Confirmations',
            description: 'The deposit modal shows real-time blockchain confirmations as they occur. The number of required confirmations varies by network.',
            tip: 'Required confirmations vary by network'
          },
          {
            step: 2,
            title: 'Status Updates',
            description: 'Track your deposit status: Pending → Confirming → Confirmed. You\'ll receive real-time updates via WebSocket.',
            tip: 'WebSocket provides real-time updates'
          },
          {
            step: 3,
            title: 'Automatic Credit',
            description: 'Once confirmed, funds are instantly added to your LottoDrop balance. No manual action is needed on your part.',
            tip: 'No manual action needed'
          },
          {
            step: 4,
            title: 'View History',
            description: 'All deposits are recorded in your Profile under transaction history. Keep records for your own bookkeeping.',
            tip: 'Keep records for your own bookkeeping'
          }
        ]
      }
    }
  ]

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId]
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      })
    }
    setActiveSection(sectionId)
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  // Auto-expand first section on load
  useEffect(() => {
    if (!expandedSection) {
      setExpandedSection('getting-started')
    }
  }, [])

  return (
    <div className={styles.container}>
      {/* SEO Meta Tags */}
      <SEO
        title="How to Deposit"
        description="Fund your LottoDrop account with USDT cryptocurrency. Supports TRC20, ERC20, and Solana networks with instant balance updates."
        keywords="crypto deposit, USDT deposit, TRC20, ERC20, Solana, blockchain deposit, gaming wallet"
        url="https://lottodrop.net/how-to-deposit"
        type="article"
        breadcrumbs={[
          { name: 'Home', url: 'https://lottodrop.net/' },
          { name: 'How to Deposit', url: 'https://lottodrop.net/how-to-deposit' }
        ]}
        faqItems={[
          { question: 'What cryptocurrency does LottoDrop accept?', answer: 'LottoDrop accepts USDT (Tether) stablecoin only. USDT is pegged to the US dollar, making it stable and predictable for gaming.' },
          { question: 'Which networks are supported for deposits?', answer: 'We support TRC20 (TRON), ERC20 (Ethereum), and SPL (Solana) networks for USDT deposits.' },
          { question: 'Which network has the lowest fees?', answer: 'TRC20 (TRON) and Solana SPL have the lowest fees (~$0.01-$1), while Ethereum ERC20 has higher fees ($5-20).' },
          { question: 'How long do deposits take?', answer: 'Deposit times vary by network: Solana (<1 minute), TRC20 (1-3 minutes), ERC20 (3-5 minutes). Funds are credited instantly after confirmation.' }
        ]}
      />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={styles.hero}
      >
        <Card className={styles.heroCard}>
          <div className={styles.heroContent}>
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className={styles.heroTitle}
            >
              How to Deposit
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className={styles.heroSubtitle}
            >
              Add funds to your account using USDT cryptocurrency across multiple blockchain networks
            </motion.p>

            {/* Quick Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className={styles.quickNav}
            >
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => scrollToSection(section.id)}
                  className={styles.navButton}
                >
                  <span className={styles.navIcon}>{section.icon}</span>
                  {!isMobile && <span>{section.title}</span>}
                </Button>
              ))}
            </motion.div>
          </div>
        </Card>
      </motion.div>

      {/* Progress Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className={styles.progressContainer}
      >
        <div className={styles.progressBar}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: "0%" }}
            animate={{
              width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%`
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <span className={styles.progressText}>
          {sections.findIndex(s => s.id === activeSection) + 1} of {sections.length}
        </span>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
        className={styles.content}
      >
        {sections.map((section, sectionIndex) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            ref={(el: HTMLDivElement | null) => {
              if (el) sectionRefs.current[section.id] = el
            }}
            className={styles.section}
          >
            <Card className={styles.sectionCard}>
              {/* Section Header */}
              <div
                className={styles.sectionHeader}
                onClick={() => toggleSection(section.id)}
              >
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}>
                    {section.icon}
                  </div>
                  <div>
                    <h2 className={styles.sectionHeading}>
                      {section.title}
                    </h2>
                    <p className={styles.sectionOverview}>
                      {section.content.overview}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={styles.expandIcon}
                >
                  <ChevronDownIcon className="w-6 h-6" />
                </motion.div>
              </div>

              {/* Section Content */}
              <AnimatePresence>
                {expandedSection === section.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={styles.sectionContent}
                  >
                    {/* Steps */}
                    <div className={styles.stepsContainer}>
                      {section.content.steps.map((step, stepIndex) => (
                        <motion.div
                          key={step.step}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: stepIndex * 0.1 }}
                          className={styles.step}
                        >
                          <div className={styles.stepNumber}>
                            {step.step}
                          </div>
                          <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>
                              {step.title}
                            </h3>
                            <p className={styles.stepDescription}>
                              {step.description}
                            </p>
                            {step.tip && (
                              <div className={styles.stepTip}>
                                <LightBulbIcon className="w-4 h-4" />
                                <span>{step.tip}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Next Section Button */}
                    {sectionIndex < sections.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                        className={styles.nextSection}
                      >
                        <Button
                          variant="primary"
                          onClick={() => {
                            const nextSection = sections[sectionIndex + 1]
                            scrollToSection(nextSection.id)
                            setExpandedSection(nextSection.id)
                          }}
                          className={styles.nextButton}
                        >
                          Next: {sections[sectionIndex + 1].title}
                          <ChevronDownIcon className="w-4 h-4 ml-2" />
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className={styles.cta}
      >
        <Card className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>
              Ready to Deposit?
            </h2>
            <p className={styles.ctaDescription}>
              Add funds to your account and join the action. Your balance updates instantly upon confirmation.
            </p>
            <div className={styles.ctaButtons}>
              <Button
                variant="primary"
                size="lg"
                onClick={openDepositModal}
                className={styles.ctaButton}
              >
                <DepositIcon className="w-5 h-5 mr-2" />
                Deposit Now
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate('/profile')}
                className={styles.ctaButton}
              >
                View Profile
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

export default HowToDeposit
