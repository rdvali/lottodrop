import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Avatar } from '@components/atoms'
import type { PlayerTransitionsProps, AnimatedParticipant } from './types'
import './PlayerTransitions.css'

const PlayerTransitions: React.FC<PlayerTransitionsProps> = ({
  participants,
  minParticipants,
  maxParticipants,
  recentAction,
  onAnimationComplete,
  className = ''
}) => {
  const [animatedParticipants, setAnimatedParticipants] = useState<AnimatedParticipant[]>([])
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null)

  // Track participants and their animation states
  useEffect(() => {
    setAnimatedParticipants(prevParticipants => {
      const currentIds = new Set(participants.map(p => p.userId))
      const prevIds = new Set(prevParticipants.map(p => p.userId))
      
      // Find new participants (joining)
      const newParticipants = participants.filter(p => !prevIds.has(p.userId))
      
      // Find leaving participants
      const leavingIds = new Set(
        prevParticipants
          .filter(p => !currentIds.has(p.userId))
          .map(p => p.userId)
      )
      
      // Update animation states
      const updated = prevParticipants.map(p => {
        if (leavingIds.has(p.userId)) {
          return { ...p, animationState: 'leaving' as const }
        }
        if (p.animationState === 'entering') {
          return { ...p, animationState: 'present' as const }
        }
        return p
      })
      
      // Add new participants with entering state
      const withNew = [
        ...updated.filter(p => p.animationState !== 'leaving'),
        ...newParticipants.map((p, index) => ({
          ...p,
          animationState: 'entering' as const,
          animationDelay: index * 0.1
        }))
      ]
      
      // Clean up leaving participants after animation
      setTimeout(() => {
        setAnimatedParticipants(prev => 
          prev.filter(p => p.animationState !== 'leaving')
        )
      }, 500)
      
      return withNew
    })
  }, [participants])

  // Handle recent action highlighting
  useEffect(() => {
    if (recentAction) {
      setHighlightedUserId(recentAction.userId)
      
      // Remove highlight after animation
      const timer = setTimeout(() => {
        setHighlightedUserId(null)
        if (onAnimationComplete) {
          onAnimationComplete()
        }
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [recentAction, onAnimationComplete])

  // Calculate room capacity percentage
  const capacityPercentage = useMemo(() => {
    if (!maxParticipants || maxParticipants === 0) return 0
    return (participants.length / maxParticipants) * 100
  }, [participants.length, maxParticipants])

  // Animation variants for player cards
  const cardVariants = {
    entering: {
      opacity: 0,
      scale: 0.8,
      x: -50
    },
    present: {
      opacity: 1,
      scale: 1,
      x: 0
    },
    leaving: {
      opacity: 0,
      scale: 0.8,
      x: 50
    },
    highlighted: {
      scale: [1, 1.1, 1],
      boxShadow: [
        '0 2px 8px rgba(0, 0, 0, 0.1)',
        '0 0 20px rgba(157, 78, 221, 0.6)',
        '0 2px 8px rgba(0, 0, 0, 0.1)'
      ]
    }
  }

  // Avatar pulse animation for new players
  const avatarPulseVariants = {
    initial: {
      scale: 1
    },
    pulse: {
      scale: [1, 1.2, 1]
    }
  }

  // Capacity bar color based on fill level
  const getCapacityColor = () => {
    if (capacityPercentage >= 90) return '#FF4444'
    if (capacityPercentage >= 70) return '#FFA500'
    if (capacityPercentage >= 50) return '#FFD700'
    return '#4CAF50'
  }

  return (
    <div className={`player-transitions-container ${className}`}>
      {/* Room Capacity Indicator */}
      <div className="room-capacity">
        <div className="capacity-header">
          <span className="capacity-label">Room Capacity</span>
          <span className="capacity-count">
            {participants.length} / {maxParticipants}
          </span>
        </div>
        <div className="capacity-bar">
          <motion.div
            className="capacity-fill"
            animate={{
              width: `${capacityPercentage}%`,
              backgroundColor: getCapacityColor()
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut"
            }}
          />
          {capacityPercentage >= 90 && (
            <motion.div
              className="capacity-warning"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity
              }}
            >
              Almost Full!
            </motion.div>
          )}
        </div>
      </div>

      {/* Animated Participants List */}
      <LayoutGroup>
        <motion.div className="participants-grid">
          <AnimatePresence mode="popLayout">
            {animatedParticipants.map((participant, index) => {
              const isHighlighted = participant.userId === highlightedUserId
              const isNewPlayer = recentAction?.type === 'join' && 
                               participant.userId === recentAction.userId

              return (
                <motion.div
                  key={participant.userId || `participant-${index}`}
                  className={`participant-card ${
                    isHighlighted ? 'highlighted' : ''
                  } ${participant.animationState}`}
                  layout
                  initial="entering"
                  animate={isHighlighted ? 'highlighted' : 'present'}
                  exit="leaving"
                  variants={cardVariants}
                  custom={participant.animationDelay}
                  transition={{
                    layout: {
                      duration: 0.3,
                      ease: "easeInOut"
                    }
                  }}
                >
                  {/* Avatar with animation */}
                  <motion.div
                    className="participant-avatar"
                    variants={avatarPulseVariants}
                    initial="initial"
                    animate={isNewPlayer ? 'pulse' : 'initial'}
                  >
                    <Avatar 
                      userId={participant.userId}
                      src={participant.avatarUrl}
                      alt={participant.username || 'Player'}
                      size="md"
                      fallback={(participant.username || 'Player').charAt(0).toUpperCase()}
                    />
                    {isNewPlayer && (
                      <motion.div
                        className="new-player-badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        NEW
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Username */}
                  <div className="participant-info">
                    <span className="participant-username">
                      {participant.username || 'Player'}
                    </span>
                    <span className="participant-status">
                      {participant.status === 'winner' ? '👑' : 
                       participant.status === 'active' ? '🟢' : '⚫'}
                    </span>
                  </div>

                  {/* Join/Leave indicator */}
                  <AnimatePresence>
                    {isHighlighted && (
                      <motion.div
                        className={`action-indicator ${recentAction?.type}`}
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        {recentAction?.type === 'join' ? '+ Joined' : '- Left'}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sparkle effect for new players */}
                  {isNewPlayer && (
                    <div className="sparkle-container">
                      {[...Array(4)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="sparkle"
                          initial={{ 
                            opacity: 0, 
                            scale: 0,
                            x: 0,
                            y: 0
                          }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                            x: Math.cos((i * Math.PI) / 2) * 30,
                            y: Math.sin((i * Math.PI) / 2) * 30
                          }}
                          transition={{
                            duration: 0.8,
                            delay: i * 0.1,
                            ease: "easeOut"
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Empty state */}
      {participants.length === 0 && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="empty-icon">👥</span>
          <p>Waiting for players to join...</p>
        </motion.div>
      )}

      {/* Room filling animation with minimum players logic */}
      {participants.length > 0 && participants.length < minParticipants && (
        <motion.div
          className="filling-prompt"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⏳ Waiting for {minParticipants - participants.length} more player{minParticipants - participants.length !== 1 ? 's' : ''} to start (minimum {minParticipants} required)
          </motion.div>
        </motion.div>
      )}
      
      {/* Minimum players reached - ready to start */}
      {participants.length >= minParticipants && participants.length < maxParticipants && (
        <motion.div
          className="filling-prompt ready"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✅ Minimum players reached! Game will start soon... ({maxParticipants - participants.length} spots still available)
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default PlayerTransitions