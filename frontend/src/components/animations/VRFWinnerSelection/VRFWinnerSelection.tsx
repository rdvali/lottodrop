import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Participant, Winner } from '../../../types'
import { Avatar, Badge } from '@components/atoms'
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
  duration = 30,
  onAnimationComplete,
}: VRFWinnerSelectionProps) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [animationPhase, setAnimationPhase] = useState<'shuffling' | 'selecting' | 'revealing' | 'complete'>('shuffling')
  const [revealedWinners, setRevealedWinners] = useState<Set<string>>(new Set())
  const [shuffledParticipants, setShuffledParticipants] = useState(participants)

  useEffect(() => {
    if (!isAnimating) {
      setAnimationPhase('shuffling')
      setHighlightedIndex(null)
      setRevealedWinners(new Set())
      return
    }

    // Start animation sequence
    const startAnimation = async () => {
      // Phase 1: Shuffling (0-10s)
      setAnimationPhase('shuffling')
      
      // Shuffle participants randomly
      const shuffleInterval = setInterval(() => {
        setShuffledParticipants(prev => [...prev].sort(() => Math.random() - 0.5))
      }, 500)

      // Rapid highlighting during shuffle
      const highlightInterval = setInterval(() => {
        setHighlightedIndex(Math.floor(Math.random() * participants.length))
      }, 100)

      await new Promise(resolve => setTimeout(resolve, 10000))
      clearInterval(shuffleInterval)
      clearInterval(highlightInterval)

      // Phase 2: Selecting (10-25s)
      setAnimationPhase('selecting')
      
      // Slower highlighting as we "narrow down"
      let speed = 100
      let currentIndex = 0
      
      const selectionInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % shuffledParticipants.length
        setHighlightedIndex(currentIndex)
        speed = Math.min(speed + 5, 500) // Gradually slow down
      }, speed)

      await new Promise(resolve => setTimeout(resolve, 15000))
      clearInterval(selectionInterval)

      // Phase 3: Revealing (25-30s)
      setAnimationPhase('revealing')
      setHighlightedIndex(null)

      // Reveal winners one by one
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i]
        setRevealedWinners(prev => new Set(prev).add(winner.userId))
        // Removed: console.log('Revealing winner:', winner.username, winner.userId) // Debug log
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      await new Promise(resolve => setTimeout(resolve, 2000))

      // Phase 4: Complete
      setAnimationPhase('complete')
      onAnimationComplete?.()
    }

    startAnimation()
  }, [isAnimating, participants, winners, duration, onAnimationComplete])

  const isWinner = (userId: string) => winners.some(w => w.userId === userId)
  const isRevealed = (userId: string) => revealedWinners.has(userId)

  return (
    <div className="relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-highlight-1/10 rounded-xl blur-3xl" />
      
      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold gradient-text mb-2">
          {animationPhase === 'shuffling' && 'Initializing VRF...'}
          {animationPhase === 'selecting' && 'Selecting Winners...'}
          {animationPhase === 'revealing' && 'Winners Found!'}
          {animationPhase === 'complete' && '🎉 Congratulations! 🎉'}
        </h2>
        <p className="text-gray-400">
          {animationPhase === 'shuffling' && 'Generating cryptographically secure random values'}
          {animationPhase === 'selecting' && 'Verifying fairness and selecting winners'}
          {animationPhase === 'revealing' && 'Revealing the lucky winners'}
          {animationPhase === 'complete' && 'Game complete! Winners have been selected'}
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-2 bg-secondary-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary-gradient"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Participants grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {shuffledParticipants.map((participant, index) => {
            const isHighlighted = highlightedIndex === index
            const isWinnerRevealed = isWinner(participant.userId) && isRevealed(participant.userId)
            
            return (
              <motion.div
                key={participant.userId}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: isHighlighted ? 1.1 : isWinnerRevealed ? 1.05 : 1,
                  rotateY: animationPhase === 'shuffling' ? [0, 180, 360] : 0,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  layout: { duration: 0.3 },
                  rotateY: { duration: 0.6, repeat: animationPhase === 'shuffling' ? Infinity : 0 },
                }}
                className={clsx(
                  'relative p-4 rounded-lg border-2 transition-all duration-300',
                  isWinnerRevealed
                    ? 'bg-gradient-to-br from-primary/30 to-highlight-1/30 border-primary shadow-lg'
                    : isHighlighted
                    ? 'bg-primary/20 border-primary shadow-md'
                    : 'bg-secondary-bg border-primary/20'
                )}
              >
                {/* Glow effect for highlighted/winner */}
                {(isHighlighted || isWinnerRevealed) && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(157, 78, 221, 0.3)',
                        '0 0 40px rgba(157, 78, 221, 0.5)',
                        '0 0 20px rgba(157, 78, 221, 0.3)',
                      ],
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}

                {/* Winner badge */}
                {isWinnerRevealed && (
                  <motion.div
                    className="absolute -top-2 -right-2 z-10"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    <Badge variant="warning" className="shadow-lg">
                      🏆 Winner
                    </Badge>
                  </motion.div>
                )}

                {/* Participant info */}
                <div className="flex flex-col items-center space-y-2">
                  <motion.div
                    animate={{
                      scale: isHighlighted ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Avatar
                      userId={participant.userId}
                      alt={participant.username}
                      size="md"
                      variant={isWinnerRevealed ? 'winning' : animationPhase === 'selecting' ? 'competitive' : 'default'}
                    />
                  </motion.div>
                  
                  <p className={clsx(
                    'font-medium text-sm truncate max-w-full',
                    isWinnerRevealed ? 'text-white' : 'text-gray-300'
                  )}>
                    {participant.username}
                  </p>

                  {/* Prize display for winners */}
                  {isWinnerRevealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="text-success font-bold">
                        ${winners.find(w => w.userId === participant.userId)?.prize.toLocaleString()}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Scanning effect during selection */}
                {animationPhase === 'selecting' && isHighlighted && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-primary/30 to-transparent rounded-lg"
                    initial={{ y: '-100%' }}
                    animate={{ y: '100%' }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Confetti effect for complete phase */}
      {animationPhase === 'complete' && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary"
              initial={{
                x: '50vw',
                y: '50vh',
                scale: 0,
              }}
              animate={{
                x: `${Math.random() * 100}vw`,
                y: `${Math.random() * 100}vh`,
                scale: [0, 1, 0],
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 3,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
              style={{
                background: i % 2 === 0 ? '#9D4EDD' : '#A855F7',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default VRFWinnerSelection