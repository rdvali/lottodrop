/**
 * Audio Timing Debugger
 * Real-time monitoring and verification of audio-visual synchronization
 *
 * Features:
 * - Millisecond-precise timing logs
 * - Visual timeline visualization in console
 * - Sync drift detection (audio vs visual)
 * - Performance profiling
 * - Color-coded console output
 *
 * Usage:
 *   const debugger = new AudioTimingDebugger()
 *   debugger.start('VRF_LOADING')
 *   debugger.logAudioTrigger('reveal.riser', 0)
 *   debugger.logVisualEvent('GATHERING_START', 2)
 *   debugger.stop()
 *   debugger.generateReport()
 *
 * @version 1.0.0
 * @author LottoDrop Development Team
 */

export interface TimingEvent {
  type: 'audio' | 'visual' | 'system'
  timestamp: number // milliseconds since session start
  relativeTime: number // milliseconds since sequence start
  eventName: string
  details?: Record<string, any>
}

export interface SyncDriftAnalysis {
  audioEvent: string
  visualEvent: string
  expectedDrift: number // Expected timing difference
  actualDrift: number // Measured timing difference
  driftError: number // Difference between expected and actual
  withinTolerance: boolean // Is drift error acceptable?
}

export interface TimingReport {
  sequenceName: string
  startTime: number
  endTime: number
  duration: number
  events: TimingEvent[]
  driftAnalysis: SyncDriftAnalysis[]
  summary: {
    totalAudioEvents: number
    totalVisualEvents: number
    averageDrift: number
    maxDrift: number
    syncAccuracy: number // Percentage
  }
}

class AudioTimingDebugger {
  private enabled = false
  private sessionStartTime = 0
  private sequenceStartTime = 0
  private currentSequence = ''
  private events: TimingEvent[] = []

  // Color codes for console output
  private colors = {
    audio: '\x1b[36m', // Cyan
    visual: '\x1b[33m', // Yellow
    system: '\x1b[35m', // Magenta
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m'
  }

  // Sync tolerance threshold (milliseconds)
  private readonly SYNC_TOLERANCE = 50

  constructor() {
    // Enable in development or when explicitly set
    this.enabled = import.meta.env.DEV || localStorage.getItem('lottodrop_audio_debug') === 'true'

    if (this.enabled) {
      console.info('%c[AudioTimingDebugger] Initialized (Debug mode enabled)', 'color: #9D4EDD; font-weight: bold;')
    }
  }

  /**
   * Enable debug logging
   */
  enable(): void {
    this.enabled = true
    localStorage.setItem('lottodrop_audio_debug', 'true')
    console.info('%c[AudioTimingDebugger] Debug logging enabled', 'color: #9D4EDD; font-weight: bold;')
  }

  /**
   * Disable debug logging
   */
  disable(): void {
    this.enabled = false
    localStorage.removeItem('lottodrop_audio_debug')
    console.info('[AudioTimingDebugger] Debug logging disabled')
  }

  /**
   * Start a new timing sequence
   */
  start(sequenceName: string): void {
    if (!this.enabled) return

    this.currentSequence = sequenceName
    this.sessionStartTime = performance.now()
    this.sequenceStartTime = performance.now()
    this.events = []

    this.logSystem(`Starting sequence: ${sequenceName}`)
  }

  /**
   * Stop the current timing sequence
   */
  stop(): void {
    if (!this.enabled) return

    const duration = performance.now() - this.sequenceStartTime
    this.logSystem(`Sequence complete: ${this.currentSequence} (${duration.toFixed(2)}ms)`)
  }

  /**
   * Log an audio trigger event
   */
  logAudioTrigger(
    audioKey: string,
    relativeTime: number,
    details?: Record<string, any>
  ): void {
    if (!this.enabled) return

    const event: TimingEvent = {
      type: 'audio',
      timestamp: performance.now(),
      relativeTime,
      eventName: audioKey,
      details
    }

    this.events.push(event)

    const detailsStr = details ? ` (${JSON.stringify(details)})` : ''
    console.log(
      `%c[AUDIO]%c T+${relativeTime.toFixed(1)}ms: ${audioKey}${detailsStr}`,
      `color: ${this.colors.audio}; font-weight: bold;`,
      'color: inherit;'
    )
  }

