import { Card, Badge, Button } from '@components/atoms'
import type { Room } from '../../../types'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useEffect, useState, useRef } from 'react'

export interface TournamentCardProps {
  room: Room
  onJoin?: (roomId: string) => void
  onView?: (roomId: string) => void
  isJoined?: boolean
  className?: string
  activityType?: 'join' | 'leave' | 'reset' | null
}

const TournamentCard = ({ room, onJoin, onView, isJoined = false, className, activityType: _activityType }: TournamentCardProps) => {
  const isWaiting = room.status?.toLowerCase() === 'waiting'
  const isFull = room.currentParticipants >= room.maxParticipants
  const canJoin = isWaiting && !isFull && !isJoined
  const [playerCountChange, setPlayerCountChange] = useState<'increment' | 'decrement' | null>(null)
  const prevParticipantsRef = useRef(room.currentParticipants)
  const [isAnimating, setIsAnimating] = useState(false)
  const isInitialMount = useRef(true) // Track if this is the very first render

  // Detect participant count changes and trigger BOTH number animation AND border glow
  useEffect(() => {
    // Skip animation on initial mount/remount - only trigger for real-time changes
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevParticipantsRef.current = room.currentParticipants // CRITICAL: Update ref on first mount
      return
    }

    if (prevParticipantsRef.current !== room.currentParticipants) {
      if (room.currentParticipants > prevParticipantsRef.current) {
        setPlayerCountChange('increment')
        setIsAnimating(true)

        // Trigger join animation for 2 seconds
        const animTimeout = setTimeout(() => {
          setIsAnimating(false)
        }, 2000)

        // Clear number animation after 800ms
        const countTimeout = setTimeout(() => {
          setPlayerCountChange(null)
        }, 800)

        prevParticipantsRef.current = room.currentParticipants

        return () => {
          clearTimeout(animTimeout)
          clearTimeout(countTimeout)
        }
      } else {
        setPlayerCountChange('decrement')
        setIsAnimating(true)

        // Trigger leave animation for 1.8 seconds
        const animTimeout = setTimeout(() => {
          setIsAnimating(false)
        }, 1800)

        // Clear number animation after 800ms
        const countTimeout = setTimeout(() => {
          setPlayerCountChange(null)
        }, 800)

        prevParticipantsRef.current = room.currentParticipants

        return () => {
          clearTimeout(animTimeout)
          clearTimeout(countTimeout)
        }
      }
    }
  }, [room.currentParticipants, room.name])

  const getStatusBadge = () => {
    switch (room.status) {
      case 'waiting':
        return <Badge variant="success" size="md" dot>Waiting</Badge>
      case 'in_progress':
        return <Badge variant="warning" size="md" dot>In Progress</Badge>
      case 'completed':
        return <Badge variant="default" size="md" dot>Completed</Badge>
      default:
        return null
    }
  }

  const getRoomTypeBadge = () => {
    switch (room.type) {
      case 'fast_drop':
        return <Badge variant="primary" size="md">Fast Drop</Badge>
      case 'time_drop':
        return <Badge variant="info" size="md">Time Drop</Badge>
      case 'special':
        return <Badge variant="warning" size="md">Special</Badge>
      default:
        return null
    }
  }
  
  // Animation variants for card
  const cardAnimation = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    hover: {
      y: -4,
      scale: 1.02,
      transition: { duration: 0.2, ease: 'easeOut' as const }
    }
  }

  // Join/leave animation styles - triggered by participant count changes
  const getAnimationStyle = () => {
    if (!isAnimating) {
      return {}
    }

    // Join effect when count increases
    if (playerCountChange === 'increment') {
      return {
        animation: 'joinPulse 2s ease-out',
        border: '2px solid rgba(167, 85, 247, 0.7)',
        outline: '1px solid rgba(167, 85, 247, 0.4)',
        outlineOffset: '1px',
        backgroundColor: 'rgba(167, 85, 247, 0.08)',
      }
    }

    // Leave effect when count decreases
    if (playerCountChange === 'decrement') {
      return {
        animation: 'leavePulse 1.8s ease-out',
        border: '2px solid rgba(185, 28, 28, 0.7)',
        outline: '1px solid rgba(185, 28, 28, 0.4)',
        outlineOffset: '1px',
        backgroundColor: 'rgba(185, 28, 28, 0.08)',
      }
    }

    return {}
  }

  return (
    <>
      <style>{`
        @keyframes joinPulse {
          0% {
            transform: scale(1);
            box-shadow:
              0 0 15px 3px rgba(167, 85, 247, 0.3),
              0 0 30px 6px rgba(167, 85, 247, 0.2),
              0 0 45px 9px rgba(167, 85, 247, 0.15),
              0 0 60px 12px rgba(167, 85, 247, 0.08),
              inset 0 0 15px rgba(167, 85, 247, 0.15);
          }
          50% {
            transform: scale(1.02);
            box-shadow:
              0 0 20px 4px rgba(167, 85, 247, 0.5),
              0 0 40px 8px rgba(167, 85, 247, 0.35),
              0 0 60px 12px rgba(167, 85, 247, 0.25),
              0 0 80px 16px rgba(167, 85, 247, 0.15),
              inset 0 0 20px rgba(167, 85, 247, 0.2);
          }
          100% {
            transform: scale(1);
            box-shadow:
              0 0 15px 3px rgba(167, 85, 247, 0.3),
              0 0 30px 6px rgba(167, 85, 247, 0.2),
              0 0 45px 9px rgba(167, 85, 247, 0.15),
              0 0 60px 12px rgba(167, 85, 247, 0.08),
              inset 0 0 15px rgba(167, 85, 247, 0.15);
          }
        }
        @keyframes leavePulse {
          0% {
            transform: scale(1);
            box-shadow:
              0 0 15px 3px rgba(185, 28, 28, 0.3),
              0 0 30px 6px rgba(185, 28, 28, 0.2),
              0 0 45px 9px rgba(185, 28, 28, 0.15),
              0 0 60px 12px rgba(185, 28, 28, 0.08),
              inset 0 0 15px rgba(185, 28, 28, 0.15);
          }
          50% {
            transform: scale(0.98);
            box-shadow:
              0 0 20px 4px rgba(185, 28, 28, 0.5),
              0 0 40px 8px rgba(185, 28, 28, 0.35),
              0 0 60px 12px rgba(185, 28, 28, 0.25),
              0 0 80px 16px rgba(185, 28, 28, 0.15),
              inset 0 0 20px rgba(185, 28, 28, 0.2);
          }
          100% {
            transform: scale(1);
            box-shadow:
              0 0 15px 3px rgba(185, 28, 28, 0.3),
              0 0 30px 6px rgba(185, 28, 28, 0.2),
              0 0 45px 9px rgba(185, 28, 28, 0.15),
              0 0 60px 12px rgba(185, 28, 28, 0.08),
              inset 0 0 15px rgba(185, 28, 28, 0.15);
          }
        }
        @keyframes countUp {
          0%, 100% { transform: translateY(0); color: inherit; }
          50% { transform: translateY(-4px); color: #A755F7; }
        }
        @keyframes countDown {
          0%, 100% { transform: translateY(0); color: inherit; }
          50% { transform: translateY(4px); color: #B91C1C; }
        }
        .glow-wrapper {
          position: relative;
          overflow: visible;
        }
        .glow-wrapper::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 1rem;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 0;
        }
        .glow-wrapper > div {
          position: relative;
          z-index: 1;
        }
        .glow-wrapper.glow-active-join::before {
          opacity: 0.8;
          animation: glowPulseJoin 2s ease-out;
          background: linear-gradient(135deg,
            rgba(167, 85, 247, 0.15) 0%,
            rgba(167, 85, 247, 0.05) 50%,
            rgba(167, 85, 247, 0.15) 100%);
        }
        .glow-wrapper.glow-active-leave::before {
          opacity: 0.8;
          animation: glowPulseLeave 1.8s ease-out;
          background: linear-gradient(135deg,
            rgba(185, 28, 28, 0.15) 0%,
            rgba(185, 28, 28, 0.05) 50%,
            rgba(185, 28, 28, 0.15) 100%);
        }
        @keyframes glowPulseJoin {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes glowPulseLeave {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
      <motion.div
        initial={cardAnimation.initial}
        animate={cardAnimation.animate}
        whileHover={cardAnimation.hover}
        transition={{ duration: 0.3, ease: 'easeOut' as const }}
        className={clsx(
          'glow-wrapper',
          isAnimating && playerCountChange === 'increment' && 'glow-active-join',
          isAnimating && playerCountChange === 'decrement' && 'glow-active-leave'
        )}
      >
        <Card
          hoverable
          className={clsx(
            'relative transition-all duration-300',
            isJoined && 'ring-2 ring-primary',
            className
          )}
          style={getAnimationStyle()}
        >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            {room.name}
          </h3>
          <div className="flex items-center gap-2">
            {getRoomTypeBadge()}
            {getStatusBadge()}
          </div>
        </div>
        
        {isJoined && (
          <Badge variant="primary">Joined</Badge>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-400">Entry Fee</p>
          <p className="text-lg font-semibold text-text-primary">
            ${room.entryFee.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Prize Pool</p>
          <p className="text-lg font-semibold text-success">
            ${room.prizePool.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Players</p>
          <p
            className="text-lg font-semibold text-text-primary"
            style={playerCountChange ? {
              animation: playerCountChange === 'increment' ? 'countUp 0.8s ease-out' : 'countDown 0.8s ease-out'
            } : undefined}
          >
            {room.currentParticipants}/{room.maxParticipants}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Winners</p>
          <p className="text-lg font-semibold text-text-primary">
            {room.winnersCount}
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Room Capacity</span>
          <span>{Math.round((room.currentParticipants / room.maxParticipants) * 100)}%</span>
        </div>
        <div className="w-full bg-primary-bg rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-primary-gradient rounded-full"
            initial={{ width: '0%' }}
            animate={{ 
              width: `${(room.currentParticipants / room.maxParticipants) * 100}%` 
            }}
            transition={{ duration: 1, ease: 'easeOut' as const }}
          />
        </div>
      </div>
      
      {/* Action Button */}
      <Button
        fullWidth
        variant={isJoined ? 'success' : canJoin ? 'primary' : 'secondary'}
        disabled={!canJoin && !isJoined}
        onClick={() => {
          if (isJoined) {
            onView?.(room.id)
          } else if (canJoin) {
            onJoin?.(room.id)
          }
        }}
      >
        {isJoined ? 'View Room' : isFull ? 'Room Full' : isWaiting ? 'Join Room' : 'View Room'}
      </Button>
      
      {/* Background Decoration */}
      <motion.div 
        className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full" 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.3, 0.5] 
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut' as const
        }}
      />
      <motion.div 
        className="absolute -left-8 -bottom-8 w-32 h-32 bg-highlight-1/5 rounded-full" 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3] 
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
          delay: 0.5
        }}
      />
    </Card>
    </motion.div>
    </>
  )
}

export default TournamentCard