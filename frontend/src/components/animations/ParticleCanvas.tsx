/**
 * ParticleCanvas Component
 * Canvas-based VRF particle system for WinnerReveal animation
 * 18 gold particles in staggered emission pattern
 */

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  opacity: number
}

export interface ParticleCanvasProps {
  /** Whether to start animation */
  isActive: boolean
  /** Particle count (default: 18) */
  particleCount?: number
  /** Duration of animation in ms (default: 400) */
  duration?: number
  /** Origin point x (default: center) */
  originX?: number
  /** Origin point y (default: center) */
  originY?: number
  /** Callback when animation completes */
  onComplete?: () => void
  /** Canvas className */
  className?: string
}

/**
 * VRF Particle System
 * Manages particle lifecycle and rendering
 */
class VRFParticleSystem {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private animationId: number | null = null
  private startTime: number = 0
  private isRunning: boolean = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    // Set canvas size
    this.resizeCanvas()
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
  }

  /**
   * Create particles with staggered emission
   * 3 bursts × 6 particles = 18 total
   */
  private createParticles(
    originX: number,
    originY: number,
    count: number = 18
  ): void {
    this.particles = []

    const particlesPerBurst = 6
    const burstCount = Math.ceil(count / particlesPerBurst)
    const burstDelay = 50 // ms between bursts

    for (let burst = 0; burst < burstCount; burst++) {
      const particlesInThisBurst = Math.min(
        particlesPerBurst,
        count - burst * particlesPerBurst
      )

      for (let i = 0; i < particlesInThisBurst; i++) {
        // Radial burst pattern
        const angle = (Math.PI * 2 * i) / particlesInThisBurst + Math.random() * 0.5
        const speed = 2 + Math.random() * 2
        const vx = Math.cos(angle) * speed
        const vy = Math.sin(angle) * speed

        this.particles.push({
          x: originX,
          y: originY,
          vx,
          vy,
          life: burst * burstDelay, // Delay based on burst number
          maxLife: 400, // 400ms lifespan per spec
          size: 3 + Math.random() * 2,
          color: '#FFD700', // Gold color
          opacity: 1
        })
      }
    }
  }

  /**
   * Update particle positions and opacity
   */
  private updateParticles(deltaTime: number): void {
    this.particles.forEach(particle => {
      // Update lifetime
      particle.life += deltaTime

      // Only move if particle has "spawned" (life >= 0)
      if (particle.life >= 0) {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Apply velocity decay (easeOutQuad)
        const decayFactor = 0.95
        particle.vx *= decayFactor
        particle.vy *= decayFactor

        // Calculate opacity based on lifetime
        const lifeProgress = particle.life / particle.maxLife
        particle.opacity = Math.max(0, 1 - lifeProgress)
      }
    })

    // Remove dead particles
    this.particles = this.particles.filter(
      p => p.life < p.maxLife
    )
  }

  /**
   * Render particles to canvas
   */
  private renderParticles(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Render each particle
    this.particles.forEach(particle => {
      if (particle.life < 0) return // Don't render if not yet spawned

      this.ctx.save()

      // Set particle style
      this.ctx.globalAlpha = particle.opacity
      this.ctx.fillStyle = particle.color

      // Draw particle (circle)
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      this.ctx.fill()

      // Add glow effect
      this.ctx.shadowBlur = 10
      this.ctx.shadowColor = particle.color

      this.ctx.restore()
    })
  }

  /**
   * Animation loop
   */
  private animate = (timestamp: number): void => {
    if (!this.isRunning) return

    if (!this.startTime) {
      this.startTime = timestamp
    }

    const deltaTime = timestamp - this.startTime
    this.startTime = timestamp

    // Update and render
    this.updateParticles(deltaTime)
    this.renderParticles()

    // Continue if particles remain
    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.animate)
    } else {
      this.stop()
    }
  }

  /**
   * Start the particle system
   */
  start(originX: number, originY: number, count: number = 18): void {
    if (this.isRunning) return

    this.resizeCanvas()
    this.createParticles(originX, originY, count)
    this.isRunning = true
    this.startTime = 0

    this.animationId = requestAnimationFrame(this.animate)
  }

  /**
   * Stop the particle system
   */
  stop(): void {
    this.isRunning = false

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop()
    this.particles = []
  }
}

/**
 * ParticleCanvas Component
 */
export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  isActive,
  particleCount = 18,
  duration = 400,
  originX,
  originY,
  onComplete,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const systemRef = useRef<VRFParticleSystem | null>(null)
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Initialize particle system
    try {
      systemRef.current = new VRFParticleSystem(canvas)
    } catch (error) {
      console.error('Failed to initialize particle system:', error)
      return
    }

    // Cleanup
    return () => {
      if (systemRef.current) {
        systemRef.current.destroy()
        systemRef.current = null
      }

      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current)
        completionTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const system = systemRef.current
    const canvas = canvasRef.current

    if (!system || !canvas || !isActive) return

    // Calculate origin (default to center)
    const rect = canvas.getBoundingClientRect()
    const x = originX ?? rect.width / 2
    const y = originY ?? rect.height / 2

    // Start particle system
    system.start(x, y, particleCount)

    // Set completion timer
    // Duration includes staggered emission (3 bursts × 50ms) + particle lifetime
    const totalDuration = duration + 100 // Add buffer for staggered emission

    completionTimerRef.current = setTimeout(() => {
      onComplete?.()
    }, totalDuration)

    // Cleanup on unmount or when isActive changes
    return () => {
      system.stop()

      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current)
        completionTimerRef.current = null
      }
    }
  }, [isActive, particleCount, duration, originX, originY, onComplete])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        width: '100%',
        height: '100%'
      }}
    />
  )
}

export default ParticleCanvas
