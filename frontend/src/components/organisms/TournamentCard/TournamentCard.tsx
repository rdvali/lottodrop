import { Card, Badge, Button } from '@components/atoms'
import type { Room } from '../../../types'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useEffect, useState, useRef } from 'react'

export interface TournamentCardProps {
  room: Room
  onJoin?: (roomId: string) => void
  isJoined?: boolean
  className?: string
  activityType?: 'join' | 'leave' | null
}

const TournamentCard = ({ room, onJoin, isJoined = false, className, activityType }: TournamentCardProps) => {
  const isWaiting = room.status === 'waiting'
  const isFull = room.currentParticipants >= room.maxParticipants
  const canJoin = isWaiting && !isFull && !isJoined
  const [playerCountChange, setPlayerCountChange] = useState<'increment' | 'decrement' | null>(null)
  const prevParticipantsRef = useRef(room.currentParticipants)
  const [isAnimating, setIsAnimating] = useState(false)

  // Detect participant count changes
  useEffect(() => {
    if (prevParticipantsRef.current !== room.currentParticipants) {
      if (room.currentParticipants > prevParticipantsRef.current) {
        setPlayerCountChange('increment')
      } else {
        setPlayerCountChange('decrement')
      }
      prevParticipantsRef.current = room.currentParticipants

      // Clear animation class after animation completes
      const timeout = setTimeout(() => {
        setPlayerCountChange(null)
      }, 800)

      return () => clearTimeout(timeout)
    }
  }, [room.currentParticipants])

  // Handle activity type animation
  useEffect(() => {
    if (activityType) {
      setIsAnimating(true)
      const timeout = setTimeout(() => {
        setIsAnimating(false)
      }, activityType === 'join' ? 1500 : 1200)
      return () => clearTimeout(timeout)
    }
  }, [activityType])

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

  // Join/leave animation styles
  const getAnimationStyle = () => {
    if (!isAnimating || !activityType) return {}

    if (activityType === 'join') {
      return {
        animation: 'joinPulse 1.5s ease-out',
        boxShadow: '0 0 30px rgba(124, 58, 237, 0.3)',
        borderColor: 'rgba(124, 58, 237, 0.4)',
      }
    } else {
      return {
        animation: 'leavePulse 1.2s ease-out',
        boxShadow: '0 0 25px rgba(255, 107, 71, 0.3)',
        borderColor: 'rgba(255, 107, 71, 0.4)',
      }
    }
  }

  return (
    <>
      <style>{`
        @keyframes joinPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes leavePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.98); }
        }
        @keyframes countUp {
          0%, 100% { transform: translateY(0); color: inherit; }
          50% { transform: translateY(-4px); color: #7c3aed; }
        }
        @keyframes countDown {
          0%, 100% { transform: translateY(0); color: inherit; }
          50% { transform: translateY(4px); color: #ff6b47; }
        }
      `}</style>
      <motion.div
        initial={cardAnimation.initial}
        animate={cardAnimation.animate}
        whileHover={cardAnimation.hover}
        transition={{ duration: 0.3, ease: 'easeOut' as const }}
      >
        <Card
          hoverable
          className={clsx(
            'relative overflow-hidden transition-all duration-300',
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
        variant={canJoin ? 'primary' : 'secondary'}
        disabled={!canJoin}
        onClick={() => canJoin && onJoin?.(room.id)}
      >
        {isJoined ? 'Already Joined' : isFull ? 'Room Full' : isWaiting ? 'Join Room' : 'View Room'}
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