import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

  // Reset when seconds prop changes
  useEffect(() => {
    setTimeLeft(seconds)
    setIsComplete(false)
  }, [seconds])

  // Simple countdown effect - just decrement the timeLeft that we display
  useEffect(() => {
    // Don't start timer if already complete or no time
    if (timeLeft <= 0) {
      if (!isComplete && timeLeft === 0) {
        setIsComplete(true)
        // Show GO! for 1 second then call onComplete
        setTimeout(() => {
          onComplete?.()
        }, 1000)
      }
      return
    }

    // Simple interval timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isComplete, onComplete])

  const sizes = {
    sm: { container: 'w-24 h-24', text: 'text-2xl', ring: 3 },
    md: { container: 'w-32 h-32', text: 'text-3xl', ring: 4 },
    lg: { container: 'w-48 h-48', text: 'text-5xl', ring: 6 },
    xl: { container: 'w-64 h-64', text: 'text-6xl', ring: 8 },
  }

  const sizeConfig = sizes[size]
  const circumference = 2 * Math.PI * 45
  const progress = ((seconds - timeLeft) / seconds) * circumference

  // Simple color based on time remaining (adjusted for 5 second countdown)
  const getColor = () => {
    if (timeLeft > 3) return '#10B981' // Green (5-4)
    if (timeLeft > 1) return '#F59E0B' // Yellow (3-2)
    return '#EF4444' // Red (1-0)
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

            {/* Progress circle - simple smooth fill */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getColor()}
              strokeWidth={sizeConfig.ring}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease'
              }}
            />
          </svg>
        )}

        {/* Timer display - simple and clean */}
        <div className="absolute inset-0 flex items-center justify-center">
          {!isComplete ? (
            <div className="text-center">
              <div
                className={clsx('font-bold', sizeConfig.text)}
                style={{ color: getColor() }}
              >
                {timeLeft}
              </div>
              {timeLeft <= 2 && timeLeft > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Get Ready!
                </div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className={clsx('font-bold text-success', sizeConfig.text)}>
                GO!
              </div>
            </motion.div>
          )}
        </div>

        {/* Simple pulse for last 2 seconds */}
        {timeLeft <= 2 && timeLeft > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: getColor() }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          />
        )}
      </div>

      {/* Simple glow for last 2 seconds */}
      {timeLeft <= 2 && timeLeft > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              `0 0 20px ${getColor()}40`,
              `0 0 30px ${getColor()}20`,
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