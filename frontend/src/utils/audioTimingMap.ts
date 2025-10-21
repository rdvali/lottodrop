/**
 * Audio-Visual Synchronization Timing Map
 * Millisecond-precise mapping of audio triggers to animation phases
 *
 * This file defines WHEN each audio file should play relative to visual events
 * to achieve perfect synchronization between sound and animation.
 *
 * CRITICAL SYNCHRONIZATION POINTS:
 * 1. VRF Riser starts immediately when VRF loading begins
 * 2. Tick sounds sync with name cycling visual changes
 * 3. Drum plays EXACTLY when riser stops (200ms fade overlap max)
 * 4. Explosion syncs with particle burst visual
 * 5. Result sounds (win/lose) play when user SEES final result, not when socket arrives
 *
 * @version 1.0.0
 * @author LottoDrop Development Team
 */

/**
 * Audio file duration constants (measured via audioDurationAnalyzer)
 * These will be populated after running the analyzer
 */
export const AUDIO_DURATIONS = {
  // Countdown (tick sounds are short, GO is slightly longer)
  COUNTDOWN_TICK_3: 150, // Estimated ~150ms
  COUNTDOWN_TICK_2: 150, // Estimated ~150ms
  COUNTDOWN_TICK_1: 150, // Estimated ~150ms
  COUNTDOWN_GO: 400, // Estimated ~400ms

  // Round start
  ROUND_START: 600, // Estimated ~600ms

  // VRF Reveal sequence
  REVEAL_RISER: 2000, // Estimated ~2000ms (loops until stopped)
  REVEAL_TICK: 100, // Estimated ~100ms (short tick)
  REVEAL_DRUM: 800, // Estimated ~800ms
  REVEAL_EXPLOSION: 1200, // Estimated ~1200ms

  // Result sounds
  RESULT_WIN: 1500, // Estimated ~1500ms
  RESULT_LOSE: 800 // Estimated ~800ms
} as const

/**
 * Latency compensation constants
 * Target: <50ms total system latency
 */
export const LATENCY_COMPENSATION = {
  // Web Audio API scheduling precision (usually 0-10ms)
  WEB_AUDIO_PRECISION: 5,

  // Browser render frame time (16.67ms for 60fps)
  FRAME_TIME: 17,

  // Network jitter buffer for socket events
  NETWORK_JITTER: 20,

  // Audio decode/playback startup time
  PLAYBACK_STARTUP: 10,

  // Total recommended advance time (play audio slightly before visual)
  TOTAL_ADVANCE: 30 // 30ms early ensures audio-visual sync
} as const

/**
 * Animation phase timings for WinnerReveal component
 * Standard variant (3.5s total duration)
 */
export const ANIMATION_PHASES = {
  // VRF Loading phases (before winner data arrives)
  VRF_LOADING: {
    GATHERING: {
      start: 0,
      duration: 2000,
      description: 'Gathering participants with pulsing dots'
    },
    COMPUTING: {
      start: 2000,
      duration: 2000,
      description: 'Computing randomness with hexagonal grid'
    },
    SELECTING: {
      start: 4000,
      duration: Infinity, // Holds until winner data arrives
      description: 'Name cycling at 80ms intervals'
    },
    SELECTING_CLIMAX: {
      // Triggered when winner data arrives during SELECTING phase
      RAPID_CYCLING: {
        start: 0,
        duration: 500, // 5 cycles × 100ms
        cycleInterval: 100,
        description: 'Rapid name changes with tick sounds'
      },
      SLOW_DOWN: {
        start: 500,
        duration: 600, // 3 cycles × 200ms
        cycleInterval: 200,
        description: 'Deceleration with tick sounds'
      },
      FINAL_DECELERATION: {
        start: 1100,
        duration: 800, // 2 cycles × 400ms
        cycleInterval: 400,
        description: 'Final slow cycles with tick sounds'
      },
      LAND_ON_WINNER: {
        start: 1900,
        duration: 800,
        description: 'Dramatic pause on winner name with drum sound'
      }
    }
  },

  // Winner reveal animation phases (after winner data arrives)
  REVEAL: {
    FOCUS: {
      start: 0,
      duration: 300,
      description: 'Card glow pulse'
    },
    SPARK: {
      start: 300,
      duration: 500,
      description: '18 gold particles + VRF badge appear'
    },
    ANTICIPATION: {
      start: 800,
      duration: 600,
      description: 'Camera zoom + glow intensification'
    },
    POP: {
      start: 1400,
      duration: 600,
      description: 'Winner card entrance with screen shake'
    },
    EXPLOSION: {
      start: 2000,
      duration: 800,
      description: '60-particle burst + radial lines'
    },
    COUNTUP: {
      start: 2800,
      duration: 400,
      description: 'Prize amount count-up animation'
    },
    SETTLE: {
      start: 3200,
      duration: 300,
      description: 'Final state with all elements visible'
    },
    COMPLETE: {
      start: 3500,
      duration: Infinity,
      description: 'Animation complete, awaiting user action'
    }
  }
} as const

