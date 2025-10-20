/**
 * WinnerReveal Component
 * Premium animation for lottery winner announcement
 *
 * Timeline (1.95s total):
 * - 0-200ms: Focus Phase (card glow pulse)
 * - 200-600ms: Spark Phase (18 gold particles + VRF badge)
 * - 600-1100ms: Pop Phase (winner card entrance with spring physics)
 * - 1100-1500ms: Count-up Phase (prize animation, 400ms)
 * - 1500-1950ms: Settle Phase (final state, 450ms)
 *
 * Implements all 8 UX modifications and 7 visual design fixes from domain experts
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { Winner } from '../../types'
import { useCountUp } from '../../hooks/useCountUp'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { ParticleCanvas } from './ParticleCanvas'
import { ProgressIndicators } from './ProgressIndicators'
import { announceToScreenReader, formatCurrency } from '../../utils/accessibility'
import { detectDeviceCapability } from '../../utils/deviceDetection'
import { createPerformanceMonitor } from '../../utils/performanceMonitor'
import { useAuth } from '../../contexts/AuthContext'

export interface GameHistory {
  won: boolean
  // Add other fields as needed
}

export interface WinnerRevealProps {
  /** Winner data array */
  winners: Winner[]
  /** Total prize pool */
  prizePool: number
  /** VRF seed for verification */
  seed?: string
  /** VRF proof URL */
  proof?: string
  /** Animation variant */
  variant?: 'standard' | 'fast' | 'reduced-motion'
  /** User's recent game history for adaptive animation */
  userHistory?: GameHistory[]
  /** Callback when animation completes */
  onComplete?: () => void
  /** Callback when user closes */
  onClose?: () => void
}

type AnimationPhase = 'focus' | 'spark' | 'anticipation' | 'pop' | 'explosion' | 'countup' | 'settle' | 'complete'
type LoadingPhase = 'gathering' | 'computing' | 'selecting' | 'selecting-climax'

/**
 * WinnerReveal Component
 */
