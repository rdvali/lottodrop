/**
 * AudioService Enhancements
 * Additional methods for precise audio-visual synchronization
 *
 * These methods extend the core AudioService with:
 * - Scheduled playback with Web Audio API precision
 * - Debounced playback to prevent double-triggers
 * - Fade-out with completion promises
 * - Debug logging for timing verification
 *
 * @version 1.0.0
 * @author LottoDrop Development Team
 */

import type { AudioPlayOptions, AudioPlayResult } from '../../types/audio.types'
import { audioService } from './AudioService'

/**
 * Debounce threshold for preventing duplicate sound triggers
 */
const DEBOUNCE_THRESHOLD_MS = 100

/**
 * Recently played sounds tracker (for debouncing)
 */
const recentlyPlayed = new Map<string, number>()

/**
 * Play a sound at a specific scheduled time using Web Audio API precision
 *
 * This method is superior to setTimeout-based delays because it uses the
 * AudioContext's internal clock, which is independent of main thread timing.
 *
 * @param key - Sound key from manifest
 * @param scheduleTime - Absolute time in audioContext.currentTime (seconds)
 * @param options - Playback options
 * @returns Promise that resolves with AudioPlayResult containing duration and timing info
 *
 * @example
 * ```typescript
 * const audioCtx = audioService.getAudioContext()
 * const startTime = audioCtx.currentTime + 1.5 // Play 1.5 seconds from now
 * await playScheduled('reveal.drum', startTime, { volume: 1.0 })
 * ```
 */
export async function playScheduled(
  key: string,
  scheduleTime: number,
  options: AudioPlayOptions = {}
): Promise<AudioPlayResult> {
  // Get the audio context from the service
  const audioContext = (audioService as any).audioContext

  if (!audioContext || !(audioService as any).usingWebAudioAPI) {
    // Fallback: convert scheduleTime to delay in milliseconds
    const now = audioContext?.currentTime || Date.now() / 1000
    const delay = Math.max(0, (scheduleTime - now) * 1000)

    console.warn(
      `[AudioServiceEnhancements] Web Audio API not available, using setTimeout with ${delay.toFixed(0)}ms delay`
    )

    return audioService.play(key, { ...options, delay })
  }

  // Use Web Audio API scheduling
  return audioService.play(key, { ...options, scheduleTime })
}

/**
 * Stop a sound with guaranteed fade-out completion
 *
 * Unlike the standard stop() method, this returns a Promise that resolves
 * only after the fade-out has completed, allowing for precise sequencing
 * of audio events.
 *
 * @param key - Sound key to stop
 * @param fadeOutDuration - Fade duration in milliseconds
 * @returns Promise that resolves when fade completes
 *
 * @example
 * ```typescript
 * // Stop riser with 200ms fade, then play drum
 * await stopWithFade('reveal.riser', 200)
 * await audioService.play('reveal.drum')
 * ```
 */
export async function stopWithFade(key: string, fadeOutDuration: number): Promise<void> {
  return new Promise((resolve) => {
    audioService.stop(key, { fadeOut: fadeOutDuration })

    // Resolve after fade completes
    setTimeout(resolve, fadeOutDuration)
  })
}

/**
 * Play a sound with debouncing to prevent double-triggers
 *
 * Tracks recently played sounds and blocks duplicate plays within the
 * debounce threshold. This is essential for preventing socket event
 * double-triggers and rapid user input duplicates.
 *
 * @param key - Sound key to play
 * @param options - Playback options
 * @param threshold - Debounce threshold in milliseconds (default: 100ms)
 * @returns Promise that resolves with AudioPlayResult (duration: 0 if debounced)
 *
 * @example
 * ```typescript
 * // Safe from double-triggers
 * await playDebounced('round.start', { volume: 0.8 })
 * ```
 */
export async function playDebounced(
  key: string,
  options: AudioPlayOptions = {},
  threshold: number = DEBOUNCE_THRESHOLD_MS
): Promise<AudioPlayResult> {
  const now = Date.now()
  const lastPlayed = recentlyPlayed.get(key) || 0

  if (now - lastPlayed < threshold) {
    console.warn(`[AudioServiceEnhancements] Debounced duplicate play: ${key} (${now - lastPlayed}ms since last play)`)
    // Return a dummy result indicating the sound was debounced
    return Promise.resolve({
      key,
      duration: 0,
      scheduledTime: undefined,
      endTime: undefined
    })
  }

  recentlyPlayed.set(key, now)

  // Clean up old entries (prevent memory leak)
  if (recentlyPlayed.size > 20) {
    const oldestKey = Array.from(recentlyPlayed.entries())
      .sort((a, b) => a[1] - b[1])[0][0]
    recentlyPlayed.delete(oldestKey)
  }

  return audioService.play(key, options)
}

/**
 * Play with timing debug logging
 *
 * Wraps audioService.play() with performance measurement and console logging.
 * Only logs in development mode or when audio debug is explicitly enabled.
 *
 * @param key - Sound key to play
 * @param options - Playback options
 * @param debugContext - Optional context string for the log
 * @returns Promise that resolves with AudioPlayResult containing duration and timing info
 *
 * @example
 * ```typescript
 * await playDebug('reveal.explosion', { volume: 0.9 }, 'EXPLOSION_PHASE')
 * // Console: [AudioService] Played reveal.explosion in 2.34ms (EXPLOSION_PHASE)
 * ```
 */
