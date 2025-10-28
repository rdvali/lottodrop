import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export interface CountdownTimerProps {
  seconds: number
  onComplete?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showProgress?: boolean
  className?: string
}

/**
 * Server-Authoritative Countdown Timer
 *
 * Fixes: BUG-009, BUG-015
 *
 * Problem: Component ran independent local timer that drifted from server time
 * Solution: Directly display server-provided `seconds` value, no local timer
 *
 * The server emits countdown events every ~1000ms with the current value.
 * We trust the server's value and display it immediately.
 */
const CountdownTimer = ({
  seconds,
  onComplete,
  size = 'lg',
  showProgress = true,
  className,
}: CountdownTimerProps) => {
  const [isComplete, setIsComplete] = useState(false)
  const previousSecondsRef = useRef<number>(seconds)
  const initialSecondsRef = useRef<number>(seconds)
  const completedRef = useRef(false)

  // Track initial value for progress calculation
  useEffect(() => {
    if (seconds > previousSecondsRef.current) {
      // New countdown started (seconds increased)
      initialSecondsRef.current = seconds
      setIsComplete(false)
      completedRef.current = false
    }
    previousSecondsRef.current = seconds
  }, [seconds])

  // Trigger completion when countdown reaches 0
  useEffect(() => {
    if (seconds === 0 && !completedRef.current) {
      setIsComplete(true)
      completedRef.current = true

      // Show GO! for 1 second then call onComplete
      const timer = setTimeout(() => {
        onComplete?.()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [seconds, onComplete])

  const sizes = {
    sm: { container: 'w-24 h-24', text: 'text-2xl', ring: 3 },
    md: { container: 'w-32 h-32', text: 'text-3xl', ring: 4 },
    lg: { container: 'w-48 h-48', text: 'text-5xl', ring: 6 },
    xl: { container: 'w-64 h-64', text: 'text-6xl', ring: 8 },
  }

  const sizeConfig = sizes[size]
  const circumference = 2 * Math.PI * 45

  // Progress based on server-provided countdown value (fixes BUG-009)
  const initialSeconds = initialSecondsRef.current
  const elapsed = initialSeconds - seconds
  const progress = (elapsed / initialSeconds) * circumference

  // Color based on server time remaining (fixes BUG-009)
  const getColor = () => {
    if (seconds > 3) return '#10B981' // Green (>3)
    if (seconds > 1) return '#F59E0B' // Yellow (2-3)
    return '#EF4444' // Red (0-1)
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
                {seconds}
              </div>
              {seconds <= 2 && seconds > 0 && (
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
        {seconds <= 2 && seconds > 0 && (
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
      {seconds <= 2 && seconds > 0 && (
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