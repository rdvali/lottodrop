import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Participant, Winner } from '../../../types'
import { useIsMobile } from '../../../hooks/useResponsive'
import clsx from 'clsx'

export interface VRFWinnerSelectionProps {
  participants: Participant[]
  winners: Winner[]
  isAnimating: boolean
  duration?: number // Animation duration in seconds
  onAnimationComplete?: () => void
}

const VRFWinnerSelection = ({
  participants,
  winners,
  isAnimating,
  duration = 7,
  onAnimationComplete,
}: VRFWinnerSelectionProps) => {
  const isMobile = useIsMobile()
  const [animationPhase, setAnimationPhase] = useState<'init' | 'verification' | 'selection' | 'reveal' | 'complete'>('init')
  const [cyclingName, setCyclingName] = useState<string>('')
  const [cyclingIndex, setCyclingIndex] = useState(0)

  useEffect(() => {
    if (!isAnimating) {
      setAnimationPhase('init')
      setCyclingName('')
      setCyclingIndex(0)
      return
    }

    // Text-based animation sequence - 7 seconds total
    const startAnimation = async () => {
      // Phase 1: Init (0-2s)
      setAnimationPhase('init')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Phase 2: Verification (2-4s)
      setAnimationPhase('verification')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Phase 3: Selection (4-6s) - with name cycling
      setAnimationPhase('selection')

      // Cycle through random participant names
      const nameInterval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * participants.length)
        setCyclingName(participants[randomIndex]?.username || '')
        setCyclingIndex(prev => prev + 1)
      }, 150) // Fast cycling

      await new Promise(resolve => setTimeout(resolve, 2000))
      clearInterval(nameInterval)

      // Phase 4: Reveal (6-7s)
      setAnimationPhase('reveal')
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Phase 5: Complete
      setAnimationPhase('complete')
      onAnimationComplete?.()
    }

    startAnimation()
  }, [isAnimating, participants, winners, duration, onAnimationComplete])

  // Get winner names for display
  const winnerNames = winners.map(w => {
    const participant = participants.find(p => p.userId === w.userId)
    return participant?.username || 'Unknown'
  }).join(', ')

  return (
    <div className={clsx(
      "relative flex flex-col items-center justify-center",
      isMobile ? "min-h-[60vh] py-8" : "min-h-[300px]"
    )}>
      {/* Background effects - responsive */}
      <div className={clsx(
        "absolute inset-0 bg-gradient-to-r from-primary/10 to-highlight-1/10 blur-3xl",
        isMobile ? "rounded-none" : "rounded-xl"
      )} />

      {/* Main content container - mobile optimized */}
      <motion.div
        className={clsx(
          "text-center z-10 relative mx-auto",
          isMobile ? "mb-4 max-w-sm px-4" : "mb-8 max-w-2xl px-6"
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Phase-specific icon and text */}
        <motion.div
          key={animationPhase}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Main title with icon - responsive sizing */}
          <h2 className={clsx(
            "font-bold mb-3",
            isMobile ? "text-2xl" : "text-3xl"
          )}>
            {animationPhase === 'init' && (
              <span className="gradient-text">
                🔄 Collecting all participants...
              </span>
            )}
            {animationPhase === 'verification' && (
              <span className="gradient-text">
                🔐 Generating secure random number...
              </span>
            )}
            {animationPhase === 'selection' && (
              <span className="gradient-text">
                ⚡ Selecting the winner...
              </span>
            )}
            {animationPhase === 'reveal' && (
              <motion.span
                className="text-yellow-400"
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5 }}
              >
                🎉 Winner: {winnerNames} 🎉
              </motion.span>
            )}
            {animationPhase === 'complete' && (
              <span className="text-success">
                ✅ Selection Complete!
              </span>
            )}
          </h2>

          {/* Subtext - responsive sizing and content */}
          <p className={clsx(
            "text-gray-400",
            isMobile ? "text-base px-2" : "text-lg"
          )}>
            {animationPhase === 'init' && (isMobile ? 'Including all players in draw.' : 'Everyone in the room is included in the random draw.')}
            {animationPhase === 'verification' && (isMobile ? 'VRF ensures fair selection.' : 'Powered by VRF (Verifiable Random Function) to guarantee fairness.')}
            {animationPhase === 'selection' && (isMobile ? 'Matching results...' : 'Matching random result with participant list.')}
            {animationPhase === 'reveal' && (isMobile ? 'Congratulations!' : 'Congratulations! Your prize is on the way.')}
            {animationPhase === 'complete' && 'Winners have been announced!'}
          </p>

          {/* Name cycling during selection phase - mobile optimized */}
          {animationPhase === 'selection' && cyclingName && (
            <motion.div
              key={cyclingIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className={clsx(
                isMobile ? "mt-4" : "mt-6"
              )}
            >
              <p className={clsx(
                "font-medium text-primary/60",
                isMobile ? "text-xl" : "text-2xl"
              )}>
                {cyclingName}
              </p>
            </motion.div>
          )}

          {/* Winner display with gold highlight - mobile optimized */}
          {animationPhase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={clsx(
                "space-y-2",
                isMobile ? "mt-4" : "mt-6"
              )}
            >
              {winners.map((winner, index) => {
                const participant = participants.find(p => p.userId === winner.userId)
                return (
                  <motion.div
                    key={winner.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={clsx(
                      "bg-gradient-to-r from-yellow-500/20 to-yellow-300/20 border border-yellow-400/50 rounded-lg shadow-lg",
                      isMobile ? "p-3" : "p-4"
                    )}
                  >
                    <p className={clsx(
                      "font-bold text-yellow-400",
                      isMobile ? "text-lg" : "text-xl"
                    )}>
                      {participant?.username || 'Unknown'}
                    </p>
                    <p className={clsx(
                      "text-success",
                      isMobile ? "text-base" : "text-lg"
                    )}>
                      Prize: ${winner.prize.toLocaleString()}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Progress bar - mobile responsive */}
      <div className={clsx(
        "w-full mx-auto",
        isMobile ? "max-w-sm px-4" : "max-w-2xl px-6"
      )}>
        <div className={clsx(
          "bg-secondary-bg rounded-full overflow-hidden",
          isMobile ? "h-1.5" : "h-2"
        )}>
          <motion.div
            className="h-full bg-primary-gradient"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Small confetti burst for complete phase (1 second) */}
      {animationPhase === 'complete' && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              initial={{
                x: '50vw',
                y: '40vh',
                scale: 0,
              }}
              animate={{
                x: `${35 + Math.random() * 30}vw`,
                y: `${50 + Math.random() * 30}vh`,
                scale: [0, 1.2, 0],
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 1,
                delay: Math.random() * 0.2,
                ease: 'easeOut',
              }}
              style={{
                background: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#9D4EDD' : '#A855F7',
                boxShadow: '0 0 6px rgba(255, 215, 0, 0.5)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default VRFWinnerSelection