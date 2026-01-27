import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Button } from '@components/atoms'
// Simple SVG icons to avoid external dependencies
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m5-9v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
)

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const GiftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
)

const LightBulbIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)
import { useIsMobile } from '@hooks/useResponsive'
import styles from './HowToPlay.module.css'

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
    screenshot?: string
  }
}

const HowToPlay = () => {
  const [activeSection, setActiveSection] = useState<string>('quick-start')
  const [expandedSection, setExpandedSection] = useState<string | null>('quick-start')
  // Removed unused state: const [currentStep, setCurrentStep] = useState(0)
  const isMobile = useIsMobile()

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const sections: Section[] = [
    {
      id: 'quick-start',
      title: 'Quick Start',
      icon: <PlayIcon className="w-6 h-6" />,
      content: {
        overview: 'Get started with LottoDrop in just 4 simple steps. Perfect for first-time players who want to jump right into the action.',
        steps: [
          {
            step: 1,
            title: 'Browse Available Rooms',
            description: 'Visit the room list to see all active lottery rooms. Each room shows entry fee, prize pool, and current players.',
            tip: 'Look for rooms with fewer players for better odds!'
          },
          {
            step: 2,
            title: 'Join a Room',
            description: 'Click "Join Room" and pay the entry fee. Your payment goes directly into the prize pool.',
            tip: 'Make sure you have enough balance before joining.'
          },
          {
            step: 3,
            title: 'Wait for the Draw',
            description: 'Once minimum players join, a countdown starts. Sit back and watch the excitement build!',
            tip: 'The countdown gives everyone a fair chance to join.'
          },
          {
            step: 4,
            title: 'Watch Results',
            description: 'Our provably fair system selects winners randomly. Winners get their prizes instantly!',
            tip: 'Win or lose, you can immediately join another room.'
          }
        ],
        screenshot: '/screenshots/quick-start-demo.png'
      }
    },
    {
      id: 'join-room',
      title: 'How to Join a Room',
      icon: <ClockIcon className="w-6 h-6" />,
      content: {
        overview: 'Learn the details of joining lottery rooms, from choosing the right room to understanding entry requirements.',
        steps: [
          {
            step: 1,
            title: 'Check Room Details',
            description: 'Review entry fee, prize pool, player limits, and number of winners before joining.',
            tip: 'Higher entry fees usually mean bigger prizes but fewer players.'
          },
          {
            step: 2,
            title: 'Verify Your Balance',
            description: 'Ensure you have sufficient balance to cover the entry fee. You can add funds in your profile.',
            tip: 'Keep extra balance for multiple games!'
          },
          {
            step: 3,
            title: 'Click Join Room',
            description: 'Once you\'re ready, click the "Join Room" button. Your entry fee is immediately deducted.',
            tip: 'You can leave before the game starts for a full refund.'
          },
          {
            step: 4,
            title: 'Wait for Other Players',
            description: 'The room needs minimum players before starting. Watch the participant list grow!',
            tip: 'Invite friends to fill rooms faster!'
          }
        ],
        screenshot: '/screenshots/join-room-process.png'
      }
    },
    {
      id: 'countdown',
      title: 'Understanding the Countdown',
      icon: <ClockIcon className="w-6 h-6" />,
      content: {
        overview: 'The countdown system ensures fair play by giving all players adequate time to join before the lottery draw begins.',
        steps: [
          {
            step: 1,
            title: 'Minimum Players Reached',
            description: 'Once a room reaches its minimum players, a 30-second countdown automatically starts.',
            tip: 'This ensures everyone has a fair chance to join.'
          },
          {
            step: 2,
            title: 'Final Warning',
            description: 'The last 10 seconds show a more prominent countdown with visual effects.',
            tip: 'On mobile, you\'ll see a full-screen countdown for the final moments.'
          },
          {
            step: 3,
            title: 'No More Entries',
            description: 'Once countdown reaches zero, no new players can join and the draw process begins.',
            tip: 'Players can still leave during countdown for a full refund.'
          },
          {
            step: 4,
            title: 'Draw Preparation',
            description: 'The system prepares for the random selection using our provably fair algorithm.',
            tip: 'The countdown ensures the draw is fair and transparent.'
          }
        ],
        screenshot: '/screenshots/countdown-timer.png'
      }
    },
    {
      id: 'winner-selection',
      title: 'Winner Selection Process',
      icon: <TrophyIcon className="w-6 h-6" />,
      content: {
        overview: 'Our provably fair system uses cryptographic randomness to ensure completely unbiased winner selection every time.',
        steps: [
          {
            step: 1,
            title: 'VRF Random Generation',
            description: 'We use Verifiable Random Functions (VRF) to generate truly random numbers that cannot be manipulated.',
            tip: 'Every draw is cryptographically verifiable!'
          },
          {
            step: 2,
            title: 'Animated Selection',
            description: 'Watch as the system cycles through participants with exciting visual effects before revealing winners.',
            tip: 'The animation is just for show - winners are already determined fairly.'
          },
          {
            step: 3,
            title: 'Winner Announcement',
            description: 'Winners are revealed with celebration effects. Everyone sees the same results simultaneously.',
            tip: 'Screenshots are automatically saved for your records.'
          },
          {
            step: 4,
            title: 'Instant Verification',
            description: 'Check the blockchain transaction hash to verify the randomness was legitimate.',
            tip: 'This transparency is what makes our system provably fair.'
          }
        ],
        screenshot: '/screenshots/winner-selection.png'
      }
    },
    {
      id: 'prize-distribution',
      title: 'Prize Distribution',
      icon: <GiftIcon className="w-6 h-6" />,
      content: {
        overview: 'Understand how prizes are calculated, distributed, and added to your account instantly upon winning.',
        steps: [
          {
            step: 1,
            title: 'Prize Pool Calculation',
            description: 'The total prize pool equals all entry fees minus a small platform fee (typically 10%).',
            tip: 'Bigger rooms mean bigger prizes!'
          },
          {
            step: 2,
            title: 'Winner Distribution',
            description: 'Prizes are split among winners based on the room configuration (single or multiple winners).',
            tip: 'Multi-winner rooms give more players a chance to win something.'
          },
          {
            step: 3,
            title: 'Instant Credit',
            description: 'Winners receive their prizes immediately in their account balance - no waiting required!',
            tip: 'You can use winnings to join new rooms right away.'
          },
          {
            step: 4,
            title: 'Transaction History',
            description: 'All transactions are recorded in your profile for complete transparency and tax reporting.',
            tip: 'Download your history anytime for your records.'
          }
        ],
        screenshot: '/screenshots/prize-distribution.png'
      }
    },
    {
      id: 'tips-strategies',
      title: 'Tips & Strategies',
      icon: <LightBulbIcon className="w-6 h-6" />,
      content: {
        overview: 'Expert tips and strategies to maximize your LottoDrop experience and make smarter gaming decisions.',
        steps: [
          {
            step: 1,
            title: 'Choose Your Rooms Wisely',
            description: 'Consider entry fee vs. number of players. Smaller rooms have better odds but smaller prizes.',
            tip: 'Start with smaller entry fees while learning the system.'
          },
          {
            step: 2,
            title: 'Manage Your Bankroll',
            description: 'Never gamble more than you can afford to lose. Set daily/weekly limits for responsible gaming.',
            tip: 'Use our built-in spending limits and session timers.'
          },
          {
            step: 3,
            title: 'Timing Matters',
            description: 'Join rooms early for better chances, or wait until near the deadline for smaller player pools.',
            tip: 'Peak hours have more players but also bigger prize pools.'
          },
          {
            step: 4,
            title: 'Stay Informed',
            description: 'Follow our social channels for special events, bonus rooms, and platform updates.',
            tip: 'Special events often have guaranteed minimum prizes!'
          }
        ],
        screenshot: '/screenshots/tips-strategies.png'
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
      setExpandedSection('quick-start')
    }
  }, [])

  // Animation variants removed and replaced with inline animations for better TypeScript compatibility

  return (
    <div className={styles.container}>
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
              How to Play LottoDrop
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className={styles.heroSubtitle}
            >
              Master the art of provably fair lottery gaming with our comprehensive guide
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
                    {/* Screenshot */}
                    {section.content.screenshot && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className={styles.screenshotContainer}
                      >
                        <div className={styles.screenshot}>
                          <img
                            src={section.content.screenshot}
                            alt={`Screenshot: ${section.title}`}
                            className={styles.screenshotImage}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = 'block';
                              }
                            }}
                          />
                          <div className={styles.screenshotPlaceholder} style={{ display: 'none' }}>
                            <div className={styles.screenshotIcon}>📱</div>
                            <p>Screenshot: {section.title}</p>
                            <small>Coming soon</small>
                          </div>
                        </div>
                      </motion.div>
                    )}

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
              Ready to Start Playing?
            </h2>
            <p className={styles.ctaDescription}>
              Now that you know how LottoDrop works, join your first lottery room and experience the thrill!
            </p>
            <div className={styles.ctaButtons}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => window.location.href = '/rooms'}
                className={styles.ctaButton}
              >
                <PlayIcon className="w-5 h-5 mr-2" />
                Play Now
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => window.location.href = '/profile'}
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

export default HowToPlay