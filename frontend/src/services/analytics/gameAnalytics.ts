/**
 * Game Analytics Service
 *
 * Tracks game events, state transitions, and user actions for monitoring and debugging.
 * Integrates with analytics platforms (Mixpanel, Amplitude, Google Analytics, etc.)
 */

interface GameEvent {
  event: string
  properties: Record<string, any>
  timestamp: number
  userId?: string
  sessionId?: string
}

interface StateTransitionEvent {
  from: string
  to: string
  duration: number
  event: string
}

class GameAnalytics {
  private events: GameEvent[] = []
  private enabled: boolean
  private sessionId: string
  private userId?: string

  constructor() {
    this.enabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
    this.sessionId = this.generateSessionId()

    if (this.enabled) {
      console.log('[GameAnalytics] Initialized - Session:', this.sessionId)
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string) {
    this.userId = userId
    this.track('user_identified', { userId })
  }

  /**
   * Clear user ID (on logout)
   */
  clearUserId() {
    this.track('user_logged_out', { userId: this.userId })
    this.userId = undefined
  }

  /**
   * Generic event tracking
   */
  track(event: string, properties: Record<string, any> = {}) {
    if (!this.enabled) {
      // In development, just log to console
      if (import.meta.env.DEV) {
        console.log(`[Analytics] ${event}`, properties)
      }
      return
    }

    const gameEvent: GameEvent = {
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
    }

    this.events.push(gameEvent)

    // Send to analytics platform
    this.sendToAnalytics(gameEvent)
  }

  /**
   * Send event to analytics platforms
   */
  private sendToAnalytics(event: GameEvent) {
    try {
      // Google Analytics 4
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', event.event, event.properties)
      }

      // Mixpanel
      if (typeof window !== 'undefined' && (window as any).mixpanel) {
        (window as any).mixpanel.track(event.event, event.properties)
      }

      // Amplitude
      if (typeof window !== 'undefined' && (window as any).amplitude) {
        (window as any).amplitude.track(event.event, event.properties)
      }

      // Segment
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track(event.event, event.properties)
      }

      // Custom analytics endpoint (optional)
      if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
        fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }).catch(err => console.warn('[Analytics] Failed to send event:', err))
      }
    } catch (error) {
      console.warn('[Analytics] Error sending event:', error)
    }
  }

  // ======================
  // GAME-SPECIFIC EVENTS
  // ======================

  /**
   * Track state machine transitions
   */
  trackStateTransition(transition: StateTransitionEvent) {
    this.track('game_state_transition', {
      from: transition.from,
      to: transition.to,
      duration: transition.duration,
      trigger_event: transition.event,
    })
  }

  /**
   * Track animation timeout (BUG-016)
   */
  trackAnimationTimeout(phase: string, duration: number) {
    this.track('game_animation_timeout', {
      phase,
      duration,
      severity: 'warning',
    })
  }

  /**
   * Track modal shown
   */
  trackModalShown(winnersCount: number, prizePool: number, wasParticipant: boolean) {
    this.track('game_modal_shown', {
      winners_count: winnersCount,
      prize_pool: prizePool,
      was_participant: wasParticipant,
    })
  }

  /**
   * Track modal dismissed
   */
  trackModalDismissed(viewDuration: number) {
    this.track('game_modal_dismissed', {
      view_duration: viewDuration,
    })
  }

  /**
   * Track user joining room
   */
  trackUserJoinRoom(roomId: string, entryFee: number, balance: number) {
    this.track('user_joined_room', {
      room_id: roomId,
      entry_fee: entryFee,
      balance_before: balance,
    })
  }

  /**
   * Track user leaving room
   */
  trackUserLeaveRoom(roomId: string, refundAmount: number) {
    this.track('user_left_room', {
      room_id: roomId,
      refund_amount: refundAmount,
    })
  }

  /**
   * Track game started
   */
  trackGameStarted(roomId: string, countdown: number, participantCount: number) {
    this.track('game_started', {
      room_id: roomId,
      countdown_duration: countdown,
      participant_count: participantCount,
    })
  }

  /**
   * Track game completed
   */
  trackGameCompleted(roomId: string, roundId: string, winnersCount: number, prizePool: number, won: boolean) {
    this.track('game_completed', {
      room_id: roomId,
      round_id: roundId,
      winners_count: winnersCount,
      prize_pool: prizePool,
      user_won: won,
    })
  }

  /**
   * Track balance update
   */
  trackBalanceUpdate(newBalance: number, previousBalance: number, reason: string) {
    this.track('balance_updated', {
      new_balance: newBalance,
      previous_balance: previousBalance,
      change: newBalance - previousBalance,
      reason,
    })
  }

  /**
   * Track error occurred
   */
  trackError(error: Error, context: Record<string, any> = {}) {
    this.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    })
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms') {
    this.track('performance_metric', {
      metric,
      value,
      unit,
    })
  }

  /**
   * Track countdown tick (for monitoring accuracy)
   */
  trackCountdownTick(expected: number, actual: number, drift: number) {
    // Only track if drift is significant (>100ms)
    if (Math.abs(drift) > 100) {
      this.track('countdown_drift_detected', {
        expected,
        actual,
        drift,
        severity: Math.abs(drift) > 300 ? 'high' : 'low',
      })
    }
  }

  /**
   * Track duplicate event detected (BUG-007)
   */
  trackDuplicateEvent(eventType: string, eventId: string) {
    this.track('duplicate_event_detected', {
      event_type: eventType,
      event_id: eventId,
      severity: 'warning',
    })
  }

  /**
   * Track operation lock triggered (BUG-006)
   */
  trackOperationLocked(operation: string, reason: string) {
    this.track('operation_locked', {
      operation,
      reason,
    })
  }

  /**
   * Get all tracked events (for debugging)
   */
  getEvents(): GameEvent[] {
    return [...this.events]
  }

  /**
   * Clear all events
   */
  clearEvents() {
    this.events = []
  }

  /**
   * Export events as JSON (for debugging/support)
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2)
  }
}

// Singleton instance
export const gameAnalytics = new GameAnalytics()

// Also export class for testing
export { GameAnalytics }

// Export types
export type { GameEvent, StateTransitionEvent }
