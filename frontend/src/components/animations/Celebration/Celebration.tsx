import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti, { type Shape } from 'canvas-confetti'

export interface CelebrationProps {
  trigger: boolean
  type?: 'confetti' | 'fireworks' | 'stars' | 'coins'
  duration?: number
  message?: string
  prize?: number
  onComplete?: () => void
}

const Celebration = ({
  trigger,
  type = 'confetti',
  duration = 2500,
  message = 'Congratulations!',
  prize,
  onComplete,
}: CelebrationProps) => {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!trigger) return

    setIsActive(true)

    // Trigger confetti based on type
    switch (type) {
      case 'confetti':
        triggerConfetti()
        break
      case 'fireworks':
        triggerFireworks()
        break
      case 'stars':
        triggerStars()
        break
      case 'coins':
        triggerCoins()
        break
    }

    const timeout = setTimeout(() => {
      setIsActive(false)
      onComplete?.()
    }, duration)

    return () => clearTimeout(timeout)
  }, [trigger, type, duration, onComplete])

  const triggerConfetti = () => {
    const count = 100 // Reduced from 200
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#9D4EDD', '#A855F7', '#C084FC', '#6A4C93', '#F1F1F1'],
      zIndex: 10001, // Higher than modal
    }

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      })
    }

    // Quick burst pattern for faster celebration
    fire(0.4, {
      spread: 60,
      startVelocity: 60,
    })
    fire(0.3, {
      spread: 100,
      decay: 0.92,
      scalar: 0.9,
    })
    fire(0.3, {
      spread: 120,
      startVelocity: 40,
      decay: 0.94,
      scalar: 1.1,
    })
  }

  const triggerFireworks = () => {
    const fireworkDuration = 2 * 1000 // Reduced from 5s to 2s
    const animationEnd = Date.now() + fireworkDuration
    const defaults = { startVelocity: 35, spread: 360, ticks: 50, zIndex: 10001 } // Faster, fewer ticks

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 30 * (timeLeft / fireworkDuration) // Reduced particle count

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.2, 0.4), y: Math.random() - 0.1 },
        colors: ['#9D4EDD', '#A855F7', '#C084FC'],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.6, 0.8), y: Math.random() - 0.1 },
        colors: ['#6A4C93', '#F1F1F1', '#A855F7'],
      })
    }, 150) // Faster interval
  }

  const triggerStars = () => {
    const defaults = {
      spread: 360,
      ticks: 60, // Reduced from 100
      gravity: 0,
      decay: 0.96, // Faster decay
      startVelocity: 35,
      shapes: ['star'],
      colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
      zIndex: 10001,
    }

    function shoot() {
      confetti({
        ...defaults,
        particleCount: 25, // Reduced from 40
        scalar: 1.1,
        shapes: ['star'] as Shape[],
      })

      confetti({
        ...defaults,
        particleCount: 8, // Reduced from 10
        scalar: 0.8,
        shapes: ['circle'] as Shape[],
      })
    }

    // Quick succession for fast impact
    setTimeout(shoot, 0)
    setTimeout(shoot, 50)
    setTimeout(shoot, 100)
  }

  const triggerCoins = () => {
    const defaults = {
      spread: 360,
      ticks: 80, // Reduced from 200
      gravity: 1.2, // Faster fall
      decay: 0.96, // Faster decay
      startVelocity: 35,
      shapes: ['circle'] as Shape[],
      colors: ['#FFD700', '#FFA500', '#FFD700', '#FFA500'],
      zIndex: 10001,
    }

    confetti({
      ...defaults,
      particleCount: 60, // Reduced from 100
      scalar: 1,
      origin: { y: -0.1 },
    })
  }

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Message overlay */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <motion.h1
                className="text-6xl font-bold gradient-text mb-4"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: 2, // Only repeat twice instead of infinite
                }}
              >
                {message}
              </motion.h1>
              
              {prize && (
                <motion.div
                  className="text-4xl font-bold text-success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  You Won ${prize.toLocaleString()}!
                </motion.div>
              )}

              {/* Trophy icon */}
              <motion.div
                className="text-8xl mt-8"
                animate={{
                  rotate: [0, -5, 5, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.2,
                  repeat: 1, // Only repeat once
                }}
              >
                🏆
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Background glow */}
          <motion.div
            className="fixed inset-0 z-[9998] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-highlight-1/30" />
          </motion.div>

          {/* Optimized floating elements */}
          {type === 'coins' && (
            <div className="fixed inset-0 z-[9999] pointer-events-none">
              {[...Array(12)].map((_, i) => ( // Reduced from 20 to 12
                <motion.div
                  key={i}
                  className="absolute w-10 h-10 text-3xl" // Slightly smaller
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: -50,
                  }}
                  animate={{
                    y: window.innerHeight + 50,
                    rotate: 360,
                  }}
                  transition={{
                    duration: 1.5 + Math.random() * 1, // Faster: 1.5-2.5s instead of 3-5s
                    delay: Math.random() * 0.5, // Reduced delay
                    ease: 'linear',
                  }}
                >
                  💰
                </motion.div>
              ))}
            </div>
          )}

          {type === 'stars' && (
            <div className="fixed inset-0 z-[9999] pointer-events-none">
              {[...Array(18)].map((_, i) => ( // Reduced from 30 to 18
                <motion.div
                  key={i}
                  className="absolute text-xl" // Slightly smaller
                  initial={{
                    x: '50%',
                    y: '50%',
                    scale: 0,
                  }}
                  animate={{
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    scale: [0, 1.2, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 1.2, // Faster
                    delay: Math.random() * 0.3, // Reduced delay
                    repeat: 1, // Only repeat once
                  }}
                >
                  ⭐
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}

export default Celebration