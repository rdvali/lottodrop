/**
 * LottoDrop Audio Service
 *
 * Production-grade audio service for real-time gaming platform
 * Features:
 * - Web Audio API with HTMLAudioElement fallback
 * - Mobile autoplay policy compliance
 * - Persistent user preferences (localStorage)
 * - Master volume control and muting
 * - Asset preloading and caching
 * - Low-latency playback (target: ≤50ms)
 * - Format detection (.ogg preferred, .mp3 fallback)
 *
 * @version 1.0.0
 * @author LottoDrop Development Team
 */

import type {
  AudioManifest,
  AudioPlayOptions,
  AudioServiceStatus,
  AudioLoadResult,
  AudioPlayResult,
  AudioError,
  AudioErrorType,
  AudioEventListener,
  AudioEventType,
  AudioFormatSupport,
  AudioContextState,
  HTMLAudioState,
} from '../../types/audio.types'

// Storage keys
const STORAGE_KEYS = {
  ENABLED: 'lottodrop_audio_enabled',
  VOLUME: 'lottodrop_audio_volume',
  MUTED: 'lottodrop_audio_muted',
} as const

// Default configuration
const DEFAULT_CONFIG = {
  MASTER_VOLUME: 0.8,
  PRELOAD_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 2,
  FADE_DURATION: 100, // milliseconds
  LATENCY_COMPENSATION: 80, // milliseconds - pre-trigger audio for sync (updated from 30ms)
  DEBOUNCE_THRESHOLD: 100, // milliseconds - prevent double-triggers
  DEBUG_TIMING: true, // Enable timing debug logs
} as const

class AudioService {
  // Service state
  private isInitialized = false
  private isEnabled = false
  private isMuted = false
  private masterVolume = DEFAULT_CONFIG.MASTER_VOLUME

  // Web Audio API state
  private audioContext: AudioContext | null = null
  private masterGainNode: GainNode | null = null
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private activeSourceNodes: Map<string, AudioBufferSourceNode[]> = new Map()
  private activeGainNodes: Map<string, GainNode[]> = new Map() // Track gain nodes for fade-out

  // HTML Audio fallback state
  private audioElements: Map<string, HTMLAudioElement> = new Map()
  private usingWebAudioAPI = false

  // Asset management
  private manifest: AudioManifest | null = null
  private loadedAssets: Set<string> = new Set()
  private failedAssets: Set<string> = new Set()
  private soundDurations: Map<string, number> = new Map() // key -> duration in seconds
  private soundTypes: Map<string, string> = new Map() // key -> sound type

  // Event listeners
  private eventListeners: Map<AudioEventType, Set<AudioEventListener>> = new Map()

  // Mobile autoplay detection
  private autoplayAllowed = false
  private userInteracted = false

  // Debouncing and timing
  private lastPlayTime: Map<string, number> = new Map()
  private sessionStartTime: number = Date.now()

  /**
   * Initialize the audio service
   * @param manifest - Audio manifest with asset definitions
   */
  async init(manifest: AudioManifest): Promise<void> {
    if (this.isInitialized) {
      console.warn('[AudioService] Already initialized')
      return
    }

    try {
      this.manifest = manifest

      // Load user preferences from localStorage
      this.loadPreferences()

      // Store sound durations and types from manifest
      if (manifest.durations) {
        Object.entries(manifest.durations).forEach(([key, duration]) => {
          this.soundDurations.set(key, duration)
        })
      }
      if (manifest.types) {
        Object.entries(manifest.types).forEach(([key, type]) => {
          this.soundTypes.set(key, type)
        })
      }

      // Detect audio format support
      const formatSupport = this.detectFormatSupport()
      console.info('[AudioService] Format support:', formatSupport)

      // Initialize Web Audio API or fallback to HTML Audio
      const webAudioInitialized = await this.initWebAudioAPI()

      if (webAudioInitialized) {
        this.usingWebAudioAPI = true
        console.info('[AudioService] Using Web Audio API')
      } else {
        this.usingWebAudioAPI = false
        console.info('[AudioService] Using HTML Audio fallback')
      }

      // Preload specified assets
      if (manifest.preload && manifest.preload.length > 0) {
        await this.preloadAssets(manifest.preload)
      }

      // Set up autoplay detection
      this.setupAutoplayDetection()

      this.isInitialized = true
      this.emitEvent('initialized')

      console.info('[AudioService] Initialized successfully', {
        api: this.usingWebAudioAPI ? 'WebAudio' : 'HTMLAudio',
        preloaded: this.loadedAssets.size,
        failed: this.failedAssets.size,
      })
    } catch (error) {
      const audioError = this.createError('INITIALIZATION_FAILED', 'Failed to initialize audio service', error as Error)
      console.error('[AudioService] Initialization failed:', audioError)
      this.emitEvent('error', audioError)
      throw audioError
    }
  }

