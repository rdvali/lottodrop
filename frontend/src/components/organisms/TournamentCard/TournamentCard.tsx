import { Card, Badge, Button } from '@components/atoms'
import type { Room } from '../../../types'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export interface TournamentCardProps {
  room: Room
  onJoin?: (roomId: string) => void
  isJoined?: boolean
  className?: string
}

const TournamentCard = ({ room, onJoin, isJoined = false, className }: TournamentCardProps) => {
  const isWaiting = room.status === 'waiting'
  const isFull = room.currentParticipants >= room.maxParticipants
  const canJoin = isWaiting && !isFull && !isJoined
  
  const getStatusBadge = () => {
    switch (room.status) {
      case 'waiting':
        return <Badge variant="success" size="sm" dot>Waiting</Badge>
      case 'in_progress':
        return <Badge variant="warning" size="sm" dot>In Progress</Badge>
      case 'completed':
        return <Badge variant="default" size="sm" dot>Completed</Badge>
      default:
        return null
    }
  }
  
  const getRoomTypeBadge = () => {
    switch (room.type) {
      case 'fast_drop':
        return <Badge variant="primary" size="sm">Fast Drop</Badge>
      case 'time_drop':
        return <Badge variant="info" size="sm">Time Drop</Badge>
      case 'special':
        return <Badge variant="warning" size="sm">Special</Badge>
      default:
        return null
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ 
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card
        hoverable
        className={clsx(
          'relative overflow-hidden transition-all duration-300',
          isJoined && 'ring-2 ring-primary',
          className
        )}
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
          <p className="text-lg font-semibold text-text-primary">
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
            transition={{ duration: 1, ease: 'easeOut' }}
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
          ease: 'easeInOut' 
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
          ease: 'easeInOut',
          delay: 0.5
        }}
      />
    </Card>
    </motion.div>
  )
}

export default TournamentCard