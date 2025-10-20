/**
 * ProgressIndicators Component
 * Visual progress stepper for 3-phase lottery winner reveal animation
 *
 * Phases:
 * - Gathering Participants (0-2s)
 * - Computing Randomness (2-4s)
 * - Selecting Winner (4-6s)
 *
 * States: upcoming (gray) → active (purple pulse) → completed (gold checkmark)
 */

import { motion, AnimatePresence } from 'framer-motion'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

type LoadingPhase = 'gathering' | 'computing' | 'selecting' | 'selecting-climax'
type PhaseStatus = 'upcoming' | 'active' | 'completed'

export interface ProgressIndicatorsProps {
  /** Current active phase */
  currentPhase: LoadingPhase
  /** Animation variant */
  variant?: 'standard' | 'reduced-motion'
}

interface Phase {
  id: LoadingPhase
  label: string
  shortLabel: string
}

const PHASES: Phase[] = [
  { id: 'gathering', label: 'Gathering Participants', shortLabel: 'Gathering' },
  { id: 'computing', label: 'Computing Randomness', shortLabel: 'Computing' },
  { id: 'selecting', label: 'Selecting Winner', shortLabel: 'Selecting' }
]

/**
 * Get indicator status based on current phase
 */
const getPhaseStatus = (phaseId: LoadingPhase, currentPhase: LoadingPhase): PhaseStatus => {
  // Treat 'selecting-climax' as 'selecting' for progress indicators
  const normalizedCurrentPhase = currentPhase === 'selecting-climax' ? 'selecting' : currentPhase

  const phaseIndex = PHASES.findIndex(p => p.id === phaseId)
  const currentIndex = PHASES.findIndex(p => p.id === normalizedCurrentPhase)

  if (phaseIndex < currentIndex) return 'completed'
  if (phaseIndex === currentIndex) return 'active'
  return 'upcoming'
}

/**
 * Indicator state animations
 */
const indicatorVariants: any = {
  upcoming: {
    scale: 0.85,
    opacity: 0.4,
    backgroundColor: 'rgba(107, 114, 128, 0.1)', // Gray
    borderColor: 'rgba(107, 114, 128, 0.3)',
    boxShadow: '0 0 0px rgba(107, 114, 128, 0)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as any
    }
  },

  active: {
    scale: 1.0,
    opacity: 1,
    backgroundColor: 'rgba(157, 78, 221, 0.2)', // Purple
    borderColor: '#9D4EDD',
    boxShadow: [
      '0 0 20px rgba(157, 78, 221, 0.6)',
      '0 0 30px rgba(157, 78, 221, 0.4)',
      '0 0 20px rgba(157, 78, 221, 0.6)'
    ],
    transition: {
      scale: { type: 'spring', stiffness: 300, damping: 20 },
      backgroundColor: { duration: 0.3, ease: 'easeOut' },
      borderColor: { duration: 0.3, ease: 'easeOut' },
      boxShadow: {
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'mirror' as const
      }
    }
  },

  completed: {
    scale: 1.0,
    opacity: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.15)', // Gold
    borderColor: '#FFD700',
    boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
    transition: {
      scale: { type: 'spring', stiffness: 400, damping: 15 },
      backgroundColor: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
      borderColor: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
      boxShadow: { duration: 0.4, ease: 'easeOut' }
    }
  }
}

/**
 * Checkmark draw-in animation
 */
const checkmarkVariants: any = {
  hidden: {
    pathLength: 0,
    opacity: 0
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.1 }
    }
  }
}

/**
 * Particle burst effect on completion
 */
const burstVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: [0, 1.5, 0],
    opacity: [0, 1, 0],
    transition: {
      duration: 0.6,
      ease: 'easeOut' as any,
      times: [0, 0.5, 1]
    }
  }
}

/**
 * Glow pulse on completion
 */
const glowVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: [0, 0.8, 0],
    scale: [0.5, 1.2, 1],
    transition: {
      duration: 0.5,
      ease: 'easeOut' as any
    }
  }
}

/**
 * Progress fill bar (shows time remaining in active phase)
 */
const progressFillVariants = {
  active: {
    scaleX: [0, 1],
    transition: {
      duration: 2, // Matches 2-second phase duration
      ease: 'linear' as any
    }
  },
  reset: {
    scaleX: 0,
    transition: { duration: 0 }
  }
}

/**
 * Connecting line between indicators
 */
const connectorVariants = {
  inactive: {
    scaleX: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.2)'
  },
  completed: {
    scaleX: 1,
    backgroundColor: '#FFD700',
    transition: {
      duration: 0.3,
      ease: 'easeOut' as any
    }
  }
}

/**
 * Individual Phase Indicator
 */
