import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface EnableSoundBannerProps {
  onEnable: () => Promise<void>
  onDismiss: () => void
  autoDismissDelay?: number
  isVisible: boolean
}

const EnableSoundBanner = ({
  onEnable,
  onDismiss,
  autoDismissDelay = 8000,
  isVisible,
}: EnableSoundBannerProps) => {
  const [progress, setProgress] = useState(100)
  const [isEnabling, setIsEnabling] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setProgress(100)
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (autoDismissDelay / 100))
        if (newProgress <= 0) {
          clearInterval(interval)
          onDismiss()
          return 0
        }
        return newProgress
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isVisible, autoDismissDelay, onDismiss])

  const handleEnable = async () => {
    setIsEnabling(true)
    try {
      await onEnable()
    } catch (error) {
      console.error('Failed to enable audio:', error)
    } finally {
      setIsEnabling(false)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none"
        >
          <div className="container mx-auto px-4 pt-4">
            <div className="relative overflow-hidden rounded-xl shadow-2xl pointer-events-auto">
              {/* Gradient Background */}
              <div className="bg-gradient-to-r from-purple-900/95 to-purple-800/95 backdrop-blur-lg border border-purple-700/50">
                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-950/50">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: '100%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1, ease: 'linear' }}
                  />
                </div>

                <div className="px-6 py-4 flex items-center justify-between gap-4">
                  {/* Icon + Message */}
                  <div className="flex items-center gap-4">
                    {/* Animated Sound Wave Icon */}
                    <motion.div
                      className="flex items-center gap-1"
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <div className="flex items-end gap-0.5 h-6">
                        {[0.4, 0.8, 1, 0.6, 0.9].map((scale, i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-purple-400 rounded-full"
                            animate={{
                              height: [`${scale * 100}%`, `${scale * 60}%`, `${scale * 100}%`],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.1,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>

                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        Enable Sound for Full Experience
                      </h3>
                      <p className="text-purple-200 text-sm">
                        Hear countdown timers, win celebrations, and game effects
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEnable}
                      disabled={isEnabling}
                      className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isEnabling ? (
                        <>
                          <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                          <span>Enabling...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                          </svg>
                          <span>Enable Sound</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onDismiss}
                      className="px-4 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200"
                    >
                      Play Silent
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default EnableSoundBanner
