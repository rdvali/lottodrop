import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import styles from './JoinRoomButton.module.css'

interface JoinRoomButtonProps {
  roomStatus: 'waiting' | 'in_progress' | 'completed'
  entryFee: number
  isWinner: boolean
  onJoin: () => Promise<void>
  disabled?: boolean
  className?: string
}

export const JoinRoomButton: React.FC<JoinRoomButtonProps> = ({
  roomStatus,
  entryFee,
  onJoin,
  disabled = false,
  className
}) => {
  const [isJoining, setIsJoining] = useState(false)
  const [buttonState, setButtonState] = useState<'disabled' | 'waiting' | 'ready'>('disabled')
  const [countdown, setCountdown] = useState<number | null>(null)

  // Update button state based on room status
  useEffect(() => {
    if (roomStatus === 'waiting') {
      setButtonState('ready')
      setCountdown(null)
    } else if (roomStatus === 'in_progress') {
      setButtonState('waiting')
      // Start countdown when room is in progress
      setCountdown(10) // Start with 10 seconds
    } else {
      setButtonState('disabled')
      setCountdown(null)
    }
  }, [roomStatus])

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setTimeout(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) return null
        return prev - 1
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  const handleJoin = async () => {
    if (buttonState !== 'ready' || isJoining || disabled) return

    setIsJoining(true)
    try {
      await onJoin()
    } finally {
      setIsJoining(false)
    }
  }

  const getButtonText = () => {
    if (isJoining) return 'Joining...'
    if (buttonState === 'waiting' && countdown !== null) {
      return `Next round starts in ${countdown}s...`
    }
    if (buttonState === 'waiting') return 'Waiting for next round...'
    if (buttonState === 'ready') return `🎮 Play Again ($${entryFee})`
    return 'Room Unavailable'
  }

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={buttonState}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={buttonState === 'ready' ? {
          y: -2,
          boxShadow: "0 10px 30px rgba(157, 78, 221, 0.3)"
        } : {}}
        whileTap={buttonState === 'ready' ? { scale: 0.98 } : {}}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        onClick={handleJoin}
        disabled={buttonState !== 'ready' || isJoining || disabled}
        className={clsx(
          styles.joinButton,
          buttonState === 'ready' ? styles.ready :
          buttonState === 'waiting' ? styles.waiting :
          styles.disabled,
          {
            [styles.loading]: isJoining
          },
          className
        )}
      >
        {/* Shimmer effect for ready state */}
        {buttonState === 'ready' && !isJoining && (
          <motion.div
            className={styles.shimmer}
            animate={{
              x: ["-200%", "200%"]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 1
            }}
          />
        )}

        {/* Loading spinner */}
        {isJoining && (
          <motion.div
            className={styles.spinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Button text with countdown animation */}
        <span className={styles.buttonText}>
          {buttonState === 'waiting' && countdown !== null ? (
            <motion.span
              key={countdown}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Next round in</span>
              <motion.span
                key={`countdown-${countdown}`}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{
                  fontWeight: 'bold',
                  fontSize: '1.2em',
                  color: countdown <= 5 ? '#FCA311' : 'inherit'
                }}
              >
                {countdown}
              </motion.span>
              <span>seconds</span>
            </motion.span>
          ) : (
            getButtonText()
          )}
        </span>

        {/* Glow effect when ready */}
        {buttonState === 'ready' && !isJoining && (
          <motion.div
            className={styles.glow}
            animate={{
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </motion.button>
    </AnimatePresence>
  )
}

export default JoinRoomButton