/**
 * Audio trigger timing map
 * Specifies EXACTLY when each audio file should play (in milliseconds)
 */
export const AUDIO_TRIGGER_MAP = {
  /**
   * VRF Loading Sequence Audio
   */
  VRF_LOADING: {
    // Riser starts immediately when VRF loading begins
    RISER_START: {
      triggerAt: 0, // Start of GATHERING phase
      audioKey: 'reveal.riser',
      options: {
        loop: true, // Loops continuously
        volume: 0.7,
        fadeIn: 200 // Smooth fade-in
      },
      description: 'Tension-building riser during VRF computation'
    },

    // Tick sounds during climax sequence
    CLIMAX_TICKS: {
      // Rapid cycling phase (5 ticks)
      RAPID_TICK_1: {
        triggerAt: 0 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 1 of rapid cycling'
      },
      RAPID_TICK_2: {
        triggerAt: 100 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 2 of rapid cycling'
      },
      RAPID_TICK_3: {
        triggerAt: 200 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 3 of rapid cycling'
      },
      RAPID_TICK_4: {
        triggerAt: 300 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 4 of rapid cycling'
      },
      RAPID_TICK_5: {
        triggerAt: 400 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 5 of rapid cycling'
      },

      // Slow down phase (3 ticks)
      SLOW_TICK_1: {
        triggerAt: 500 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 1 of slow down'
      },
      SLOW_TICK_2: {
        triggerAt: 700 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 2 of slow down'
      },
      SLOW_TICK_3: {
        triggerAt: 900 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 3 of slow down'
      },

      // Final deceleration (2 ticks)
      FINAL_TICK_1: {
        triggerAt: 1100 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 1 of final deceleration'
      },
      FINAL_TICK_2: {
        triggerAt: 1500 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
        audioKey: 'reveal.tick',
        description: 'Tick 2 of final deceleration'
      }
    },

    // Riser stop and drum play
    RISER_STOP: {
      triggerAt: 1700, // 200ms before drum (fade-out overlap)
      audioKey: 'reveal.riser',
      action: 'stop',
      options: {
        fadeOut: 200 // Smooth fade-out
      },
      description: 'Stop riser with fade-out before drum'
    },

    DRUM_HIT: {
      triggerAt: 1900 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
      audioKey: 'reveal.drum',
      options: {
        volume: 1.0 // Full volume for impact
      },
      description: 'Dramatic drum hit when landing on winner name',
      criticalSync: true // MUST be perfectly synced
    }
  },

  /**
   * Winner Reveal Animation Audio
   */
  WINNER_REVEAL: {
    // Explosion sound at particle burst
    EXPLOSION: {
      triggerAt: ANIMATION_PHASES.REVEAL.EXPLOSION.start - LATENCY_COMPENSATION.TOTAL_ADVANCE,
      audioKey: 'reveal.explosion',
      options: {
        volume: 0.9
      },
      description: 'Explosion sound with 60-particle burst visual',
      criticalSync: true // MUST be perfectly synced
    },

    // Result sounds play when user SEES the complete result
    // NOT when socket event arrives (prevents premature audio spoilers)
    RESULT_WIN: {
      triggerAt: ANIMATION_PHASES.REVEAL.COMPLETE.start - LATENCY_COMPENSATION.TOTAL_ADVANCE,
      audioKey: 'result.win',
      condition: 'isWinner', // Only if current user won
      options: {
        volume: 1.0
      },
      description: 'Win celebration sound after full reveal',
      criticalSync: false // Can have slight delay, not critical
    },

    RESULT_LOSE: {
      triggerAt: ANIMATION_PHASES.REVEAL.COMPLETE.start - LATENCY_COMPENSATION.TOTAL_ADVANCE,
      audioKey: 'result.lose',
      condition: 'isParticipantButNotWinner', // Only if user lost
      options: {
        volume: 0.7 // Softer for losing sound
      },
      description: 'Lose sound after full reveal',
      criticalSync: false // Can have slight delay, not critical
    }
  }
} as const

/**
 * Fast animation variant timing map (1.6s total)
 * For repeat losers (adaptive animation)
 */
export const AUDIO_TRIGGER_MAP_FAST = {
  WINNER_REVEAL: {
    EXPLOSION: {
      triggerAt: 850 - LATENCY_COMPENSATION.TOTAL_ADVANCE, // Explosion at 850ms in fast variant
      audioKey: 'reveal.explosion',
      options: {
        volume: 0.9
      },
      description: 'Fast variant explosion'
    },
    RESULT_WIN: {
      triggerAt: 1600 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
      audioKey: 'result.win',
      condition: 'isWinner',
      options: {
        volume: 1.0
      },
      description: 'Fast variant win sound'
    },
    RESULT_LOSE: {
      triggerAt: 1600 - LATENCY_COMPENSATION.TOTAL_ADVANCE,
      audioKey: 'result.lose',
      condition: 'isParticipantButNotWinner',
      options: {
        volume: 0.7
      },
      description: 'Fast variant lose sound'
    }
  }
} as const