  /**
   * Initialize Web Audio API
   */
  private async initWebAudioAPI(): Promise<boolean> {
    try {
      // Check for Web Audio API support
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        return false
      }

      // Create audio context
      this.audioContext = new AudioContextClass()

      // Create master gain node
      this.masterGainNode = this.audioContext.createGain()
      this.masterGainNode.connect(this.audioContext.destination)
      this.masterGainNode.gain.value = this.isMuted ? 0 : this.masterVolume

      // Resume context if suspended (mobile Safari requirement)
      if (this.audioContext.state === 'suspended') {
        // Will be resumed on user interaction
        console.info('[AudioService] AudioContext suspended, waiting for user interaction')
      }

      return true
    } catch (error) {
      console.error('[AudioService] Web Audio API initialization failed:', error)
      return false
    }
  }

  /**
   * Setup autoplay detection for mobile devices
   */
  private setupAutoplayDetection(): void {
    const detectAutoplay = async () => {
      if (this.usingWebAudioAPI && this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          try {
            await this.audioContext.resume()
            this.autoplayAllowed = true
            this.userInteracted = true
            console.info('[AudioService] Autoplay enabled after user interaction')
          } catch (error) {
            console.warn('[AudioService] Failed to resume audio context:', error)
          }
        } else {
          this.autoplayAllowed = true
          this.userInteracted = true
        }
      } else {
        this.autoplayAllowed = true
        this.userInteracted = true
      }

      // Remove listeners after first interaction
      document.removeEventListener('click', detectAutoplay)
      document.removeEventListener('touchstart', detectAutoplay)
      document.removeEventListener('keydown', detectAutoplay)
    }

    // Listen for user interactions
    document.addEventListener('click', detectAutoplay, { once: true })
    document.addEventListener('touchstart', detectAutoplay, { once: true })
    document.addEventListener('keydown', detectAutoplay, { once: true })
  }

  /**
   * Detect audio format support
   */
  private detectFormatSupport(): AudioFormatSupport {
    const audio = document.createElement('audio')

    const support: AudioFormatSupport = {
      ogg: audio.canPlayType('audio/ogg; codecs="vorbis"') !== '',
      mp3: audio.canPlayType('audio/mpeg') !== '',
      wav: audio.canPlayType('audio/wav') !== '',
      aac: audio.canPlayType('audio/aac') !== '',
      preferredFormat: 'none',
    }

    // Prefer OGG for better compression, fallback to MP3
    if (support.ogg) {
      support.preferredFormat = 'ogg'
    } else if (support.mp3) {
      support.preferredFormat = 'mp3'
    } else if (support.wav) {
      support.preferredFormat = 'wav'
    }

    return support
  }

  /**
   * Preload specified audio assets
   */
  private async preloadAssets(assetKeys: string[]): Promise<void> {
    const loadPromises = assetKeys.map(key => this.loadAsset(key))

    const results = await Promise.allSettled(loadPromises)

    results.forEach((result, index) => {
      const key = assetKeys[index]
      if (result.status === 'fulfilled') {
        this.loadedAssets.add(key)
        this.emitEvent('assetLoaded', { key })
      } else {
        this.failedAssets.add(key)
        this.emitEvent('assetFailed', { key, error: result.reason })
      }
    })
  }

  /**
   * Load a single audio asset
   */
  private async loadAsset(key: string): Promise<AudioLoadResult> {
    if (!this.manifest || !this.manifest.assets[key]) {
      throw this.createError('NOT_FOUND', `Asset not found in manifest: ${key}`, undefined, key)
    }

    const sources = this.manifest.assets[key]

    // Try each source in order (OGG first, then MP3)
    for (const source of sources) {
      try {
        if (this.usingWebAudioAPI) {
          await this.loadWebAudioAsset(key, source)
        } else {
          await this.loadHTMLAudioAsset(key, source)
        }

        const format = source.endsWith('.ogg') ? 'ogg' : 'mp3'
        return { key, success: true, format }
      } catch (error) {
        console.warn(`[AudioService] Failed to load ${source}, trying next source...`)
        continue
      }
    }

    throw this.createError('LOAD_FAILED', `Failed to load any source for: ${key}`, undefined, key)
  }

  /**
   * Load asset using Web Audio API
   */
  private async loadWebAudioAsset(key: string, source: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

    this.audioBuffers.set(key, audioBuffer)
  }

  /**
   * Load asset using HTML Audio element
   */
  private async loadHTMLAudioAsset(key: string, source: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()

      audio.addEventListener('canplaythrough', () => {
        this.audioElements.set(key, audio)
        resolve()
      }, { once: true })

      audio.addEventListener('error', (e) => {
        reject(new Error(`Failed to load audio: ${e}`))
      }, { once: true })

      audio.preload = 'auto'
      audio.src = source
      audio.load()
    })
  }

  /**
   * Get sound duration
   * @param key - Sound key from manifest
   * @returns Duration in seconds, or 0 if not found
   */
  getDuration(key: string): number {
    return this.soundDurations.get(key) || 0
  }

  /**
   * Get sound type
   * @param key - Sound key from manifest
   * @returns Sound type classification
   */
  getType(key: string): string | undefined {
    return this.soundTypes.get(key)
  }

  /**
   * Play a sound with duration-aware result
   * @param key - Sound key from manifest
   * @param options - Playback options
   * @returns AudioPlayResult with duration and timing info
   */
  async play(key: string, options: AudioPlayOptions = {}): Promise<AudioPlayResult> {
    // Get sound duration from manifest
    const duration = this.getDuration(key)

    // Create default result for early returns
    const defaultResult: AudioPlayResult = {
      key,
      duration,
      scheduledTime: options.scheduleTime,
      endTime: options.scheduleTime ? options.scheduleTime + duration : undefined
    }

    if (!this.isInitialized) {
      console.warn('[AudioService] Not initialized, call init() first')
      return defaultResult
    }

    if (!this.isEnabled) {
      return defaultResult
    }

    // Check for user interaction on mobile
    if (!this.userInteracted) {
      console.warn('[AudioService] Waiting for user interaction before playing audio')
      return defaultResult
    }

    // Debouncing: Prevent duplicate plays within threshold
    const now = Date.now()
    const lastPlay = this.lastPlayTime.get(key)
    if (lastPlay && (now - lastPlay) < DEFAULT_CONFIG.DEBOUNCE_THRESHOLD) {
      if (DEFAULT_CONFIG.DEBUG_TIMING) {
        console.warn(`[AudioService] Debounced: ${key} (played ${now - lastPlay}ms ago)`)
      }
      return defaultResult
    }

    // Timing debug log
    if (DEFAULT_CONFIG.DEBUG_TIMING) {
      const elapsed = now - this.sessionStartTime
      const scheduleInfo = options.scheduleTime ? ` [scheduled at ${options.scheduleTime.toFixed(3)}s]` : ''
      const durationInfo = duration > 0 ? ` [duration: ${duration}s]` : ''
      console.log(`[AUDIO] T+${elapsed}ms: ${key}${scheduleInfo}${durationInfo}`, options)
    }

    try {
      // Resume audio context if suspended
      if (this.usingWebAudioAPI && this.audioContext?.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Calculate actual schedule time (for Web Audio API)
      let actualScheduleTime: number | undefined = undefined
      if (this.usingWebAudioAPI && this.audioContext) {
        if (options.scheduleTime !== undefined) {
          actualScheduleTime = options.scheduleTime
        } else if (options.delay) {
          actualScheduleTime = this.audioContext.currentTime + (options.delay / 1000)
        } else {
          actualScheduleTime = this.audioContext.currentTime
        }
      }

      if (this.usingWebAudioAPI) {
        await this.playWebAudio(key, options)
      } else {
        await this.playHTMLAudio(key, options)
      }

      // Record play time for debouncing
      this.lastPlayTime.set(key, now)

      this.emitEvent('play', { key, options })

      // Return result with timing information
      const result: AudioPlayResult = {
        key,
        duration,
        scheduledTime: actualScheduleTime,
        endTime: actualScheduleTime ? actualScheduleTime + duration : undefined
      }
      return result
    } catch (error) {
      const audioError = this.createError('PLAY_FAILED', `Failed to play sound: ${key}`, error as Error, key)
      console.error('[AudioService]', audioError)
      this.emitEvent('error', audioError)
      return defaultResult
    }
  }

  /**
   * Play sound using Web Audio API
   */
  private async playWebAudio(key: string, options: AudioPlayOptions): Promise<void> {
    if (!this.audioContext || !this.masterGainNode) {
      throw new Error('Web Audio API not initialized')
    }

    const buffer = this.audioBuffers.get(key)
    if (!buffer) {
      // Try to load the asset dynamically
      await this.loadAsset(key)
      return this.playWebAudio(key, options)
    }

    // Create source node
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = options.loop || false

    // Create gain node for individual sound volume
    const gainNode = this.audioContext.createGain()
    const volume = options.volume !== undefined ? options.volume : 1.0
    gainNode.gain.value = volume

    // Connect: source -> gain -> master -> destination
    source.connect(gainNode)
    gainNode.connect(this.masterGainNode)

    // Handle fade in
    if (options.fadeIn && options.fadeIn > 0) {
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(
        volume,
        this.audioContext.currentTime + options.fadeIn / 1000
      )
    }

    // Start playback with optional delay or scheduled time
    // Apply latency compensation for better audio-visual sync
    const latencyCompensation = DEFAULT_CONFIG.LATENCY_COMPENSATION / 1000 // Convert to seconds

    let startTime = 0
    if (options.scheduleTime !== undefined) {
      // Use absolute scheduled time (Web Audio API precision)
      // Subtract latency compensation to play slightly early
      startTime = Math.max(0, options.scheduleTime - latencyCompensation)
    } else if (options.delay) {
      // Use relative delay
      startTime = this.audioContext.currentTime + (options.delay / 1000) - latencyCompensation
    }

    source.start(Math.max(0, startTime))

    // Track active source and gain node
    if (!this.activeSourceNodes.has(key)) {
      this.activeSourceNodes.set(key, [])
    }
    if (!this.activeGainNodes.has(key)) {
      this.activeGainNodes.set(key, [])
    }
    this.activeSourceNodes.get(key)!.push(source)
    this.activeGainNodes.get(key)!.push(gainNode)

    // Clean up after playback ends
    source.onended = () => {
      const sources = this.activeSourceNodes.get(key)
      const gains = this.activeGainNodes.get(key)
      if (sources) {
        const index = sources.indexOf(source)
        if (index > -1) {
          sources.splice(index, 1)
          // Also remove corresponding gain node
          if (gains && gains[index]) {
            gains.splice(index, 1)
          }
        }
      }
    }
  }

  /**
   * Play sound using HTML Audio element
   */
  private async playHTMLAudio(key: string, options: AudioPlayOptions): Promise<void> {
    let audio = this.audioElements.get(key)

    if (!audio) {
      // Try to load the asset dynamically
      await this.loadAsset(key)
      audio = this.audioElements.get(key)
      if (!audio) {
        throw new Error(`Audio element not found for key: ${key}`)
      }
    }

    // Clone for polyphonic playback
    const audioClone = audio.cloneNode() as HTMLAudioElement
    audioClone.volume = (options.volume !== undefined ? options.volume : 1.0) * this.masterVolume * (this.isMuted ? 0 : 1)
    audioClone.loop = options.loop || false

    // Apply delay if specified
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }

    try {
      await audioClone.play()
    } catch (error) {
      // Handle autoplay policy
      if ((error as Error).name === 'NotAllowedError') {
        throw this.createError('AUTOPLAY_BLOCKED', 'Autoplay blocked by browser policy', error as Error, key)
      }
      throw error
    }
  }

  /**
   * Stop a currently playing sound
   * @param key - Sound key to stop
   * @param options - Stop options (fadeOut duration in ms)
   */
  stop(key: string, options?: { fadeOut?: number }): void {
    const fadeOutDuration = options?.fadeOut || 0

    // Timing debug log
    if (DEFAULT_CONFIG.DEBUG_TIMING) {
      const now = Date.now()
      const elapsed = now - this.sessionStartTime
      const fadeInfo = fadeOutDuration > 0 ? ` [fade: ${fadeOutDuration}ms]` : ''
      console.log(`[AUDIO-STOP] T+${elapsed}ms: ${key}${fadeInfo}`)
    }

    if (this.usingWebAudioAPI && this.audioContext && this.masterGainNode) {
      const sources = this.activeSourceNodes.get(key)
      const gains = this.activeGainNodes.get(key)

      if (sources && sources.length > 0 && gains && gains.length > 0) {
        const currentTime = this.audioContext.currentTime

        sources.forEach((source, index) => {
          const gainNode = gains[index]

          try {
            if (fadeOutDuration > 0 && gainNode) {
              // Fade out the gain before stopping
              const currentGain = gainNode.gain.value
              gainNode.gain.setValueAtTime(currentGain, currentTime)
              gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration / 1000)

              // Stop after fade completes
              setTimeout(() => {
                try {
                  source.stop()
                } catch (error) {
                  // Source may have already stopped
                }
              }, fadeOutDuration)
            } else {
              source.stop()
            }
          } catch (error) {
            // Source may have already stopped
          }
        })

        // Clean up after fade completes
        if (fadeOutDuration > 0) {
          setTimeout(() => {
            this.activeSourceNodes.delete(key)
            this.activeGainNodes.delete(key)
          }, fadeOutDuration)
        } else {
          this.activeSourceNodes.delete(key)
          this.activeGainNodes.delete(key)
        }
      }
    } else {
      const audio = this.audioElements.get(key)
      if (audio) {
        if (fadeOutDuration > 0) {
          // Fade out HTML audio
          const startVolume = audio.volume
          const fadeSteps = 20
          const stepDuration = fadeOutDuration / fadeSteps
          let currentStep = 0

          const fadeInterval = setInterval(() => {
            currentStep++
            audio.volume = startVolume * (1 - currentStep / fadeSteps)

            if (currentStep >= fadeSteps) {
              clearInterval(fadeInterval)
              audio.pause()
              audio.currentTime = 0
              audio.volume = startVolume // Reset volume
            }
          }, stepDuration)
        } else {
          audio.pause()
          audio.currentTime = 0
        }
      }
    }

    this.emitEvent('stop', { key, fadeOut: fadeOutDuration })
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    if (this.usingWebAudioAPI) {
      this.activeSourceNodes.forEach((sources, key) => {
        sources.forEach(source => {
          try {
            source.stop()
          } catch (error) {
            // Source may have already stopped
          }
        })
      })
      this.activeSourceNodes.clear()
      this.activeGainNodes.clear()
    } else {
      this.audioElements.forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
    }

    this.emitEvent('stop', { all: true })
  }

  /**
   * Set master volume
   * @param volume - Volume level (0-1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))

    if (this.usingWebAudioAPI && this.masterGainNode && !this.isMuted) {
      this.masterGainNode.gain.value = this.masterVolume
    } else if (!this.usingWebAudioAPI) {
      this.audioElements.forEach(audio => {
        audio.volume = this.masterVolume * (this.isMuted ? 0 : 1)
      })
    }

    this.savePreferences()
    this.emitEvent('volumeChanged', { volume: this.masterVolume })
    this.emitEvent('statusChanged')
  }

  /**
   * Mute or unmute all sounds
   */
  mute(shouldMute: boolean): void {
    this.isMuted = shouldMute

    if (this.usingWebAudioAPI && this.masterGainNode) {
      this.masterGainNode.gain.value = shouldMute ? 0 : this.masterVolume
    } else if (!this.usingWebAudioAPI) {
      this.audioElements.forEach(audio => {
        audio.volume = shouldMute ? 0 : this.masterVolume
      })
    }

    this.savePreferences()
    this.emitEvent(shouldMute ? 'muted' : 'unmuted')
    this.emitEvent('statusChanged')
  }

  /**
   * Enable audio (required after user interaction on mobile)
   */
  enable(): void {
    this.isEnabled = true
    this.userInteracted = true

    // Resume audio context if suspended
    if (this.usingWebAudioAPI && this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(error => {
        console.error('[AudioService] Failed to resume audio context:', error)
      })
    }

    this.savePreferences()
    this.emitEvent('enabled')
    this.emitEvent('statusChanged')
  }

  /**
   * Resume AudioContext (required for mobile autoplay compliance)
   */
  async resumeContext(): Promise<void> {
    if (!this.usingWebAudioAPI || !this.audioContext) {
      console.warn('[AudioService] Cannot resume - Web Audio API not in use')
      return
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        this.userInteracted = true
        console.info('[AudioService] AudioContext resumed successfully')
        this.emitEvent('statusChanged')
      } catch (error) {
        console.error('[AudioService] Failed to resume AudioContext:', error)
        throw error
      }
    }
  }

  /**
   * Disable audio
   */
  disable(): void {
    this.isEnabled = false
    this.stopAll()
    this.savePreferences()
    this.emitEvent('disabled')
    this.emitEvent('statusChanged')
  }

  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Get current service status
   */
  getStatus(): AudioServiceStatus {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.isEnabled,
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      loadedAssets: Array.from(this.loadedAssets),
      failedAssets: Array.from(this.failedAssets),
      activeAudioAPI: this.usingWebAudioAPI ? 'WebAudio' : (this.isInitialized ? 'HTMLAudio' : 'None'),
      canAutoplay: this.autoplayAllowed,
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: AudioEventType, listener: AudioEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: AudioEventType, listener: AudioEventListener): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: AudioEventType, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event, data)
        } catch (error) {
          console.error('[AudioService] Event listener error:', error)
        }
      })
    }
  }

  /**
   * Load user preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const enabled = localStorage.getItem(STORAGE_KEYS.ENABLED)
      const volume = localStorage.getItem(STORAGE_KEYS.VOLUME)
      const muted = localStorage.getItem(STORAGE_KEYS.MUTED)

      this.isEnabled = enabled !== 'false' // Default to true
      this.masterVolume = volume ? parseFloat(volume) : DEFAULT_CONFIG.MASTER_VOLUME
      this.isMuted = muted === 'true'
    } catch (error) {
      console.warn('[AudioService] Failed to load preferences:', error)
    }
  }

  /**
   * Save user preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ENABLED, String(this.isEnabled))
      localStorage.setItem(STORAGE_KEYS.VOLUME, String(this.masterVolume))
      localStorage.setItem(STORAGE_KEYS.MUTED, String(this.isMuted))
    } catch (error) {
      console.warn('[AudioService] Failed to save preferences:', error)
    }
  }

  /**
   * Create typed error object
   */
  private createError(type: AudioErrorType, message: string, originalError?: Error, key?: string): AudioError {
    return {
      type,
      message,
      key,
      originalError,
    }
  }

  /**
   * Play a sequence of sounds with duration-aware timing
   * Each sound waits for the previous sound's duration before playing
   * @param keys - Array of sound keys to play in sequence
   * @param options - Optional playback options for each sound
   * @returns Promise that resolves when entire sequence completes
   */
  async playSequence(
    keys: string[],
    options?: AudioPlayOptions | AudioPlayOptions[]
  ): Promise<void> {
    let currentTime = this.audioContext?.currentTime || 0

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const soundOptions = Array.isArray(options) ? options[i] : options || {}

      // Schedule this sound
      const result = await this.play(key, {
        ...soundOptions,
        scheduleTime: currentTime
      })

      // Move time forward by duration for next sound
      currentTime += result.duration
    }
  }

  /**
   * Play a random sound from an array
   * Useful for randomizing reveal ticks/drums
   * @param keys - Array of sound keys to choose from
   * @param options - Playback options
   * @returns AudioPlayResult
   */
  async playRandom(keys: string[], options: AudioPlayOptions = {}): Promise<AudioPlayResult> {
    const randomKey = keys[Math.floor(Math.random() * keys.length)]
    return this.play(randomKey, options)
  }

  /**
   * Cleanup and dispose of resources
   */
  dispose(): void {
    this.stopAll()

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.audioBuffers.clear()
    this.audioElements.clear()
    this.activeSourceNodes.clear()
    this.activeGainNodes.clear()
    this.loadedAssets.clear()
    this.failedAssets.clear()
    this.eventListeners.clear()

    this.isInitialized = false
  }
}

// Export singleton instance
export const audioService = new AudioService()
export default audioService