export const WinnerReveal: React.FC<WinnerRevealProps> = ({
  winners,
  seed,
  proof,
  variant,
  userHistory,
  onComplete,
  onClose
}) => {
  // State
  const [phase, setPhase] = useState<AnimationPhase>('focus')
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('gathering')
  const [cyclingName, setCyclingName] = useState<string>('')
  const [isWinner, setIsWinner] = useState(false)
  const [canSkip, setCanSkip] = useState(false)
  const [animationStartTime] = useState(Date.now())

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const performanceMonitor = useRef(createPerformanceMonitor())

  // Hooks
  const prefersReducedMotion = usePrefersReducedMotion()
  const { user } = useAuth()

  // Device capability detection
  const deviceProfile = useRef(detectDeviceCapability())

  // Determine animation variant
  const effectiveVariant = prefersReducedMotion
    ? 'reduced-motion'
    : variant || (userHistory && getAnimationVariant(userHistory)) || 'standard'

  // Get winner (single winner MVP)
  const winner = winners[0]

  // Detect if current user is the winner (Bug Fix #1/2)
  useEffect(() => {
    if (winner && user && winner.userId === user.id) {
      setIsWinner(true)
    } else {
      setIsWinner(false)
    }
  }, [winner, user])

  // Loading phase progression (while waiting for winner data)
  useEffect(() => {
    if (winner || winners.length > 0) return // Stop if we have data

    const timers: NodeJS.Timeout[] = []

    // Gathering → Computing after 2s
    if (loadingPhase === 'gathering') {
      timers.push(setTimeout(() => {
        setLoadingPhase('computing')
      }, 2000))
    }

    // Computing → Selecting after 2s
    if (loadingPhase === 'computing') {
      timers.push(setTimeout(() => {
        setLoadingPhase('selecting')
      }, 2000))
    }

    // Hold on 'selecting' phase indefinitely until winner data arrives
    // (no timeout to loop back - this creates dramatic anticipation)

    return () => timers.forEach(clearTimeout)
  }, [winner, winners.length, loadingPhase])

  // Name cycling effect during "selecting" phase
  useEffect(() => {
    if (loadingPhase !== 'selecting' || winner) return

    // Mock participant names for cycling effect
    const mockNames = [
      'Player_7142', 'LuckyWinner88', 'GamingPro', 'CryptoKing',
      'HighRoller', 'JackpotHunter', 'BetMaster', 'FortuneSeeker',
      'SpinDoctor', 'WinStreak', 'BigBetBob', 'RoyalFlush'
    ]

    let currentIndex = 0
    const cycleInterval = setInterval(() => {
      setCyclingName(mockNames[currentIndex % mockNames.length])
      currentIndex++
    }, 80) // Change name every 80ms for slot machine effect

    return () => clearInterval(cycleInterval)
  }, [loadingPhase, winner])

  // Climax sequence: When winner data arrives during "selecting" phase
  useEffect(() => {
    if (!winner || loadingPhase !== 'selecting') return

    // Trigger dramatic climax sequence
    const runClimaxSequence = async () => {
      setLoadingPhase('selecting-climax')

      // Mock names for deceleration effect
      const mockNames = [
        'Player_7142', 'LuckyWinner88', 'GamingPro', 'CryptoKing',
        'HighRoller', 'JackpotHunter', 'BetMaster', 'FortuneSeeker'
      ]

      // Phase 1: Rapid cycling (100ms × 5 cycles)
      for (let i = 0; i < 5; i++) {
        setCyclingName(mockNames[i % mockNames.length])
        await delay(100)
      }

      // Phase 2: Slow down (200ms × 3 cycles)
      for (let i = 0; i < 3; i++) {
        setCyclingName(mockNames[(i + 5) % mockNames.length])
        await delay(200)
      }

      // Phase 3: Final deceleration (400ms × 2 cycles)
      for (let i = 0; i < 2; i++) {
        setCyclingName(mockNames[(i + 8) % mockNames.length])
        await delay(400)
      }

      // Phase 4: Land on actual winner's name (800ms dramatic pause)
      setCyclingName(winner.username)
      await delay(800)

      // Phase 5: Start the explosion/reveal animation
      // (this will be handled by the main animation sequence useEffect)
    }

    runClimaxSequence()
  }, [winner, loadingPhase])

  // Count-up animation for prize
  const { formatted: prizeFormatted } = useCountUp({
    start: 0,
    end: winner?.prize || 0,
    duration: effectiveVariant === 'fast' ? 200 : 400,
    delay: effectiveVariant === 'standard' ? 1100 : effectiveVariant === 'fast' ? 700 : 0
  })

  // Start performance monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.current.start()

      return () => {
        performanceMonitor.current.stop()
        performanceMonitor.current.logReport()
      }
    }
  }, [])

  // Keyboard event handlers (UX Modification B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
      if (e.key === ' ' && canSkip && !isWinner) {
        e.preventDefault()
        skipToEnd()
      }
      if (e.key === 'Enter' && phase === 'complete') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, canSkip, isWinner, onClose])

  // Focus management (UX Modification B)
  useEffect(() => {
    if (phase === 'complete') {
      closeButtonRef.current?.focus()
    }
  }, [phase])

  // Screen reader announcement (UX Modification B)
  useEffect(() => {
    if (phase === 'pop' && winner) {
      announceToScreenReader(
        `Winner announced: ${winner.username} has won ${formatCurrency(winner.prize)}`,
        'assertive'
      )
    }
  }, [phase, winner])

  // Trigger confetti (Visual Design Fix 4)
  const triggerConfetti = useCallback(() => {
    if (!isWinner || effectiveVariant === 'reduced-motion') return

    const isMobile = window.innerWidth < 768
    const particleCount = isMobile ? 40 : 60

    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#9D4EDD', '#A855F7'], // 3-color system only
      zIndex: 10001
    })
  }, [isWinner, effectiveVariant])

  // Standard animation timeline (Extended to 3.5s for dramatic effect)
  const runStandardAnimation = useCallback(async () => {
    // Focus Phase (0-300ms)
    setPhase('focus')
    await delay(300)

    // Spark Phase (300-800ms)
    setPhase('spark')
    setCanSkip(true) // Allow skipping after 50% (UX Modification F)
    await delay(500)

    // Anticipation Phase (800-1400ms) - NEW: Camera zoom + glow intensification
    setPhase('anticipation')
    await delay(600)

    // Pop Phase (1400-2000ms) - Winner reveal with screen shake
    setPhase('pop')
    await delay(600)

    // Explosion Phase (2000-2800ms) - NEW: 60-particle burst + radial lines
    setPhase('explosion')
    await delay(800)

    // Count-up Phase (2800-3200ms)
    setPhase('countup')
    await delay(400)

    // Settle Phase (3200-3500ms)
    setPhase('settle')
    await delay(300)

    // Complete
    setPhase('complete')
    triggerConfetti()
    onComplete?.()
  }, [triggerConfetti, onComplete])

  // Fast animation timeline (for repeat losers) - Still includes new phases but shorter
  const runFastAnimation = useCallback(async () => {
    setPhase('focus')
    await delay(150)

    setPhase('spark')
    setCanSkip(true)
    await delay(200)

    setPhase('anticipation')
    await delay(250)

    setPhase('pop')
    await delay(300)

    setPhase('explosion')
    await delay(300)

    setPhase('countup')
    await delay(200)

    setPhase('settle')
    await delay(200)

    setPhase('complete')
    triggerConfetti()
    onComplete?.()
  }, [triggerConfetti, onComplete])

  // Skip to end (UX Modification F)
  const skipToEnd = useCallback(() => {
    if (isWinner) return // Winners cannot skip

    setPhase('complete')
    onComplete?.()
  }, [isWinner, onComplete])

  // Touch interaction handler (UX Modification C)
  const handleBackgroundTap = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && phase === 'complete') {
      if (Date.now() - animationStartTime > 1950) {
        onClose?.()
      }
    }
  }, [phase, animationStartTime, onClose])

  // Animation sequence
  useEffect(() => {
    // Wait for winners data before starting animation
    if (!winner || !winners.length) {
      setPhase('focus') // Stay in focus/loading phase
      return
    }

    // If in 'selecting-climax', wait for climax sequence to complete (2.3s total)
    // Then start the explosion/reveal animation
    if (loadingPhase === 'selecting-climax') {
      const climaxDuration = 500 + 600 + 800 + 800 // Total climax sequence time

      const timer = setTimeout(() => {
        if (effectiveVariant === 'reduced-motion') {
          setPhase('complete')
          onComplete?.()
        } else if (effectiveVariant === 'fast') {
          runFastAnimation()
        } else {
          runStandardAnimation()
        }
      }, climaxDuration)

      return () => clearTimeout(timer)
    }

    // If winner data arrived before reaching 'selecting' phase, start immediately
    if (loadingPhase === 'gathering' || loadingPhase === 'computing') {
      if (effectiveVariant === 'reduced-motion') {
        setPhase('complete')
        onComplete?.()
      } else if (effectiveVariant === 'fast') {
        runFastAnimation()
      } else {
        runStandardAnimation()
      }
    }

    // If still in 'selecting' phase, wait for climax sequence to trigger
  }, [winner, winners.length, loadingPhase, effectiveVariant, runFastAnimation, runStandardAnimation, onComplete])

  // Show enhanced multi-phase loading state while waiting for winners data
  if (!winner || !winners.length) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-live="polite"
      >
        <motion.div
          className="relative bg-[var(--color-secondary-bg)] rounded-2xl p-6 sm:p-8 md:p-12 max-w-2xl w-full mx-4 border-t-4 border-[var(--color-primary)] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            boxShadow: [
              '0 8px 32px rgba(0, 0, 0, 0.3)',
              '0 0 40px rgba(157, 78, 221, 0.4)',
              '0 8px 32px rgba(0, 0, 0, 0.3)'
            ]
          }}
          transition={{
            duration: 0.5,
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          {/* VRF Verified Badge */}
          <div className="absolute top-4 left-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg px-3 py-1 z-10">
            <p className="text-xs font-semibold text-[var(--color-primary)]">
              ✓ VRF Verified
            </p>
          </div>

          {/* Progress Indicators */}
          <ProgressIndicators
            currentPhase={loadingPhase}
            variant={effectiveVariant === 'fast' ? 'standard' : effectiveVariant}
          />

          {/* Hexagonal grid background (Computing phase) */}
          {loadingPhase === 'computing' && (
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="grid grid-cols-8 gap-4 p-4">
                {[...Array(32)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="aspect-square"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                      background: 'var(--color-primary)'
                    }}
                    animate={{
                      opacity: [0.1, 0.3, 0.1],
                      scale: [0.9, 1.1, 0.9]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.05
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Persistent LottoDrop Logo (visible across ALL phases) */}
          <div className="text-center space-y-4 sm:space-y-6 md:space-y-8">
            <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32">
              {/* Rotating hexagonal border */}
              <motion.div
                className="absolute inset-0 rounded-lg border-4 border-[var(--color-primary)]"
                style={{
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)'
                }}
                animate={{
                  rotate: [0, 360],
                  borderColor: ['#9D4EDD', '#A855F7', '#9D4EDD']
                }}
                transition={{
                  rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                  borderColor: { duration: 2, repeat: Infinity }
                }}
              />
              {/* LottoDrop Logo with floating animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.img
                  src="/drop-icon.svg"
                  alt="LottoDrop"
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16"
                  animate={{
                    y: [-8, 8, -8],
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0, -5, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>

            {/* Phase-specific content (text changes, logo stays) */}
            <AnimatePresence mode="wait">
              {/* PHASE 1: Gathering Participants (0-2s) */}
              {loadingPhase === 'gathering' && (
                <motion.div
                  key="gathering"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-2 sm:mb-3">
                    Gathering Participants
                  </h2>
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-sm sm:text-base md:text-lg text-gray-400"
                  >
                    Preparing lottery draw...
                  </motion.p>

                  {/* Animated dots */}
                  <div className="flex justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[var(--color-primary)]"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* PHASE 2: Computing VRF (2-4s) */}
              {loadingPhase === 'computing' && (
                <motion.div
                  key="computing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-2 sm:mb-3">
                    Computing Randomness
                  </h2>
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-sm sm:text-base md:text-lg text-gray-400 mb-3 sm:mb-4"
                  >
                    Verifiable Random Function active
                  </motion.p>

                  {/* Matrix-style hash display */}
                  <div className="font-mono text-xs text-[var(--color-primary)] opacity-70">
                    <motion.div
                      animate={{
                        opacity: [0.3, 0.7, 0.3]
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity
                      }}
                    >
                      0x{Math.random().toString(16).substring(2, 18)}...
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* PHASE 3: Selecting Winner (4-6s) - Slot machine name cycling */}
              {(loadingPhase === 'selecting' || loadingPhase === 'selecting-climax') && (
                <motion.div
                  key="selecting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-2 sm:mb-3">
                    Selecting Winner
                  </h2>

                  {/* Slot machine name cycling */}
                  <motion.div
                    className="relative h-16 sm:h-20 overflow-hidden bg-black/20 rounded-lg border-2 my-4 sm:my-6 flex items-center justify-center"
                    animate={{
                      borderColor: loadingPhase === 'selecting-climax' && cyclingName === winner?.username
                        ? ['rgba(157, 78, 221, 0.3)', '#FFD700', '#FFD700']
                        : 'rgba(157, 78, 221, 0.3)',
                      boxShadow: loadingPhase === 'selecting-climax' && cyclingName === winner?.username
                        ? [
                            '0 0 10px rgba(157, 78, 221, 0.2)',
                            '0 0 30px rgba(255, 215, 0, 0.6)',
                            '0 0 40px rgba(255, 215, 0, 0.8)'
                          ]
                        : '0 0 10px rgba(157, 78, 221, 0.2)'
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      key={cyclingName}
                      initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        filter: 'blur(0px)',
                        scale: loadingPhase === 'selecting-climax' && cyclingName === winner?.username ? 1.15 : 1
                      }}
                      transition={{
                        duration: loadingPhase === 'selecting-climax' ? 0.15 : 0.05,
                        scale: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
                      }}
                      className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold px-2"
                      style={{
                        color: loadingPhase === 'selecting-climax' && cyclingName === winner?.username
                          ? '#FFD700'
                          : 'var(--color-primary)'
                      }}
                    >
                      {cyclingName}
                    </motion.div>

                    {/* Motion blur effect lines */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute inset-x-0 h-px bg-[var(--color-primary)]"
                          style={{ top: `${25 + i * 25}%` }}
                          animate={{
                            opacity: [0, 0.3, 0],
                            scaleX: [0, 1, 0]
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.2
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  <motion.p
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-sm sm:text-base md:text-lg text-[var(--color-highlight-1)] font-semibold"
                  >
                    Drawing in progress...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Render reduced motion variant
  if (effectiveVariant === 'reduced-motion') {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={handleBackgroundTap}
        role="dialog"
        aria-modal="true"
        aria-labelledby="winner-title"
      >
        <div className="bg-[var(--color-secondary-bg)] rounded-2xl p-8 max-w-md w-full mx-4 border-t-4 border-[var(--color-primary)]">
          <h2 id="winner-title" className="text-2xl font-bold text-[var(--color-primary-bg)] mb-4">
            Winner: {winner?.username}
          </h2>
          <p className="text-4xl font-extrabold mb-6 bg-gradient-to-r from-[var(--color-primary-start)] to-[var(--color-primary-end)] bg-clip-text text-transparent">
            {formatCurrency(winner?.prize || 0)}
          </p>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            data-winner-close
            className="w-full px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-highlight-1)] focus-visible:outline-offset-2"
          >
            Close
          </button>
        </div>
      </motion.div>
    )
  }

  // Main animation render
  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackgroundTap}
        role="dialog"
        aria-modal="true"
        aria-labelledby="winner-title"
        aria-live="assertive"
      >
        {/* Screen reader only title */}
        <h2 id="winner-title" className="sr-only">
          Winner Announcement: {winner?.username} won {formatCurrency(winner?.prize || 0)}
        </h2>

        {/* Skip button (UX Modification F) */}
        {canSkip && !isWinner && phase !== 'complete' && (
          <button
            className="absolute top-4 right-4 text-xs text-white/50 hover:text-white/100 transition-colors px-3 py-1 rounded bg-black/30 backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-highlight-1)] focus-visible:outline-offset-2"
            onClick={skipToEnd}
          >
            Skip (Space)
          </button>
        )}

        {/* Background flash for explosion */}
        <AnimatePresence>
          {phase === 'explosion' && (
            <motion.div
              className="fixed inset-0 z-40 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>

        {/* Winner Card */}
        <motion.div
          className="relative bg-[var(--color-secondary-bg)] rounded-2xl p-8 md:p-12 max-w-2xl w-full mx-4 border-t-4 border-[var(--color-primary)]"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
          initial={{ scale: 1, opacity: 0 }}
          animate={
            phase === 'focus'
              ? {
                  // Focus: Gentle glow pulse
                  scale: [1, 1.02, 1],
                  opacity: 1,
                  boxShadow: [
                    '0 8px 32px rgba(0, 0, 0, 0.3)',
                    '0 0 24px rgba(157, 78, 221, 0.25)',
                    '0 8px 32px rgba(0, 0, 0, 0.3)'
                  ]
                }
              : phase === 'anticipation'
              ? {
                  // Anticipation: Camera zoom + intense glow
                  scale: 1.05,
                  opacity: 1,
                  boxShadow: [
                    '0 0 40px rgba(157, 78, 221, 0.4)',
                    '0 0 60px rgba(157, 78, 221, 0.6)',
                    '0 0 40px rgba(157, 78, 221, 0.4)'
                  ]
                }
              : phase === 'pop'
              ? {
                  // Pop: Screen shake effect
                  scale: 1,
                  opacity: 1,
                  x: [0, -8, 6, -4, 2, 0],
                  y: [0, 4, -3, 2, -1, 0]
                }
              : { scale: 1, opacity: 1 }
          }
          transition={{
            duration: phase === 'focus' ? 0.2 : phase === 'anticipation' ? 0.6 : phase === 'pop' ? 0.4 : 0.3,
            ease: phase === 'anticipation' ? 'easeInOut' : [0.4, 0, 0.2, 1],
            boxShadow: phase === 'anticipation' ? { duration: 0.6, repeat: 1 } : undefined
          }}
        >
          {/* Particle Canvas (Spark Phase) */}
          {phase === 'spark' && deviceProfile.current.useCanvas && (
            <ParticleCanvas
              isActive={true}
              particleCount={deviceProfile.current.particleCount}
              duration={400}
              className="z-10"
            />
          )}

          {/* VRF Verified Badge (Spark Phase) */}
          <AnimatePresence>
            {phase === 'spark' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg px-3 py-1"
              >
                <p className="text-xs font-semibold text-[var(--color-primary)]">
                  = VRF Verified
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explosion Effects (Explosion Phase) */}
          <AnimatePresence>
            {phase === 'explosion' && (
              <>
                {/* Radial Burst Lines */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 360) / 12
                    return (
                      <motion.div
                        key={`line-${i}`}
                        className="absolute top-1/2 left-1/2 origin-left"
                        style={{
                          width: '50%',
                          height: '2px',
                          background: 'linear-gradient(90deg, rgba(157, 78, 221, 0.8), transparent)',
                          transform: `rotate(${angle}deg)`,
                          transformOrigin: 'left center'
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: [0, 1.5, 0], opacity: [0, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.6,
                          ease: "easeOut",
                          delay: i * 0.03
                        }}
                      />
                    )
                  })}
                </div>

                {/* Particle Explosion */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {[...Array(60)].map((_, i) => {
                    const angle = Math.random() * Math.PI * 2
                    const distance = 100 + Math.random() * 200
                    const size = 3 + Math.random() * 4
                    const color = ['#FFD700', '#9D4EDD', '#A855F7'][Math.floor(Math.random() * 3)]
                    return (
                      <motion.div
                        key={`particle-${i}`}
                        className="absolute rounded-full"
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          background: color
                        }}
                        initial={{
                          x: 0,
                          y: 0,
                          opacity: 1,
                          scale: 0
                        }}
                        animate={{
                          x: Math.cos(angle) * distance,
                          y: Math.sin(angle) * distance + 50, // Gravity effect
                          opacity: [1, 1, 0],
                          scale: [0, 1, 0.5]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.8,
                          ease: "easeOut",
                          delay: i * 0.01
                        }}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Winner Announcement Title */}
          <AnimatePresence>
            {phase !== 'focus' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mb-6"
              >
                <p className="text-base md:text-xl font-semibold text-[var(--color-text-primary)] opacity-90">
                  Winner Announced
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Winner Details (Pop Phase and onwards) */}
          <AnimatePresence>
            {(phase === 'pop' || phase === 'explosion' || phase === 'countup' || phase === 'settle' || phase === 'complete') && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15
                }}
                className="text-center space-y-6"
              >
                {/* Username */}
                <h2 className="text-2xl md:text-4xl font-bold text-[var(--color-primary-bg)] tracking-tight">
                  {winner?.username}
                </h2>

                {/* Position Badge */}
                {winner?.position && (
                  <div className="inline-block px-4 py-1 bg-[var(--color-primary)]/10 rounded-full">
                    <p className="text-sm font-medium text-[var(--color-primary)]">
                      Position #{winner.position}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prize Amount (Count-up Phase) */}
          <AnimatePresence>
            {(phase === 'countup' || phase === 'settle' || phase === 'complete') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 text-center"
              >
                <div
                  className="inline-block px-8 py-6 rounded-2xl"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end))',
                    border: '2px solid var(--color-highlight-2)',
                    boxShadow: '0 4px 16px rgba(157, 78, 221, 0.2), 0 0 24px rgba(157, 78, 221, 0.25)'
                  }}
                >
                  <p className="text-4xl md:text-6xl font-extrabold text-white">
                    {prizeFormatted}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* VRF Proof Link (Settle Phase) */}
          <AnimatePresence>
            {(phase === 'settle' || phase === 'complete') && proof && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-6 text-center"
              >
                <a
                  href={proof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-primary)] hover:text-[var(--color-highlight-1)] underline opacity-70 hover:opacity-100 transition-opacity"
                >
                  View VRF Proof
                </a>
                {seed && (
                  <p className="text-xs text-gray-400 mt-1 opacity-70">
                    Seed: {seed.substring(0, 12)}...
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close Button (Settle Phase) */}
          <AnimatePresence>
            {(phase === 'settle' || phase === 'complete') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 text-center"
              >
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  data-winner-close
                  className="px-8 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-highlight-1)] focus-visible:outline-offset-2"
                  style={{ minWidth: '120px', minHeight: '48px' }} // 16px touch target minimum
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Helper functions

/**
 * Delay helper
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Determine animation variant based on user history (UX Modification E)
 */
const getAnimationVariant = (userHistory: GameHistory[]): 'standard' | 'fast' => {
  const recentLosses = userHistory.slice(-3).filter(g => !g.won).length

  if (recentLosses >= 3) {
    return 'fast' // 1.2s variant for repeat losers
  }

  return 'standard' // 1.95s variant
}

export default WinnerReveal