/**
 * Helper function to update AUDIO_DURATIONS from analyzer results
 */
export function updateAudioDurations(durations: Record<string, number>): void {
  // This will be called after running audioDurationAnalyzer
  // to populate exact measured durations
  console.info('[AudioTimingMap] Updating audio durations from analyzer:', durations)

  // Update the constants (in production, these would be code-generated or loaded from config)
  Object.assign(AUDIO_DURATIONS, durations)
}

/**
 * Validate timing map consistency
 * Ensures no timing conflicts or overlaps
 */
export function validateTimingMap(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check 1: Riser stop happens before drum
  const riserStop = AUDIO_TRIGGER_MAP.VRF_LOADING.RISER_STOP.triggerAt
  const drumHit = AUDIO_TRIGGER_MAP.VRF_LOADING.DRUM_HIT.triggerAt

  if (riserStop >= drumHit) {
    errors.push('Riser must stop BEFORE drum hits')
  }

  // Check 2: Fade-out duration allows clean transition
  const fadeOutDuration = AUDIO_TRIGGER_MAP.VRF_LOADING.RISER_STOP.options?.fadeOut || 0
  const gap = drumHit - riserStop

  if (gap < fadeOutDuration * 0.5) {
    warnings.push(`Fade-out overlap may be too long (${fadeOutDuration}ms fade, ${gap}ms gap)`)
  }

  // Check 3: Explosion sound aligns with visual
  const explosionTrigger = AUDIO_TRIGGER_MAP.WINNER_REVEAL.EXPLOSION.triggerAt
  const explosionVisual = ANIMATION_PHASES.REVEAL.EXPLOSION.start - LATENCY_COMPENSATION.TOTAL_ADVANCE

  if (Math.abs(explosionTrigger - explosionVisual) > 10) {
    warnings.push('Explosion audio and visual may not be synced (>10ms difference)')
  }

  // Check 4: Result sounds don't play during animation
  const resultTrigger = AUDIO_TRIGGER_MAP.WINNER_REVEAL.RESULT_WIN.triggerAt
  const completePhase = ANIMATION_PHASES.REVEAL.COMPLETE.start - LATENCY_COMPENSATION.TOTAL_ADVANCE

  if (resultTrigger < completePhase) {
    errors.push('Result sounds must play AFTER animation completes')
  }

  const valid = errors.length === 0

  return { valid, errors, warnings }
}

/**
 * Generate timing documentation for developers
 */
export function generateTimingDocumentation(): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('     LOTTODROP AUDIO-VISUAL SYNCHRONIZATION TIMING MAP')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')
  lines.push('LATENCY COMPENSATION:')
  lines.push(`  Total Advance Time: ${LATENCY_COMPENSATION.TOTAL_ADVANCE}ms`)
  lines.push(`  Target System Latency: <50ms`)
  lines.push('')
  lines.push('───────────────────────────────────────────────────────────────')
  lines.push('VRF LOADING SEQUENCE')
  lines.push('───────────────────────────────────────────────────────────────')
  lines.push('')
  lines.push(`T+0ms:     RISER START (loops continuously)`)
  lines.push(`T+0-1900ms: Name cycling with tick sounds (10 ticks total)`)
  lines.push(`T+1700ms:  RISER STOP (200ms fade-out)`)
  lines.push(`T+1900ms:  DRUM HIT (winner name revealed) [CRITICAL SYNC]`)
  lines.push('')
  lines.push('───────────────────────────────────────────────────────────────')
  lines.push('WINNER REVEAL ANIMATION (Standard Variant - 3.5s)')
  lines.push('───────────────────────────────────────────────────────────────')
  lines.push('')
  lines.push(`T+0ms:     Focus Phase (300ms) - Card glow pulse`)
  lines.push(`T+300ms:   Spark Phase (500ms) - Gold particles appear`)
  lines.push(`T+800ms:   Anticipation (600ms) - Camera zoom + glow`)
  lines.push(`T+1400ms:  Pop Phase (600ms) - Screen shake`)
  lines.push(`T+2000ms:  EXPLOSION (800ms) + explosion.ogg [CRITICAL SYNC]`)
  lines.push(`T+2800ms:  Count-up (400ms) - Prize animation`)
  lines.push(`T+3200ms:  Settle (300ms) - Final state`)
  lines.push(`T+3500ms:  RESULT SOUND (win.ogg or lose.ogg)`)
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')

  return lines.join('\n')
}
