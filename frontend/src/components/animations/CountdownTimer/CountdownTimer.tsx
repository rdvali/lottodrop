import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export interface CountdownTimerProps {
  seconds: number
  onComplete?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showProgress?: boolean
  className?: string
}

const CountdownTimer = ({
  seconds,
  onComplete,
  size = 'lg',
  showProgress = true,
  className,
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(seconds)
  const [isComplete, setIsComplete] = useState(false)
  const [initialSeconds] = useState(seconds) // Store initial value for progress calculation
  const [animationKey, setAnimationKey] = useState(0) // Key to reset animation

  useEffect(() => {
    setTimeLeft(seconds)
    setIsComplete(false)
    setAnimationKey(prev => prev + 1) // Reset animation when seconds change
  }, [seconds])

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsComplete(true)
      onComplete?.()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsComplete(true)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onComplete])

  const sizes = {
    sm: { container: 'w-24 h-24', text: 'text-2xl', ring: 3 },
    md: { container: 'w-32 h-32', text: 'text-3xl', ring: 4 },
    lg: { container: 'w-48 h-48', text: 'text-5xl', ring: 6 },
    xl: { container: 'w-64 h-64', text: 'text-6xl', ring: 8 },
  }

  const sizeConfig = sizes[size]
  const circumference = 2 * Math.PI * 45 // radius = 45 for viewBox 100x100

  // Color based on time remaining
  const getColor = () => {
    const percentage = (timeLeft / initialSeconds) * 100
    if (percentage > 60) return '#10B981' // Green
    if (percentage > 30) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }

  return (
    <div className={clsx('relative inline-block', className)}>
      <div className={clsx('relative', sizeConfig.container)}>
        {/* Background circle */}
        {showProgress && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth={sizeConfig.ring}
              className="text-gray-700"
            />
            
            {/* Progress circle - fills up as countdown progresses */}
            <motion.circle
              key={animationKey} // Reset animation when countdown restarts
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getColor()}
              strokeWidth={sizeConfig.ring}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{
                strokeDashoffset: circumference // Start with empty circle
              }}
              animate={{
                strokeDashoffset: 0 // Fill up to complete circle
              }}
              transition={{
                duration: initialSeconds,
                ease: 'linear',
                times: [0, 1]
              }}
            />
          </svg>
        )}

        {/* Timer display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isComplete ? (
              <motion.div
                key={timeLeft}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className={clsx('font-bold', sizeConfig.text)} style={{ color: getColor() }}>
                  {timeLeft}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {timeLeft === 1 ? 'second' : 'seconds'}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10 }}
                className="text-center"
              >
                <div className={clsx('font-bold text-success', sizeConfig.text)}>
                  GO!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pulse effect for last 3 seconds */}
        {timeLeft <= 3 && timeLeft > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-current"
            style={{ borderColor: getColor() }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          />
        )}

        {/* Completion burst effect */}
        {isComplete && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-success rounded-full"
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                }}
                animate={{
                  x: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
                  y: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 0.6,
                  ease: 'easeOut',
                }}
                style={{
                  left: '-4px',
                  top: '-4px',
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Warning glow for last 5 seconds */}
      {timeLeft <= 5 && timeLeft > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              `0 0 20px ${getColor()}40`,
              `0 0 40px ${getColor()}60`,
              `0 0 20px ${getColor()}40`,
            ],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        />
      )}
    </div>
  )
}

export default CountdownTimer
// Force rebuild Tue Sep 16 16:44:13 +04 2025
