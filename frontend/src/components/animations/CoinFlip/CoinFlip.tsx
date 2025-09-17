import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export interface CoinFlipProps {
  isFlipping: boolean
  result?: 'heads' | 'tails'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onFlipComplete?: (result: 'heads' | 'tails') => void
  className?: string
}

const CoinFlip = ({
  isFlipping,
  result,
  size = 'lg',
  onFlipComplete,
  className,
}: CoinFlipProps) => {
  const [currentSide, setCurrentSide] = useState<'heads' | 'tails'>('heads')
  const [isAnimating, setIsAnimating] = useState(false)

  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  }

  const handleFlip = () => {
    if (isAnimating) return
    
    setIsAnimating(true)
    
    // Determine final result
    const finalResult = result || (Math.random() > 0.5 ? 'heads' : 'tails')
    
    // After animation completes
    setTimeout(() => {
      setCurrentSide(finalResult)
      setIsAnimating(false)
      onFlipComplete?.(finalResult)
    }, 2000)
  }

  // Trigger flip when isFlipping changes to true
  if (isFlipping && !isAnimating) {
    handleFlip()
  }

  return (
    <div className={clsx('relative', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isAnimating ? 'flipping' : currentSide}
          className={clsx(
            'relative preserve-3d',
            sizes[size]
          )}
          animate={
            isAnimating
              ? {
                  rotateY: [0, 360 * 5 + (result === 'tails' ? 180 : 0)],
                  scale: [1, 1.2, 1],
                  y: [0, -50, 0],
                }
              : {
                  rotateY: currentSide === 'tails' ? 180 : 0,
                }
          }
          transition={
            isAnimating
              ? {
                  duration: 2,
                  ease: [0.4, 0, 0.2, 1],
                  times: [0, 0.5, 1],
                }
              : {
                  duration: 0.3,
                }
          }
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Heads side */}
          <div
            className={clsx(
              'absolute inset-0 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-primary to-highlight-1',
              'shadow-xl border-4 border-primary/50',
              'backface-hidden'
            )}
            style={{
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="text-center">
              <div className="text-white font-bold text-2xl">L</div>
              <div className="text-white/80 text-xs">HEADS</div>
            </div>
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>

          {/* Tails side */}
          <div
            className={clsx(
              'absolute inset-0 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-highlight-2 to-primary',
              'shadow-xl border-4 border-highlight-1/50',
              'backface-hidden'
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-center">
              <div className="text-white font-bold text-2xl">D</div>
              <div className="text-white/80 text-xs">TAILS</div>
            </div>
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>

          {/* Edge of coin */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #6A4C93, #9D4EDD)',
              transform: 'rotateY(90deg)',
              transformOrigin: 'center',
              width: '10px',
              height: '100%',
              left: '50%',
              marginLeft: '-5px',
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Shadow */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/30 rounded-full blur-md"
        animate={
          isAnimating
            ? {
                scale: [1, 0.7, 1],
                opacity: [0.3, 0.1, 0.3],
              }
            : {}
        }
        transition={{
          duration: 2,
          times: [0, 0.5, 1],
        }}
      />

      {/* Sparkles during flip */}
      {isAnimating && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                scale: 0,
              }}
              animate={{
                x: `${50 + 30 * Math.cos((i * Math.PI * 2) / 8)}%`,
                y: `${50 + 30 * Math.sin((i * Math.PI * 2) / 8)}%`,
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1,
                delay: i * 0.1,
                repeat: 2,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default CoinFlip