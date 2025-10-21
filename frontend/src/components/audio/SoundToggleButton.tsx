import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SoundToggleButtonProps {
  isEnabled: boolean
  audioState: 'running' | 'suspended' | 'closed' | 'interrupted'
  onToggle: () => Promise<void>
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showTooltip?: boolean
}

const SoundToggleButton = ({
  isEnabled,
  audioState,
  onToggle,
  position = 'bottom-right',
  showTooltip = true,
}: SoundToggleButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showTooltipState, setShowTooltipState] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      await onToggle()
    } catch (error) {
      console.error('Failed to toggle audio:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  // Button state configuration
  const getButtonConfig = () => {
    if (isLoading) {
      return {
        gradient: 'from-purple-500 to-purple-600',
        icon: null,
        tooltip: 'Loading...',
        animate: false,
      }
    }

    if (isEnabled && audioState === 'running') {
      return {
        gradient: 'from-green-500 to-green-600',
        icon: (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        ),
        tooltip: 'Sound Enabled - Click to disable',
        animate: true,
      }
    }

    if (!isEnabled || audioState === 'closed') {
      return {
        gradient: 'from-gray-700 to-gray-800',
        icon: (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ),
        tooltip: 'Sound Disabled - Click to enable',
        animate: false,
      }
    }

    // audioState === 'suspended' or 'interrupted'
    return {
      gradient: 'from-yellow-500 to-yellow-600',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
      ),
      tooltip: 'Audio Waiting - Tap to enable sound',
      animate: true,
    }
  }

  const config = getButtonConfig()

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[9999]`}
      onMouseEnter={() => showTooltip && setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && showTooltipState && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full mb-2 right-0 px-3 py-2 bg-gray-900/95 text-white text-sm rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
          >
            {config.tooltip}
            <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-gray-900/95" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <motion.button
        onClick={handleToggle}
        disabled={isLoading}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        className={`
          relative w-14 h-14 rounded-full shadow-2xl
          bg-gradient-to-br ${config.gradient}
          text-white transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center
          overflow-hidden
        `}
      >
        {/* Pulse animation for enabled state */}
        {config.animate && !isLoading && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white/30"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Icon or Loading Spinner */}
        <div className="relative z-10">
          {isLoading ? (
            <motion.div
              className="w-6 h-6 border-3 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <motion.div
              key={`icon-${isEnabled}-${audioState}`}
              initial={{ rotate: 0, scale: 0 }}
              animate={{ rotate: 360, scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            >
              {config.icon}
            </motion.div>
          )}
        </div>

        {/* Ripple effect on click */}
        <motion.div
          key={`ripple-${Date.now()}`}
          className="absolute inset-0 rounded-full bg-white/50"
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </motion.button>

      {/* Badge for waiting state */}
      {audioState === 'suspended' && !isLoading && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900 flex items-center justify-center"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 bg-white rounded-full"
          />
        </motion.div>
      )}
    </div>
  )
}

export default SoundToggleButton
