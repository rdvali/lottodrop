import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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

  // FIX: Use ref pattern to prevent stale closure (fixes frozen confetti bug)
  const onCompleteRef = useRef(onComplete)

  // Update ref when onComplete changes (separate effect)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    // FIX: Immediately hide celebration when trigger becomes false
    if (!trigger && isActive) {
      setIsActive(false)
      onCompleteRef.current?.()
      return
    }

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
      onCompleteRef.current?.()
    }, duration)

    return () => clearTimeout(timeout)
  }, [trigger, type, duration, isActive])

  const triggerConfetti = () => {
    const count = 100 // Reduced from 200
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#9D4EDD', '#A855F7', '#C084FC', '#6A4C93', '#F1F1F1'],
      zIndex: 10002, // FIX: Higher than modal (modal is z-9999)
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
    const defaults = { startVelocity: 35, spread: 360, ticks: 50, zIndex: 10002 } // FIX: Higher than modal

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
      zIndex: 10002, // FIX: Higher than modal
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
      zIndex: 10002, // FIX: Higher than modal
    }

    confetti({
      ...defaults,
      particleCount: 60, // Reduced from 100
      scalar: 1,
      origin: { y: -0.1 },
    })
  }

  // FIX: Create or get celebration root portal
  const getCelebrationRoot = () => {
    let celebrationRoot = document.getElementById('celebration-root')
    if (!celebrationRoot) {
      celebrationRoot = document.createElement('div')
      celebrationRoot.id = 'celebration-root'
      celebrationRoot.style.position = 'fixed'
      celebrationRoot.style.top = '0'
      celebrationRoot.style.left = '0'
      celebrationRoot.style.width = '100%'
      celebrationRoot.style.height = '100%'
      celebrationRoot.style.pointerEvents = 'none'
      celebrationRoot.style.zIndex = '10002' // FIX: Higher than modal
      document.body.appendChild(celebrationRoot)
    }
    return celebrationRoot
  }

  const celebrationContent = (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Message overlay */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[10002] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Enhanced backdrop for better contrast - Responsive */}
            <motion.div
              className="absolute"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              style={{
                background: 'radial-gradient(circle, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 70%)',
                width: window.innerWidth < 768 ? '400px' : '800px',
                height: window.innerWidth < 768 ? '400px' : '800px',
                borderRadius: '50%',
                filter: window.innerWidth < 768 ? 'blur(25px)' : 'blur(40px)',
              }}
            />

            <motion.div
              className="text-center relative px-4 sm:px-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              {/* Pulsing glow effect behind text - Responsive */}
              <motion.div
                className="absolute inset-0"
                animate={{
                  opacity: [0.3, 0.8, 0.3],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                style={{
                  background: 'radial-gradient(circle, rgba(157, 78, 221, 0.6) 0%, transparent 70%)',
                  filter: window.innerWidth < 768 ? 'blur(40px)' : 'blur(60px)',
                  zIndex: -1,
                }}
              />

              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-3 sm:mb-4 md:mb-6"
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: 2,
                }}
                style={{
                  color: '#FFFFFF',
                  textShadow: window.innerWidth < 768
                    ? `
                      0 0 15px rgba(157, 78, 221, 1),
                      0 0 30px rgba(157, 78, 221, 0.8),
                      0 0 45px rgba(157, 78, 221, 0.6),
                      0 3px 6px rgba(0, 0, 0, 0.8)
                    `
                    : `
                      0 0 20px rgba(157, 78, 221, 1),
                      0 0 40px rgba(157, 78, 221, 0.8),
                      0 0 60px rgba(157, 78, 221, 0.6),
                      0 0 80px rgba(168, 85, 247, 0.4),
                      0 4px 8px rgba(0, 0, 0, 0.8)
                    `,
                  WebkitTextStroke: window.innerWidth < 768 ? '1px rgba(157, 78, 221, 0.3)' : '2px rgba(157, 78, 221, 0.3)',
                  letterSpacing: '0.05em',
                }}
              >
                {message}
              </motion.h1>

              {prize && (
                <motion.div
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 md:mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    color: '#10B981',
                    textShadow: window.innerWidth < 768
                      ? `
                        0 0 15px rgba(16, 185, 129, 0.8),
                        0 0 30px rgba(16, 185, 129, 0.5),
                        0 3px 8px rgba(0, 0, 0, 0.8)
                      `
                      : `
                        0 0 20px rgba(16, 185, 129, 0.8),
                        0 0 40px rgba(16, 185, 129, 0.5),
                        0 4px 12px rgba(0, 0, 0, 0.8)
                      `,
                    WebkitTextStroke: window.innerWidth < 768 ? '0.5px rgba(16, 185, 129, 0.3)' : '1px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  You Won ${prize.toLocaleString()}!
                </motion.div>
              )}

              {/* Enhanced Trophy icon with glow - Responsive */}
              <motion.div
                className="relative inline-block"
                animate={{
                  rotate: [0, -8, 8, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 1.2,
                  repeat: 1,
                }}
              >
                {/* Trophy glow effect - Responsive */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [0.9, 1.2, 0.9],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, transparent 70%)',
                    filter: window.innerWidth < 768 ? 'blur(20px)' : 'blur(30px)',
                    transform: 'translate(-50%, -50%)',
                    left: '50%',
                    top: '50%',
                    width: window.innerWidth < 768 ? '120px' : '200px',
                    height: window.innerWidth < 768 ? '120px' : '200px',
                  }}
                />
                <div
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl relative"
                  style={{
                    filter: window.innerWidth < 768
                      ? 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 215, 0, 0.5))'
                      : 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.5))',
                  }}
                >
                  🏆
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Background glow */}
          <motion.div
            className="fixed inset-0 z-[10001] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-highlight-1/30" />
          </motion.div>

          {/* Optimized floating elements */}
          {type === 'coins' && (
            <div className="fixed inset-0 z-[10002] pointer-events-none">
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
            <div className="fixed inset-0 z-[10002] pointer-events-none">
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

  // FIX: Render celebration in a portal at body level to ensure proper z-index stacking
  return createPortal(celebrationContent, getCelebrationRoot())
}

export default Celebration