export async function playDebug(
  key: string,
  options: AudioPlayOptions = {},
  debugContext?: string
): Promise<AudioPlayResult> {
  const debugEnabled = import.meta.env.DEV || localStorage.getItem('lottodrop_audio_debug') === 'true'

  if (!debugEnabled) {
    return audioService.play(key, options)
  }

  const startTime = performance.now()

  try {
    const result = await audioService.play(key, options)

    const elapsed = performance.now() - startTime
    const contextStr = debugContext ? ` (${debugContext})` : ''

    console.debug(
      `%c[AudioService]%c Played ${key} in ${elapsed.toFixed(2)}ms${contextStr}`,
      'color: #36CFC9; font-weight: bold;',
      'color: inherit;'
    )

    return result
  } catch (error) {
    const elapsed = performance.now() - startTime
    const contextStr = debugContext ? ` (${debugContext})` : ''

    console.error(
      `%c[AudioService]%c Failed to play ${key} after ${elapsed.toFixed(2)}ms${contextStr}`,
      'color: #FF4D4F; font-weight: bold;',
      'color: inherit;',
      error
    )

    throw error
  }
}

/**
 * Get the AudioContext instance from AudioService
 *
 * Useful for calculating precise scheduling times.
 *
 * @returns AudioContext or null if not initialized
 *
 * @example
 * ```typescript
 * const audioCtx = getAudioContext()
 * if (audioCtx) {
 *   const futureTime = audioCtx.currentTime + 2.5
 *   await playScheduled('reveal.drum', futureTime)
 * }
 * ```
 */
export function getAudioContext(): AudioContext | null {
  return (audioService as any).audioContext || null
}

/**
 * Check if Web Audio API is being used (vs HTML Audio fallback)
 *
 * @returns true if Web Audio API is active
 */
export function isUsingWebAudioAPI(): boolean {
  return (audioService as any).usingWebAudioAPI || false
}

/**
 * Calculate latency-compensated trigger time
 *
 * Given a target animation time (in milliseconds), returns the audio trigger
 * time compensated for system latency.
 *
 * @param targetTimeMs - Target time in milliseconds (relative to sequence start)
 * @param latencyCompensationMs - Latency compensation in milliseconds (default: 30ms)
 * @returns Compensated trigger time in milliseconds
 *
 * @example
 * ```typescript
 * const explosionAnimationTime = 2000 // 2 seconds
 * const audioTriggerTime = calculateCompensatedTime(explosionAnimationTime)
 * // Returns 1970 (30ms earlier)
 * ```
 */
export function calculateCompensatedTime(
  targetTimeMs: number,
  latencyCompensationMs: number = 30
): number {
  return targetTimeMs - latencyCompensationMs
}

/**
 * Schedule multiple sounds with precise timing
 *
 * Accepts an array of scheduled events and plays them all with Web Audio API
 * precision. Returns when all sounds have been scheduled (not when they finish).
 *
 * @param events - Array of scheduled audio events
 * @returns Promise that resolves when all sounds are scheduled
 *
 * @example
 * ```typescript
 * const audioCtx = getAudioContext()
 * const baseTime = audioCtx.currentTime
 *
 * await scheduleMultiple([
 *   { key: 'reveal.tick', time: baseTime + 0.1, options: { volume: 0.8 } },
 *   { key: 'reveal.tick', time: baseTime + 0.2, options: { volume: 0.8 } },
 *   { key: 'reveal.tick', time: baseTime + 0.3, options: { volume: 0.8 } },
 * ])
 * ```
 */
export async function scheduleMultiple(
  events: Array<{
    key: string
    time: number // Absolute time in audioContext.currentTime
    options?: AudioPlayOptions
  }>
): Promise<void> {
  const audioContext = getAudioContext()

  if (!audioContext) {
    console.warn('[AudioServiceEnhancements] Cannot schedule multiple: Web Audio API not available')

    // Fallback: use delays
    const now = Date.now() / 1000
    const promises = events.map(event => {
      const delay = Math.max(0, (event.time - now) * 1000)
      return audioService.play(event.key, { ...event.options, delay })
    })

    await Promise.all(promises)
    return
  }

  // Schedule all sounds using Web Audio API
  const promises = events.map(event =>
    playScheduled(event.key, event.time, event.options)
  )

  await Promise.all(promises)
}

/**
 * Clear the debounce cache
 *
 * Useful for testing or when you need to allow immediate re-play of a sound
 * that was recently debounced.
 */
export function clearDebounceCache(): void {
  recentlyPlayed.clear()
  console.debug('[AudioServiceEnhancements] Debounce cache cleared')
}

/**
 * Pre-warm audio playback system
 *
 * Plays a silent sound to "wake up" the Web Audio API on mobile devices.
 * This ensures subsequent sounds play with minimal latency.
 *
 * Call this on first user interaction (click, touch, keypress).
 *
 * @returns Promise that resolves when pre-warming completes
 */
export async function prewarmAudioSystem(): Promise<void> {
  const audioContext = getAudioContext()

  if (!audioContext) {
    console.warn('[AudioServiceEnhancements] Cannot prewarm: Web Audio API not available')
    return
  }

  try {
    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    // Create and play silent buffer (1ms of silence)
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.001, audioContext.sampleRate)
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start()

    console.debug('[AudioServiceEnhancements] Audio system pre-warmed successfully')
  } catch (error) {
    console.warn('[AudioServiceEnhancements] Failed to prewarm audio system:', error)
  }
}

/**
 * Export all enhancements as a single object for easier importing
 */
export const audioEnhancements = {
  playScheduled,
  stopWithFade,
  playDebounced,
  playDebug,
  getAudioContext,
  isUsingWebAudioAPI,
  calculateCompensatedTime,
  scheduleMultiple,
  clearDebounceCache,
  prewarmAudioSystem
}

export default audioEnhancements
