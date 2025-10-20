/**
 * Device Detection and Performance Profiling
 * Detects device capabilities and returns appropriate quality settings
 * Part of WinnerReveal animation adaptive system
 */

export interface DeviceProfile {
  tier: 'high' | 'medium' | 'low'
  particleCount: number
  useCanvas: boolean
  gpuAcceleration: boolean
  reducedMotion: boolean
}

/**
 * Detect device capability and return appropriate profile
 * Uses multiple heuristics including:
 * - Hardware concurrency (CPU cores)
 * - Device memory (if available)
 * - Connection speed
 * - User preferences (reduced motion)
 */
export const detectDeviceCapability = (): DeviceProfile => {
  // Check for reduced motion preference first
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    return {
      tier: 'low',
      particleCount: 0,
      useCanvas: false,
      gpuAcceleration: false,
      reducedMotion: true
    }
  }

  // Detect device tier based on available metrics
  let score = 0

  // CPU cores (if available)
  const cores = navigator.hardwareConcurrency || 4
  if (cores >= 8) score += 3
  else if (cores >= 4) score += 2
  else score += 1

  // Device memory (if available)
  const memory = (navigator as any).deviceMemory
  if (memory) {
    if (memory >= 8) score += 3
    else if (memory >= 4) score += 2
    else score += 1
  } else {
    score += 2 // Assume medium if not available
  }

  // Connection speed (if available)
  const connection = (navigator as any).connection
  if (connection) {
    const effectiveType = connection.effectiveType
    if (effectiveType === '4g') score += 2
    else if (effectiveType === '3g') score += 1
  } else {
    score += 2 // Assume decent connection if not available
  }

  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile) {
    score -= 2 // Penalize mobile devices slightly
  }

  // Determine tier based on score
  // High: 7-8, Medium: 4-6, Low: 0-3
  let tier: 'high' | 'medium' | 'low'
  if (score >= 7) tier = 'high'
  else if (score >= 4) tier = 'medium'
  else tier = 'low'

  // Map tier to profile
  const profiles: Record<'high' | 'medium' | 'low', DeviceProfile> = {
    high: {
      tier: 'high',
      particleCount: 18,
      useCanvas: true,
      gpuAcceleration: true,
      reducedMotion: false
    },
    medium: {
      tier: 'medium',
      particleCount: 18,
      useCanvas: true,
      gpuAcceleration: true,
      reducedMotion: false
    },
    low: {
      tier: 'low',
      particleCount: 18,
      useCanvas: false, // Use CSS fallback
      gpuAcceleration: false,
      reducedMotion: false
    }
  }

  return profiles[tier]
}

/**
 * Check if device supports WebGL (for advanced particle effects)
 */
export const supportsWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

/**
 * Check if device supports OffscreenCanvas (for better performance)
 */
export const supportsOffscreenCanvas = (): boolean => {
  return typeof OffscreenCanvas !== 'undefined'
}

/**
 * Get estimated FPS capability
 */
export const getEstimatedFPS = (): number => {
  const profile = detectDeviceCapability()

  switch (profile.tier) {
    case 'high':
      return 60
    case 'medium':
      return 55
    case 'low':
      return 30
    default:
      return 30
  }
}
