export interface PrizePoolPulseProps {
  currentAmount: number
  previousAmount?: number
  isActive?: boolean
  showMilestone?: boolean
  className?: string
  onMilestoneReached?: (milestone: number) => void
}

export type AnimationIntensity = 'idle' | 'small' | 'medium' | 'large' | 'milestone'

export interface MilestoneThreshold {
  amount: number
  name: string
  color: string
  scale: number
  duration: number
  particles?: number
}

export const MILESTONES: MilestoneThreshold[] = [
  { amount: 1000, name: 'silver', color: '#C0C0C0', scale: 1.06, duration: 800 },
  { amount: 5000, name: 'gold', color: '#FFD700', scale: 1.1, duration: 1200, particles: 12 },
  { amount: 10000, name: 'platinum', color: '#E5E5E5', scale: 1.15, duration: 2000, particles: 20 },
  { amount: 25000, name: 'diamond', color: '#B9F2FF', scale: 1.2, duration: 2500, particles: 30 }
]