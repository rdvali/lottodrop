import type { Participant } from '../../../types'

export interface PlayerTransitionsProps {
  participants: Participant[]
  minParticipants: number
  maxParticipants: number
  recentAction?: {
    type: 'join' | 'leave'
    userId: string
    timestamp: number
  } | null
  onAnimationComplete?: () => void
  className?: string
}

export interface AnimatedParticipant extends Participant {
  animationState: 'entering' | 'present' | 'leaving'
  animationDelay?: number
}