  /**
   * Log a visual event (animation phase change)
   */
  logVisualEvent(
    eventName: string,
    relativeTime: number,
    details?: Record<string, any>
  ): void {
    if (!this.enabled) return

    const event: TimingEvent = {
      type: 'visual',
      timestamp: performance.now(),
      relativeTime,
      eventName,
      details
    }

    this.events.push(event)

    const detailsStr = details ? ` (${JSON.stringify(details)})` : ''
    console.log(
      `%c[VISUAL]%c T+${relativeTime.toFixed(1)}ms: ${eventName}${detailsStr}`,
      `color: ${this.colors.visual}; font-weight: bold;`,
      'color: inherit;'
    )
  }

  /**
   * Log a system event (context state change)
   */
  logSystem(message: string, details?: Record<string, any>): void {
    if (!this.enabled) return

    const relativeTime = performance.now() - this.sequenceStartTime

    const event: TimingEvent = {
      type: 'system',
      timestamp: performance.now(),
      relativeTime,
      eventName: message,
      details
    }

    this.events.push(event)

    const detailsStr = details ? ` (${JSON.stringify(details)})` : ''
    console.log(
      `%c[SYSTEM]%c T+${relativeTime.toFixed(1)}ms: ${message}${detailsStr}`,
      `color: ${this.colors.system}; font-weight: bold;`,
      'color: inherit;'
    )
  }

  /**
   * Analyze sync drift between audio and visual events
   */
  analyzeSyncDrift(
    audioEventName: string,
    visualEventName: string,
    expectedDrift: number
  ): SyncDriftAnalysis | null {
    if (!this.enabled) return null

    const audioEvent = this.events.find(
      e => e.type === 'audio' && e.eventName === audioEventName
    )
    const visualEvent = this.events.find(
      e => e.type === 'visual' && e.eventName === visualEventName
    )

    if (!audioEvent || !visualEvent) {
      console.warn(`[AudioTimingDebugger] Cannot analyze drift: events not found`)
      return null
    }

    const actualDrift = audioEvent.relativeTime - visualEvent.relativeTime
    const driftError = Math.abs(actualDrift - expectedDrift)
    const withinTolerance = driftError <= this.SYNC_TOLERANCE

    const analysis: SyncDriftAnalysis = {
      audioEvent: audioEventName,
      visualEvent: visualEventName,
      expectedDrift,
      actualDrift,
      driftError,
      withinTolerance
    }

    const color = withinTolerance ? this.colors.success : this.colors.error
    console.log(
      `%c[DRIFT ANALYSIS]%c ${audioEventName} vs ${visualEventName}: ` +
      `Expected ${expectedDrift}ms, Actual ${actualDrift.toFixed(2)}ms, ` +
      `Error ${driftError.toFixed(2)}ms ${withinTolerance ? '✓' : '✗'}`,
      `color: ${color}; font-weight: bold;`,
      'color: inherit;'
    )

    return analysis
  }

