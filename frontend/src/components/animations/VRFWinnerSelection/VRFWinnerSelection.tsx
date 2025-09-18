import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Participant, Winner } from '../../../types'
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
    <div className="relative min-h-[300px] flex flex-col items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-highlight-1/10 rounded-xl blur-3xl" />

      {/* Main content container */}
      <motion.div
        className="text-center mb-8 z-10 relative max-w-2xl mx-auto px-6"
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
          {/* Main title with icon */}
          <h2 className="text-3xl font-bold mb-3">
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

          {/* Subtext */}
          <p className="text-gray-400 text-lg">
            {animationPhase === 'init' && 'Everyone in the room is included in the random draw.'}
            {animationPhase === 'verification' && 'Powered by VRF (Verifiable Random Function) to guarantee fairness.'}
            {animationPhase === 'selection' && 'Matching random result with participant list.'}
            {animationPhase === 'reveal' && 'Congratulations! Your prize is on the way.'}
            {animationPhase === 'complete' && 'Winners have been announced!'}
          </p>

          {/* Name cycling during selection phase */}
          {animationPhase === 'selection' && cyclingName && (
            <motion.div
              key={cyclingIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="mt-6"
            >
              <p className="text-2xl font-medium text-primary/60">
                {cyclingName}
              </p>
            </motion.div>
          )}

          {/* Winner display with gold highlight */}
          {animationPhase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 space-y-2"
            >
              {winners.map((winner, index) => {
                const participant = participants.find(p => p.userId === winner.userId)
                return (
                  <motion.div
                    key={winner.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-yellow-500/20 to-yellow-300/20 border border-yellow-400/50 rounded-lg p-4 shadow-lg"
                  >
                    <p className="text-xl font-bold text-yellow-400">
                      {participant?.username || 'Unknown'}
                    </p>
                    <p className="text-success text-lg">
                      Prize: ${winner.prize.toLocaleString()}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl mx-auto px-6">
        <div className="h-2 bg-secondary-bg rounded-full overflow-hidden">
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