/**
 * useAudio Hook
 *
 * React hook for accessing LottoDrop audio service
 * Provides convenient methods for playing sounds in components
 *
 * @example
 * ```tsx
 * const { play, stop, setVolume, isEnabled, enable } = useAudio()
 *
 * // Play a sound
 * play('countdown.tick')
 *
 * // Play with options
 * play('result.win', { volume: 0.9, fadeIn: 200 })
 *
 * // Enable audio on button click (required for mobile)
 * <button onClick={enable}>Enable Sound</button>
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { audioService } from '../services/audio'
import type {
  AudioPlayOptions,
  AudioServiceStatus,
  AudioEventType,
  AudioEventListener,
} from '../types/audio.types'

interface UseAudioReturn {
  // Playback methods
  play: (key: string, options?: AudioPlayOptions) => Promise<void>
  stop: (key: string) => void
  stopAll: () => void

  // Volume control
  setVolume: (volume: number) => void
  mute: (shouldMute: boolean) => void

  // Enable/disable
  enable: () => void
  disable: () => void

  // Status
  isEnabled: boolean
  isInitialized: boolean
  isMuted: boolean
  masterVolume: number
  status: AudioServiceStatus

  // Utility
  canAutoplay: boolean
}

/**
 * Custom hook for audio service integration
 */
export const useAudio = (): UseAudioReturn => {
  const [status, setStatus] = useState<AudioServiceStatus>(audioService.getStatus())
  const statusUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  // Update status when audio events occur
  const updateStatus = useCallback(() => {
    setStatus(audioService.getStatus())
  }, [])

  useEffect(() => {
    // Register event listeners
    const events: AudioEventType[] = [
      'initialized',
      'enabled',
      'disabled',
      'volumeChanged',
      'muted',
      'unmuted',
      'assetLoaded',
      'assetFailed',
    ]

    const listener: AudioEventListener = () => {
      updateStatus()
    }

    events.forEach(event => {
      audioService.addEventListener(event, listener)
    })

    // Set up periodic status updates (every 2 seconds)
    // This ensures UI stays in sync even if events are missed
    statusUpdateInterval.current = setInterval(updateStatus, 2000)

    // Initial status update
    updateStatus()

    return () => {
      // Clean up listeners
      events.forEach(event => {
        audioService.removeEventListener(event, listener)
      })

      // Clear interval
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current)
      }
    }
  }, [updateStatus])

  // Playback methods
  const play = useCallback(async (key: string, options?: AudioPlayOptions) => {
    try {
      await audioService.play(key, options)
    } catch (error) {
      console.error(`[useAudio] Failed to play sound "${key}":`, error)
    }
  }, [])

  const stop = useCallback((key: string) => {
    audioService.stop(key)
  }, [])

  const stopAll = useCallback(() => {
    audioService.stopAll()
  }, [])

  // Volume control
  const setVolume = useCallback((volume: number) => {
    audioService.setVolume(volume)
    updateStatus()
  }, [updateStatus])

  const mute = useCallback((shouldMute: boolean) => {
    audioService.mute(shouldMute)
    updateStatus()
  }, [updateStatus])

  // Enable/disable
  const enable = useCallback(() => {
    audioService.enable()
    updateStatus()
  }, [updateStatus])

  const disable = useCallback(() => {
    audioService.disable()
    updateStatus()
  }, [updateStatus])

  return {
    // Playback methods
    play,
    stop,
    stopAll,

    // Volume control
    setVolume,
    mute,

    // Enable/disable
    enable,
    disable,

    // Status
    isEnabled: status.isEnabled,
    isInitialized: status.isInitialized,
    isMuted: status.isMuted,
    masterVolume: status.masterVolume,
    status,

    // Utility
    canAutoplay: status.canAutoplay,
  }
}

export default useAudio
