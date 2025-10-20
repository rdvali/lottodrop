/**
 * useCountUp Hook
 * Animated number counter using requestAnimationFrame
 * Part of WinnerReveal animation system
 */

import { useState, useEffect, useRef } from 'react'

/**
 * Easing function: easeOutCubic
 * @param t - Progress (0 to 1)
 * @returns Eased value (0 to 1)
 */
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

export interface UseCountUpOptions {
  /** Starting value */
  start?: number
  /** Ending value */
  end: number
  /** Duration in milliseconds */
  duration?: number
  /** Delay before starting in milliseconds */
  delay?: number
  /** Easing function */
  easing?: (t: number) => number
  /** Callback when animation completes */
  onComplete?: () => void
}

export interface UseCountUpReturn {
  /** Current animated value */
  value: number
  /** Formatted value as currency string */
  formatted: string
  /** Whether animation is running */
  isAnimating: boolean
  /** Reset animation */
  reset: () => void
}

/**
 * Hook to animate counting up numbers
 * Uses requestAnimationFrame for smooth 60fps animation
 *
 * @param options - Configuration options
 * @returns Object with current value and control functions
 */
export const useCountUp = ({
  start = 0,
  end,
  duration = 400,
  delay = 0,
  easing = easeOutCubic,
  onComplete
}: UseCountUpOptions): UseCountUpReturn => {
  const [value, setValue] = useState<number>(start)
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const hasCompletedRef = useRef<boolean>(false)

  // Format value as currency
  const formatted = `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`

  // Animation loop
  const animate = (timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp
    }

    const elapsed = timestamp - startTimeRef.current
    const adjustedElapsed = Math.max(0, elapsed - delay)

    if (adjustedElapsed >= duration) {
      // Animation complete
      setValue(end)
      setIsAnimating(false)
      rafRef.current = null

      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true
        onComplete?.()
      }
      return
    }

    if (adjustedElapsed < 0) {
      // Still in delay period
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    // Calculate progress (0 to 1)
    const progress = adjustedElapsed / duration
    const easedProgress = easing(progress)

    // Calculate current value
    const currentValue = start + (end - start) * easedProgress
    setValue(Math.round(currentValue))

    // Continue animation
    rafRef.current = requestAnimationFrame(animate)
  }

  // Reset function
  const reset = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    setValue(start)
    setIsAnimating(false)
    startTimeRef.current = null
    hasCompletedRef.current = false
  }

  // Start animation when end value changes
  useEffect(() => {
    // Reset state
    hasCompletedRef.current = false
    setIsAnimating(true)
    setValue(start)
    startTimeRef.current = null

    // Start animation
    rafRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [end, start, duration, delay])

  return {
    value,
    formatted,
    isAnimating,
    reset
  }
}

export default useCountUp
