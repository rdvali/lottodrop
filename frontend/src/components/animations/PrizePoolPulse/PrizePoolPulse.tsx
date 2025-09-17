import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { PrizePoolPulseProps, AnimationIntensity } from './types'
import { MILESTONES } from './types'
import './PrizePoolPulse.css'

const PrizePoolPulse: React.FC<PrizePoolPulseProps> = ({
  currentAmount,
  previousAmount = 0,
  isActive = true,
  showMilestone = true,
  className = '',
  onMilestoneReached
}) => {
  const [animationIntensity, setAnimationIntensity] = useState<AnimationIntensity>('idle')
  const [currentMilestone, setCurrentMilestone] = useState<string | null>(null)
  const [displayAmount, setDisplayAmount] = useState(currentAmount)

  // Ensure displayAmount stays in sync when currentAmount changes
  useEffect(() => {
    if (currentAmount !== displayAmount && (previousAmount === 0 || !isActive)) {
      setDisplayAmount(currentAmount)
    }
  }, [currentAmount, displayAmount, previousAmount, isActive])

  // Calculate animation intensity based on increase magnitude
  const getAnimationIntensity = useCallback((increase: number): AnimationIntensity => {
    if (increase <= 0) return 'idle'
    if (increase < 100) return 'small'
    if (increase < 500) return 'medium'
    return 'large'
  }, [])

  // Check for milestone achievements
  const checkMilestone = useCallback((amount: number, prevAmount: number) => {
    if (!showMilestone) return null
    
    for (const milestone of MILESTONES) {
      if (prevAmount < milestone.amount && amount >= milestone.amount) {
        return milestone
      }
    }
    return null
  }, [showMilestone])

  // Animate number counting
  useEffect(() => {
    if (currentAmount === displayAmount) return

    const difference = currentAmount - displayAmount
    const steps = 20
    const increment = difference / steps
    const animationDuration = 500

    const interval = setInterval(() => {
      setDisplayAmount(prev => {
        const next = prev + increment
        // Fix floating-point precision issues
        if ((increment > 0 && next >= currentAmount) || (increment < 0 && next <= currentAmount)) {
          clearInterval(interval)
          return currentAmount // Ensure exact final value
        }
        return next
      })
    }, animationDuration / steps)

    return () => clearInterval(interval)
  }, [currentAmount, displayAmount])

  // Trigger confetti effect for milestones
  const triggerMilestoneConfetti = useCallback((particleCount: number) => {
    const colors = ['#9D4EDD', '#6A4C93', '#FFD700', '#FFA500']
    
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors,
      gravity: 0.8,
      scalar: 1.2
    })
  }, [])

  // Handle amount changes
  useEffect(() => {
    if (!isActive) return

    const increase = currentAmount - previousAmount
    
    // Immediately set display amount if there's no animation needed
    if (increase === 0) {
      setDisplayAmount(currentAmount)
      return
    }
    
    if (increase > 0) {
      // Set animation intensity
      const intensity = getAnimationIntensity(increase)
      setAnimationIntensity(intensity)

      // Check for milestones
      const milestone = checkMilestone(currentAmount, previousAmount)
      if (milestone) {
        setCurrentMilestone(milestone.name)
        setAnimationIntensity('milestone')
        
        // Trigger confetti for major milestones
        if (milestone.particles) {
          triggerMilestoneConfetti(milestone.particles)
        }
        
        if (onMilestoneReached) {
          onMilestoneReached(milestone.amount)
        }

        // Reset milestone after animation
        setTimeout(() => {
          setCurrentMilestone(null)
        }, milestone.duration)
      }

      // Reset animation intensity after animation completes
      const resetDuration = milestone ? milestone.duration : 
        intensity === 'large' ? 800 : 
        intensity === 'medium' ? 600 : 400

      setTimeout(() => {
        setAnimationIntensity('idle')
      }, resetDuration)
    }
  }, [currentAmount, previousAmount, isActive, getAnimationIntensity, checkMilestone, onMilestoneReached, triggerMilestoneConfetti])

  // Format currency with commas and NaN safety
  const formatCurrency = useCallback((amount: number) => {
    // Add safety checks for NaN, null, undefined
    const safeAmount = isNaN(amount) || amount === null || amount === undefined ? 0 : amount
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount)
  }, [])

  // Animation variants
  const pulseVariants = {
    idle: {
      scale: 1
    },
    small: {
      scale: [1, 1.05, 1]
    },
    medium: {
      scale: [1, 1.08, 1]
    },
    large: {
      scale: [1, 1.12, 1]
    },
    milestone: {
      scale: [1, 1.2, 1.15],
      rotate: [0, 5, -5, 0]
    }
  }

  const glowVariants = {
    idle: {
      boxShadow: '0 4px 12px rgba(157, 78, 221, 0.3)'
    },
    active: {
      boxShadow: [
        '0 4px 12px rgba(157, 78, 221, 0.3)',
        '0 0 30px rgba(184, 69, 255, 0.6)',
        '0 4px 12px rgba(157, 78, 221, 0.3)'
      ]
    },
    milestone: {
      boxShadow: [
        '0 0 30px rgba(255, 215, 0, 0.6)',
        '0 0 50px rgba(255, 215, 0, 0.8)',
        '0 0 30px rgba(255, 215, 0, 0.6)'
      ]
    }
  }

  const isAnimating = animationIntensity !== 'idle'
  const currentMilestoneData = currentMilestone ? 
    MILESTONES.find(m => m.name === currentMilestone) : null

  return (
    <motion.div
      className={`prize-pool-container ${className} ${isAnimating ? 'animating' : ''} ${currentMilestone ? `milestone-${currentMilestone}` : ''}`}
      animate={animationIntensity}
      variants={pulseVariants}
      initial="idle"
    >
      <motion.div
        className="prize-pool-glow"
        animate={currentMilestone ? 'milestone' : isAnimating ? 'active' : 'idle'}
        variants={glowVariants}
      />
      
      <div className="prize-pool-label">Prize Pool</div>
      
      <motion.div
        className="prize-amount"
        animate={{
          scale: isAnimating ? 1.05 : 1,
          color: currentMilestoneData ? currentMilestoneData.color : '#FFFFFF'
        }}
        transition={{ duration: 0.3 }}
      >
        {formatCurrency(Math.round(displayAmount))}
      </motion.div>

      <AnimatePresence>
        {currentMilestone && (
          <motion.div
            className="milestone-badge"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <span className="milestone-icon">🏆</span>
            <span className="milestone-text">
              {currentMilestone.toUpperCase()} MILESTONE!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnimating && animationIntensity !== 'milestone' && (
          <motion.div
            className="increase-indicator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            +{formatCurrency(currentAmount - previousAmount)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particle effects overlay */}
      {currentMilestone && (
        <div className="particle-overlay">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="milestone-particle"
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0,
                opacity: 1 
              }}
              animate={{
                x: Math.cos((i * Math.PI) / 4) * 100,
                y: Math.sin((i * Math.PI) / 4) * 100,
                scale: [0, 1, 0],
                opacity: [1, 0.5, 0]
              }}
              transition={{
                duration: 1.5,
                ease: "easeOut",
                delay: i * 0.05
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default React.memo(PrizePoolPulse, (prevProps, nextProps) => {
  return prevProps.currentAmount === nextProps.currentAmount &&
         prevProps.isActive === nextProps.isActive
})