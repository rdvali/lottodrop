import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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

  // FIX: Add safety countdown that persists regardless of room status changes
  const [isCountdownActive, setIsCountdownActive] = useState(false)
  const [safetyCountdown, setSafetyCountdown] = useState<number | null>(null)

  // Update button state based on room status
  useEffect(() => {
    if (roomStatus === 'waiting') {
      // FIX: Don't set to 'ready' immediately if safety countdown is still active
      // This prevents joining old rounds when backend resets room before countdown finishes
      if (!isCountdownActive) {
        setButtonState('ready')
        setSafetyCountdown(null)
      }
      // If countdown is active, let it complete naturally
      setCountdown(null) // Clear display countdown (using safetyCountdown now)
    } else if (roomStatus === 'in_progress') {
      setButtonState('waiting')
      // Start countdown when room is in progress
      setCountdown(10) // Start with 10 seconds
      // FIX: Activate safety countdown to prevent premature clicks
      setIsCountdownActive(true)
      setSafetyCountdown(10)
    } else {
      setButtonState('disabled')
      setCountdown(null)
      setIsCountdownActive(false)
      setSafetyCountdown(null)
    }
  }, [roomStatus, isCountdownActive])

  // Countdown timer (original - for display purposes)
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

  // FIX: Safety countdown - MUST complete before allowing button clicks
  // This countdown persists even if roomStatus changes to 'waiting'
  useEffect(() => {
    if (safetyCountdown === null || safetyCountdown <= 0) {
      setIsCountdownActive(false)
      return
    }

    const timer = setTimeout(() => {
      setSafetyCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Countdown complete - enable button if room is ready
          setIsCountdownActive(false)
          if (roomStatus === 'waiting') {
            setButtonState('ready')
          }
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [safetyCountdown, roomStatus])

  const handleJoin = async () => {
    // FIX: Add safety countdown check to prevent premature clicks
    if (buttonState !== 'ready' || isCountdownActive || isJoining || disabled) return

    // Additional safety check - verify countdown has completed
    if (safetyCountdown !== null && safetyCountdown > 0) return

    setIsJoining(true)
    try {
      await onJoin()
    } finally {
      setIsJoining(false)
    }
  }

  const getButtonText = () => {
    if (isJoining) return 'Joining...'
    // FIX: Use safetyCountdown for display (persists across room status changes)
    if (isCountdownActive && safetyCountdown !== null) {
      return `Next round starts in ${safetyCountdown}s...`
    }
    if (buttonState === 'waiting' && countdown !== null) {
      return `Next round starts in ${countdown}s...`
    }
    if (buttonState === 'waiting') return 'Waiting for next round...'
    if (buttonState === 'ready') return `🎮 Play Again ($${entryFee})`
    return 'Room Unavailable'
  }

  return (
      <motion.button
        // FIX: Remove key={buttonState} to prevent re-mounting issues
        // Use animate prop to smoothly transition between states instead
        animate={{
          opacity: 1,
          y: 0
        }}
        whileHover={buttonState === 'ready' && !isCountdownActive && !isJoining ? {
          y: -2,
          boxShadow: "0 10px 30px rgba(157, 78, 221, 0.3)"
        } : {}}
        whileTap={buttonState === 'ready' && !isCountdownActive && !isJoining ? { scale: 0.98 } : {}}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        onClick={handleJoin}
        // FIX: Include countdown state in disabled logic
        disabled={buttonState !== 'ready' || isCountdownActive || isJoining || disabled}
        // FIX: Add ARIA attributes for accessibility
        aria-disabled={buttonState !== 'ready' || isCountdownActive || isJoining || disabled}
        aria-label={
          isCountdownActive && safetyCountdown !== null
            ? `Play again button. Next round starts in ${safetyCountdown} seconds. Button will be enabled when countdown completes.`
            : buttonState === 'ready'
            ? `Play again. Entry fee is ${entryFee} dollars`
            : 'Play again button. Waiting for next round.'
        }
        className={clsx(
          styles.joinButton,
          buttonState === 'ready' && !isCountdownActive ? styles.ready :
          (buttonState === 'waiting' || isCountdownActive) ? styles.waiting :
          styles.disabled,
          {
            [styles.loading]: isJoining,
            [styles.countdownActive]: isCountdownActive // FIX: New class for countdown state
          },
          className
        )}
        style={{
          cursor: isCountdownActive ? 'not-allowed' : undefined
        }}
      >
        {/* Shimmer effect for ready state */}
        {/* FIX: Only show shimmer when truly ready (not during countdown) */}
        {buttonState === 'ready' && !isCountdownActive && !isJoining && (
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
          {/* FIX: Prioritize safetyCountdown for display (persists across room status changes) */}
          {isCountdownActive && safetyCountdown !== null ? (
            <motion.span
              key={safetyCountdown}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Next round in</span>
              <motion.span
                key={`safety-countdown-${safetyCountdown}`}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{
                  fontWeight: 'bold',
                  fontSize: '1.2em',
                  color: safetyCountdown <= 5 ? '#FCA311' : 'inherit'
                }}
              >
                {safetyCountdown}
              </motion.span>
              <span>seconds</span>
            </motion.span>
          ) : buttonState === 'waiting' && countdown !== null ? (
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
        {/* FIX: Only show glow when truly ready (not during countdown) */}
        {buttonState === 'ready' && !isCountdownActive && !isJoining && (
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
  )
}

export default JoinRoomButton