  /**
   * Generate a comprehensive timing report
   */
  generateReport(): TimingReport {
    if (!this.enabled) {
      return {
        sequenceName: '',
        startTime: 0,
        endTime: 0,
        duration: 0,
        events: [],
        driftAnalysis: [],
        summary: {
          totalAudioEvents: 0,
          totalVisualEvents: 0,
          averageDrift: 0,
          maxDrift: 0,
          syncAccuracy: 0
        }
      }
    }

    const endTime = performance.now()
    const duration = endTime - this.sequenceStartTime

    // Calculate summary statistics
    const audioEvents = this.events.filter(e => e.type === 'audio')
    const visualEvents = this.events.filter(e => e.type === 'visual')

    // Simplified drift analysis (comparing consecutive audio/visual events)
    const driftAnalysis: SyncDriftAnalysis[] = []
    let totalDrift = 0
    let maxDrift = 0

    for (let i = 0; i < Math.min(audioEvents.length, visualEvents.length); i++) {
      const drift = Math.abs(audioEvents[i].relativeTime - visualEvents[i].relativeTime)
      totalDrift += drift
      maxDrift = Math.max(maxDrift, drift)
    }

    const averageDrift = audioEvents.length > 0 ? totalDrift / audioEvents.length : 0
    const syncAccuracy = maxDrift <= this.SYNC_TOLERANCE ? 100 : Math.max(0, 100 - (maxDrift - this.SYNC_TOLERANCE))

    const report: TimingReport = {
      sequenceName: this.currentSequence,
      startTime: this.sequenceStartTime,
      endTime,
      duration,
      events: this.events,
      driftAnalysis,
      summary: {
        totalAudioEvents: audioEvents.length,
        totalVisualEvents: visualEvents.length,
        averageDrift,
        maxDrift,
        syncAccuracy
      }
    }

    // Print formatted report
    this.printReport(report)

    return report
  }

  /**
   * Print formatted report to console
   */
  private printReport(report: TimingReport): void {
    console.group('%c═══ AUDIO TIMING REPORT ═══', 'color: #9D4EDD; font-weight: bold; font-size: 14px;')

    console.log(`%cSequence: ${report.sequenceName}`, 'font-weight: bold;')
    console.log(`Duration: ${report.duration.toFixed(2)}ms`)
    console.log(`Total Events: ${report.events.length} (${report.summary.totalAudioEvents} audio, ${report.summary.totalVisualEvents} visual)`)
    console.log('')

    // Timeline visualization
    console.group('Timeline:')
    this.events.forEach(event => {
      const icon = event.type === 'audio' ? '🔊' : event.type === 'visual' ? '🎬' : '⚙️'
      const time = `T+${event.relativeTime.toFixed(1)}ms`.padEnd(12)
      console.log(`${icon} ${time} ${event.eventName}`)
    })
    console.groupEnd()
    console.log('')

    // Sync analysis
    if (report.summary.totalAudioEvents > 0) {
      const accuracyColor = report.summary.syncAccuracy >= 90
        ? this.colors.success
        : report.summary.syncAccuracy >= 70
        ? this.colors.warning
        : this.colors.error

      console.log(`%cSync Accuracy: ${report.summary.syncAccuracy.toFixed(1)}%`, `color: ${accuracyColor}; font-weight: bold;`)
      console.log(`Average Drift: ${report.summary.averageDrift.toFixed(2)}ms`)
      console.log(`Max Drift: ${report.summary.maxDrift.toFixed(2)}ms`)
      console.log(`Tolerance: ${this.SYNC_TOLERANCE}ms`)
    }

    console.groupEnd()
  }

  /**
   * Export report as JSON (for analysis tools)
   */
  exportReport(): string {
    const report = this.generateReport()
    return JSON.stringify(report, null, 2)
  }

  /**
   * Clear all recorded events
   */
  clear(): void {
    this.events = []
    this.sessionStartTime = 0
    this.sequenceStartTime = 0
    this.currentSequence = ''
  }
}

// Export singleton instance
export const audioTimingDebugger = new AudioTimingDebugger()
export default audioTimingDebugger

/**
 * Convenience functions for quick debugging
 */
export function enableAudioDebug(): void {
  audioTimingDebugger.enable()
}

export function disableAudioDebug(): void {
  audioTimingDebugger.disable()
}

export function logAudio(key: string, time: number, details?: Record<string, any>): void {
  audioTimingDebugger.logAudioTrigger(key, time, details)
}

export function logVisual(event: string, time: number, details?: Record<string, any>): void {
  audioTimingDebugger.logVisualEvent(event, time, details)
}

export function analyzeSync(audioEvent: string, visualEvent: string, expectedDrift: number): void {
  audioTimingDebugger.analyzeSyncDrift(audioEvent, visualEvent, expectedDrift)
}