const PhaseIndicator = ({
  phase,
  status,
  index,
  reducedMotion
}: {
  phase: Phase
  status: PhaseStatus
  index: number
  reducedMotion: boolean
}) => {
  return (
    <div className="flex flex-col items-center gap-2 relative">
      {/* Indicator circle */}
      <motion.div
        className="relative w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center overflow-hidden"
        variants={reducedMotion ? {} : indicatorVariants}
        animate={status}
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Active phase progress fill */}
        {status === 'active' && !reducedMotion && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600 w-full origin-left"
            variants={progressFillVariants}
            initial="reset"
            animate="active"
            key={`progress-${phase.id}`}
          />
        )}

        {/* Completed phase effects */}
        <AnimatePresence>
          {status === 'completed' && (
            <>
              {/* Glow background */}
              {!reducedMotion && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-400/40 to-transparent blur-md"
                  variants={glowVariants}
                  initial="hidden"
                  animate="visible"
                />
              )}

              {/* Particle burst (4 sparkles at cardinal points) */}
              {!reducedMotion && [0, 90, 180, 270].map((rotation) => (
                <motion.div
                  key={`burst-${rotation}`}
                  className="absolute w-2 h-2 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    x: '-50%',
                    y: '-50%',
                    rotate: rotation
                  }}
                  variants={burstVariants}
                  initial="hidden"
                  animate="visible"
                />
              ))}

              {/* Checkmark SVG */}
              <svg className="w-6 h-6 md:w-8 md:h-8 relative z-10" viewBox="0 0 24 24">
                <motion.path
                  d="M5 13l4 4L19 7"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={reducedMotion ? {} : checkmarkVariants}
                  initial="hidden"
                  animate="visible"
                />
              </svg>
            </>
          )}
        </AnimatePresence>

        {/* Phase number (for upcoming/active states) */}
        {status !== 'completed' && (
          <span
            className="text-lg md:text-xl font-bold relative z-10"
            style={{
              color: status === 'active' ? '#9D4EDD' : '#6B7280'
            }}
          >
            {index + 1}
          </span>
        )}
      </motion.div>

      {/* Phase label */}
      <motion.p
        className="text-xs md:text-sm font-medium text-center max-w-[90px] md:max-w-[100px]"
        animate={{
          opacity: status === 'active' ? 1 : 0.6,
          color: status === 'completed' ? '#FFD700' : status === 'active' ? '#9D4EDD' : '#6B7280'
        }}
        transition={{ duration: 0.3 }}
      >
        <span className="hidden md:inline">{phase.label}</span>
        <span className="md:hidden">{phase.shortLabel}</span>
      </motion.p>
    </div>
  )
}

/**
 * Connecting Line Component
 */
const Connector = ({
  isCompleted,
  reducedMotion
}: {
  isCompleted: boolean
  reducedMotion: boolean
}) => {
  return (
    <motion.div
      className="flex-1 h-0.5 mx-2 origin-left"
      variants={reducedMotion ? {} : connectorVariants}
      animate={isCompleted ? 'completed' : 'inactive'}
      style={{
        minWidth: '40px',
        maxWidth: '120px'
      }}
    />
  )
}

/**
 * ProgressIndicators Component
 */
export const ProgressIndicators: React.FC<ProgressIndicatorsProps> = ({
  currentPhase,
  variant
}) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  const reducedMotion = prefersReducedMotion || variant === 'reduced-motion'

  // Get current phase index for aria-valuenow (treat climax as selecting)
  const normalizedPhase = currentPhase === 'selecting-climax' ? 'selecting' : currentPhase
  const currentPhaseIndex = PHASES.findIndex(p => p.id === normalizedPhase)

  return (
    <div
      className="w-full max-w-lg mx-auto py-6 px-4"
      role="progressbar"
      aria-label="Winner selection progress"
      aria-valuenow={currentPhaseIndex + 1}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuetext={PHASES[currentPhaseIndex]?.label || 'Loading'}
    >
      {/* Screen reader announcement */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Step {currentPhaseIndex + 1} of 3: {PHASES[currentPhaseIndex]?.label}
      </div>

      {/* Visual stepper (horizontal on all screen sizes) */}
      <div className="flex items-center justify-center">
        {PHASES.map((phase, index) => {
          const status = getPhaseStatus(phase.id, currentPhase)
          const isLastPhase = index === PHASES.length - 1

          return (
            <div key={phase.id} className="flex items-center">
              <PhaseIndicator
                phase={phase}
                status={status}
                index={index}
                reducedMotion={reducedMotion}
              />

              {/* Connector line (except after last phase) */}
              {!isLastPhase && (
                <Connector
                  isCompleted={status === 'completed'}
                  reducedMotion={reducedMotion}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressIndicators
