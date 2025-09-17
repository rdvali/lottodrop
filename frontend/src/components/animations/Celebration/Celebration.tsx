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
  duration = 5000,
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
    const count = 200
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#9D4EDD', '#A855F7', '#C084FC', '#6A4C93', '#F1F1F1'],
    }

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      })
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    })
    fire(0.2, {
      spread: 60,
    })
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    })
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    })
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    })
  }

  const triggerFireworks = () => {
    const duration = 5 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#9D4EDD', '#A855F7', '#C084FC'],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#6A4C93', '#F1F1F1', '#A855F7'],
      })
    }, 250)
  }

  const triggerStars = () => {
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ['star'],
      colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
    }

    function shoot() {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ['star'] as Shape[],
      })

      confetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        shapes: ['circle'] as Shape[],
      })
    }

    setTimeout(shoot, 0)
    setTimeout(shoot, 100)
    setTimeout(shoot, 200)
  }

  const triggerCoins = () => {
    const defaults = {
      spread: 360,
      ticks: 200,
      gravity: 1,
      decay: 0.94,
      startVelocity: 30,
      shapes: ['circle'] as Shape[],
      colors: ['#FFD700', '#FFA500', '#FFD700', '#FFA500'],
    }

    confetti({
      ...defaults,
      particleCount: 100,
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
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
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
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
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
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                🏆
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Background glow */}
          <motion.div
            className="fixed inset-0 z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-highlight-1/30" />
          </motion.div>

          {/* Floating elements */}
          {type === 'coins' && (
            <div className="fixed inset-0 z-45 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-12 h-12 text-4xl"
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: -50,
                  }}
                  animate={{
                    y: window.innerHeight + 50,
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 2,
                    ease: 'linear',
                  }}
                >
                  💰
                </motion.div>
              ))}
            </div>
          )}

          {type === 'stars' && (
            <div className="fixed inset-0 z-45 pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  initial={{
                    x: '50%',
                    y: '50%',
                    scale: 0,
                  }}
                  animate={{
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    scale: [0, 1, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.5,
                    repeat: 2,
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