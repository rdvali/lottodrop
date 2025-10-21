import { useState, useEffect, useCallback } from 'react'
import { audioService } from '../services/audio/AudioService'

interface AudioPreferences {
  enabled: boolean
  volume: number
  dismissedBanner: boolean
  lastUpdated: string
}

interface UseAudioManagerReturn {
  // State
  isEnabled: boolean
  audioState: 'running' | 'suspended' | 'closed' | 'interrupted'
  showBanner: boolean
  volume: number
  isMuted: boolean

  // Actions
  toggleAudio: () => Promise<void>
  enableAudio: () => Promise<void>
  disableAudio: () => void
  dismissBanner: () => void
  setVolume: (volume: number) => void
  mute: (shouldMute: boolean) => void

  // Status
  isInitialized: boolean
  canAutoplay: boolean
}

const STORAGE_KEY = 'lottodrop_audio_preferences'

const defaultPreferences: AudioPreferences = {
  enabled: false,
  volume: 0.7,
  dismissedBanner: false,
  lastUpdated: new Date().toISOString(),
}

export const useAudioManager = (): UseAudioManagerReturn => {
  const [isEnabled, setIsEnabled] = useState(false)
  const [audioState, setAudioState] = useState<'running' | 'suspended' | 'closed' | 'interrupted'>('closed')
  const [showBanner, setShowBanner] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [canAutoplay, setCanAutoplay] = useState(false)

  // Load preferences from localStorage
  const loadPreferences = useCallback((): AudioPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load audio preferences:', error)
    }
    return defaultPreferences
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((prefs: Partial<AudioPreferences>) => {
    try {
      const current = loadPreferences()
      const updated = {
        ...current,
        ...prefs,
        lastUpdated: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save audio preferences:', error)
    }
  }, [loadPreferences])

  // Update audio state from AudioContext
  const updateAudioState = useCallback(() => {
    const status = audioService.getStatus()
    setIsEnabled(status.isEnabled)
    setIsMuted(status.isMuted)
    setVolumeState(status.masterVolume)
    setIsInitialized(status.isInitialized)
    setCanAutoplay(status.canAutoplay)

    // Determine AudioContext state
    if (status.activeAudioAPI === 'WebAudio') {
      // Access audioContext state if available
      const ctx = (audioService as any).audioContext
      if (ctx) {
        setAudioState(ctx.state as 'running' | 'suspended' | 'closed' | 'interrupted')
      }
    } else if (status.activeAudioAPI === 'HTMLAudio') {
      setAudioState('running')
    } else {
      setAudioState('closed')
    }
  }, [])

  // Initialize audio manager
  useEffect(() => {
    const prefs = loadPreferences()

    // Set initial volume
    if (prefs.volume !== undefined) {
      audioService.setVolume(prefs.volume)
    }

    // Determine if we should show the banner
    // Show banner if:
    // 1. Audio is not enabled yet
    // 2. User hasn't dismissed it
    // 3. AudioContext is suspended (mobile autoplay policy)
    const shouldShowBanner = !prefs.enabled && !prefs.dismissedBanner

    setShowBanner(shouldShowBanner)
    updateAudioState()

    // Listen for audio state changes
    const handleStatusChange = () => {
      updateAudioState()
    }

    audioService.addEventListener('initialized', handleStatusChange)
    audioService.addEventListener('statusChanged', handleStatusChange)
    audioService.addEventListener('enabled', handleStatusChange)
    audioService.addEventListener('disabled', handleStatusChange)
    audioService.addEventListener('muted', handleStatusChange)
    audioService.addEventListener('unmuted', handleStatusChange)

    // Monitor AudioContext state changes
    const checkAudioState = setInterval(() => {
      updateAudioState()
    }, 1000)

    return () => {
      audioService.removeEventListener('initialized', handleStatusChange)
      audioService.removeEventListener('statusChanged', handleStatusChange)
      audioService.removeEventListener('enabled', handleStatusChange)
      audioService.removeEventListener('disabled', handleStatusChange)
      audioService.removeEventListener('muted', handleStatusChange)
      audioService.removeEventListener('unmuted', handleStatusChange)
      clearInterval(checkAudioState)
    }
  }, [loadPreferences, updateAudioState])

  // Enable audio
  const enableAudio = useCallback(async () => {
    try {
      audioService.enable()
      await audioService.resumeContext()
      savePreferences({ enabled: true })
      setShowBanner(false)
      updateAudioState()
    } catch (error) {
      console.error('Failed to enable audio:', error)
      throw error
    }
  }, [savePreferences, updateAudioState])

  // Disable audio
  const disableAudio = useCallback(() => {
    audioService.disable()
    savePreferences({ enabled: false })
    updateAudioState()
  }, [savePreferences, updateAudioState])

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (isEnabled) {
      disableAudio()
    } else {
      await enableAudio()
    }
  }, [isEnabled, enableAudio, disableAudio])

  // Dismiss banner
  const dismissBanner = useCallback(() => {
    setShowBanner(false)
    savePreferences({ dismissedBanner: true })
  }, [savePreferences])

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    audioService.setVolume(newVolume)
    savePreferences({ volume: newVolume })
    setVolumeState(newVolume)
  }, [savePreferences])

  // Mute/unmute
  const mute = useCallback((shouldMute: boolean) => {
    audioService.mute(shouldMute)
    setIsMuted(shouldMute)
  }, [])

  return {
    // State
    isEnabled,
    audioState,
    showBanner,
    volume,
    isMuted,

    // Actions
    toggleAudio,
    enableAudio,
    disableAudio,
    dismissBanner,
    setVolume,
    mute,

    // Status
    isInitialized,
    canAutoplay,
  }
}
